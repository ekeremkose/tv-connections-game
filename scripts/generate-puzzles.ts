import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

config({ path: join(process.cwd(), '.env.local'), override: true })

import { SYSTEM_PROMPT, buildPuzzlePrompt } from '../lib/prompt'
import type { Puzzle } from '../lib/types'

const OUT_DIR = join(process.cwd(), 'public', 'puzzles')

// ── Recent context ────────────────────────────────────────────────────────────

function getRecentContext(excludeDate: string, lookback = 14): string {
  let files: string[] = []
  try {
    files = readdirSync(OUT_DIR)
      .filter((f) => f.endsWith('.json') && f !== `${excludeDate}.json`)
      .sort()
      .slice(-lookback)
  } catch {
    return ''
  }
  if (files.length === 0) return ''

  const tiles: string[] = []
  const themes: string[] = []
  const connectionTypes: string[] = []

  for (const file of files) {
    try {
      const raw = readFileSync(join(OUT_DIR, file), 'utf-8')
      const p: Puzzle = JSON.parse(raw)
      for (const t of p.tiles) tiles.push(t.text)
      for (const g of p.groups) {
        themes.push(g.name)
        connectionTypes.push(g.connection_type)
      }
    } catch {
      // skip malformed files
    }
  }

  if (tiles.length === 0) return ''

  return `RECENTLY USED CONTENT (last ${files.length} puzzles) — do NOT repeat ANY of these tiles, shows, people, or themes:
Tiles already used: ${tiles.join(' | ')}
Group themes already used: ${themes.join(' | ')}
Connection types already used: ${connectionTypes.join(', ')} — use different ones today.
Be completely fresh. Invent new angles, pick different shows, different eras, different genres.`
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(puzzle: Puzzle, date: string): void {
  if (puzzle.date !== date) throw new Error(`date mismatch: got ${puzzle.date}, expected ${date}`)
  if (!Array.isArray(puzzle.tiles) || puzzle.tiles.length !== 16)
    throw new Error(`Expected 16 tiles, got ${puzzle.tiles?.length}`)
  if (!Array.isArray(puzzle.groups) || puzzle.groups.length !== 4)
    throw new Error(`Expected 4 groups, got ${puzzle.groups?.length}`)

  const allTileIds = new Set(puzzle.tiles.map((t) => t.id))
  if (allTileIds.size !== 16) throw new Error('Duplicate tile IDs in tiles array')

  const usedTileIds = new Set<string>()
  for (const g of puzzle.groups) {
    if (!g.id) throw new Error(`Group missing id`)
    if (!g.name) throw new Error(`Group "${g.id}" missing name`)
    if (!g.connection_type) throw new Error(`Group "${g.id}" missing connection_type`)
    if (![1, 2, 3, 4].includes(g.difficulty)) throw new Error(`Group "${g.id}" has invalid difficulty: ${g.difficulty}`)
    if (!g.explanation) throw new Error(`Group "${g.id}" missing explanation`)
    const nameLower = g.name.toLowerCase()
    if (/\btrap\b/.test(nameLower) || /but one/i.test(nameLower) || /misdirect/i.test(nameLower))
      throw new Error(`Group "${g.id}" has a spoiler name ("${g.name}") — trap must be in the tiles, not the name`)
    if (!Array.isArray(g.tiles) || g.tiles.length !== 4)
      throw new Error(`Group "${g.id}" must have exactly 4 tiles, got ${g.tiles?.length}`)

    for (const tileId of g.tiles) {
      if (!allTileIds.has(tileId)) throw new Error(`Group "${g.id}" references unknown tile ID: ${tileId}`)
      if (usedTileIds.has(tileId)) throw new Error(`Tile "${tileId}" appears in more than one group`)
      usedTileIds.add(tileId)
    }
  }

  if (usedTileIds.size !== 16) throw new Error(`Only ${usedTileIds.size}/16 tiles assigned to groups`)

  const difficulties = puzzle.groups.map((g) => g.difficulty).sort()
  if (JSON.stringify(difficulties) !== JSON.stringify([1, 2, 3, 4]))
    throw new Error(`Groups must have difficulties 1,2,3,4 — got ${difficulties}`)

  const connectionTypes = puzzle.groups.map((g) => g.connection_type)
  const uniqueConnectionTypes = new Set(connectionTypes)
  if (uniqueConnectionTypes.size !== 4)
    throw new Error(`Duplicate connection_type within puzzle: ${connectionTypes.join(', ')}`)

  // same_show (and any same_show_* variant) may appear at most once
  const sameShowCount = puzzle.groups.filter((g) => g.connection_type.startsWith('same_show')).length
  if (sameShowCount > 1)
    throw new Error(`same_show used ${sameShowCount} times — maximum 1 per puzzle`)
}

// ── Review & fix ─────────────────────────────────────────────────────────────

async function reviewAndFix(puzzle: Puzzle, client: Anthropic): Promise<Puzzle> {
  const prompt = `You just created this TV Connections puzzle. Now step back and act as your own editor.

PUZZLE TO REVIEW:
${JSON.stringify(puzzle, null, 2)}

Go through every group and every tile carefully. Ask yourself:

**FACTS**
- Is every tile genuinely accurate for its group? (actor in that show? character from that show? network correct?)
- Would a knowledgeable TV fan immediately dispute any tile?

**TILE INDEPENDENCE**
- Are any two tiles on the board trivially linked? (same character under two names, an actor + the character they famously play, a show + its most iconic character in the same group)
- Example of what to catch: "Bob Odenkirk" and "Jimmy McGill" on the same board — a viewer instantly connects them, ruining the puzzle
- Example of what to catch: "Saul Goodman" and "Jimmy McGill" — same character, two names

**GROUP DESIGN**
- Does each group hold up under scrutiny? Would a smart TV fan agree all 4 tiles truly fit?
- Is the easiest group (difficulty 1) genuinely easy for a casual fan?
- Is the hardest group (difficulty 4) genuinely hard even for enthusiasts?
- Is the trap group actually deceptive? Do the tiles look like one thing but connect differently?

**FIX ANYTHING YOU FIND**
Make whatever changes are needed — fix wrong tiles, replace redundant pairs, adjust group concepts. You can change tile text, group names, explanations. Keep the overall structure (16 tiles, 4 groups of 4, one per difficulty).

If everything looks good, return it unchanged.

Return ONLY the final corrected puzzle as valid JSON. No markdown, no explanation, no commentary.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    console.warn('  ⚠️  Review step returned unexpected type — keeping original')
    return puzzle
  }

  const blocks = [...content.text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1].trim())
  if (blocks.length === 0) blocks.push(content.text.trim())

  for (const block of blocks.reverse()) {
    try { return JSON.parse(block) as Puzzle } catch { /* try next */ }
  }

  console.warn('  ⚠️  Could not parse review response — keeping original')
  return puzzle
}

// ── Generation ────────────────────────────────────────────────────────────────

async function generatePuzzle(date: string, force = false, maxRetries = 5): Promise<void> {
  const outPath = join(OUT_DIR, `${date}.json`)

  if (existsSync(outPath) && !force) {
    console.log(`⏭  ${date} — already exists (use --force to overwrite)`)
    return
  }

  const recentContext = getRecentContext(date)
  if (recentContext) console.log(`📋 Loaded recent context to avoid repetition`)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const failureHistory: string[] = []

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🎲 Generating puzzle for ${date}… (attempt ${attempt}/${maxRetries})`)
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPuzzlePrompt(date, recentContext, failureHistory) }],
      })

      const content = message.content[0]
      if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

      // Extract all JSON code blocks, try last-first (Claude sometimes self-corrects)
      const blocks = [...content.text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1].trim())
      if (blocks.length === 0) blocks.push(content.text.trim())

      let puzzle: Puzzle | null = null
      for (const block of blocks.reverse()) {
        try { puzzle = JSON.parse(block); break } catch { /* try next */ }
      }
      if (!puzzle) {
        console.error('Claude response:\n', content.text)
        throw new Error('Failed to parse JSON from Claude response')
      }

      // ── Structural validation ─────────────────────────────────────────────────
      validate(puzzle, date)

      // ── Self-review & fix ─────────────────────────────────────────────────────
      console.log(`🧠 Reviewing puzzle…`)
      const reviewed = await reviewAndFix(puzzle, client)
      validate(reviewed, date)   // make sure review didn't break structure
      const changed = JSON.stringify(reviewed) !== JSON.stringify(puzzle)
      if (changed) console.log(`  ✏️  Review made corrections`)
      else console.log(`  ✅ No issues found`)
      puzzle = reviewed
      // ─────────────────────────────────────────────────────────────────────────

      mkdirSync(OUT_DIR, { recursive: true })
      writeFileSync(outPath, JSON.stringify(puzzle, null, 2))
      console.log(`✅ ${date} — saved to public/puzzles/${date}.json`)
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failureHistory.push(msg)
      if (attempt < maxRetries) {
        console.warn(`  ⚠️  Attempt ${attempt} failed: ${msg} — retrying…`)
      } else {
        throw new Error(msg)
      }
    }
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const filtered = args.filter((a) => a !== '--force')

  const fromIdx = filtered.indexOf('--from')
  const toIdx = filtered.indexOf('--to')
  const dateIdx = filtered.indexOf('--date')

  let dates: string[] = []

  if (fromIdx !== -1 && toIdx !== -1) {
    const from = new Date(filtered[fromIdx + 1] + 'T00:00:00')
    const to = new Date(filtered[toIdx + 1] + 'T00:00:00')
    const cur = new Date(from)
    while (cur <= to) {
      dates.push(localDateStr(cur))
      cur.setDate(cur.getDate() + 1)
    }
  } else if (dateIdx !== -1) {
    dates = [filtered[dateIdx + 1]]
  } else {
    // Bare date args OR default to today
    const bareDates = filtered.filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
    dates = bareDates.length > 0 ? bareDates : [localDateStr(new Date())]
  }

  console.log(`Generating ${dates.length} puzzle(s): ${dates.join(', ')}\n`)

  for (const date of dates) {
    try {
      await generatePuzzle(date, force)
    } catch (err) {
      console.error(`❌ ${date} — ${err instanceof Error ? err.message : err}`)
    }
  }
}

main()
