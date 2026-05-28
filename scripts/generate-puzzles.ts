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

// ── Fact checking ────────────────────────────────────────────────────────────

interface FactIssue {
  group_id: string
  wrong_tile_id: string
  wrong_tile_text: string
  correct_tile_text: string
  reason: string
}

interface FactCheckResult {
  ok: boolean
  issues: FactIssue[]
}

async function factCheck(puzzle: Puzzle, client: Anthropic): Promise<FactCheckResult> {
  const puzzleDescription = puzzle.groups.map((g) => {
    const tileTexts = g.tiles
      .map((tileId) => {
        const tile = puzzle.tiles.find((t) => t.id === tileId)
        return `  - ${tileId}: "${tile?.text}"`
      })
      .join('\n')
    return `Group "${g.name}":\n${tileTexts}\n  Explanation: ${g.explanation}`
  }).join('\n\n')

  const prompt = `You are a TV trivia fact-checker. Review this Connections puzzle and verify every factual claim.

PUZZLE:
${puzzleDescription}

For each group, verify that every tile truly belongs there:
- If a group is "cast of Show X" — did each person actually appear in that show?
- If a group is "characters from Show Y" — are they actually from that show?
- Are all actor/character/show associations accurate?

Only flag errors you are HIGHLY CONFIDENT about. When in doubt, do not flag.

Return ONLY raw JSON (no markdown, no code blocks):
{"ok":true,"issues":[]}

If any tile is factually wrong, return:
{"ok":false,"issues":[{"group_id":"group_1","wrong_tile_id":"tile_9","wrong_tile_text":"Wrong Name","correct_tile_text":"Correct Name","reason":"Short explanation"}]}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response from fact-checker')

  const raw = content.text.trim()
  try {
    return JSON.parse(raw) as FactCheckResult
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as FactCheckResult
    console.warn('  ⚠️  Could not parse fact-check response — skipping')
    return { ok: true, issues: [] }
  }
}

// ── Targeted fix ─────────────────────────────────────────────────────────────

async function fixPuzzle(puzzle: Puzzle, problem: string, client: Anthropic): Promise<Puzzle | null> {
  const prompt = `You are fixing a specific problem in an existing TV Connections puzzle. Make the MINIMAL change needed to fix the problem. Keep everything else identical.

CURRENT PUZZLE:
${JSON.stringify(puzzle, null, 2)}

PROBLEM TO FIX:
${problem}

Instructions:
- Change ONLY what is necessary to fix the problem
- Do not redesign the whole puzzle
- Do not change tiles or groups that are not involved in the problem
- Return the complete corrected puzzle as valid JSON

Return ONLY valid JSON, no markdown, no explanation.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return null

  const blocks = [...content.text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1].trim())
  if (blocks.length === 0) blocks.push(content.text.trim())

  for (const block of blocks.reverse()) {
    try { return JSON.parse(block) as Puzzle } catch { /* try next */ }
  }
  return null
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

      // ── Structural validation (with targeted fix on failure) ─────────────────
      try {
        validate(puzzle, date)
      } catch (validErr) {
        const validMsg = validErr instanceof Error ? validErr.message : String(validErr)
        console.warn(`  ⚠️  Validation failed: ${validMsg} — attempting targeted fix…`)
        const fixed = await fixPuzzle(puzzle, validMsg, client)
        if (!fixed) throw new Error(`Validation failed and could not be fixed: ${validMsg}`)
        try {
          validate(fixed, date)
          puzzle = fixed
          console.log(`  ✏️  Targeted fix applied`)
        } catch {
          throw new Error(`Validation failed even after targeted fix: ${validMsg}`)
        }
      }

      // ── Fact-check ───────────────────────────────────────────────────────────
      console.log(`🔍 Fact-checking…`)
      const factResult = await factCheck(puzzle, client)

      const validIssues = (factResult.issues ?? []).filter(
        (i) => i.wrong_tile_id && i.wrong_tile_text && i.correct_tile_text && i.reason
      )
      if (!factResult.ok && validIssues.length > 0) {
        console.warn(`  ⚠️  Found ${validIssues.length} factual issue(s):`)
        let allFixed = true

        for (const issue of validIssues) {
          console.warn(`     ✗ "${issue.wrong_tile_text}" → "${issue.correct_tile_text}"`)
          console.warn(`       Reason: ${issue.reason}`)

          const tile = puzzle.tiles.find((t) => t.id === issue.wrong_tile_id)
          if (tile) {
            tile.text = issue.correct_tile_text
            const group = puzzle.groups.find((g) => g.id === issue.group_id)
            if (group) {
              group.explanation = group.explanation.replace(issue.wrong_tile_text, issue.correct_tile_text)
            }
          } else {
            allFixed = false
          }
        }

        if (!allFixed) {
          // Can't auto-fix tile names → ask Claude to fix the whole group
          const problems = validIssues
            .filter((i) => !puzzle!.tiles.find((t) => t.id === i.wrong_tile_id))
            .map((i) => `"${i.wrong_tile_text}" in group "${puzzle!.groups.find(g => g.id === i.group_id)?.name}" is wrong: ${i.reason}`)
            .join('\n')
          console.warn(`  ↩️  Requesting targeted fix for unfixable fact errors…`)
          const fixed = await fixPuzzle(puzzle, `Fix these factual errors:\n${problems}`, client)
          if (!fixed) throw new Error(`Fact errors could not be fixed`)
          validate(fixed, date)
          puzzle = fixed
          console.log(`  ✏️  Fact errors fixed via targeted rewrite`)
        } else {
          console.log(`  ✏️  Auto-fixed ${validIssues.length} tile(s)`)
          validate(puzzle, date)
        }
      } else {
        console.log(`  ✅ Facts verified`)
      }
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
