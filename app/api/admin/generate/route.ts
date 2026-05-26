import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { SYSTEM_PROMPT, buildPuzzlePrompt } from '@/lib/prompt'
import type { Puzzle } from '@/lib/types'

// NOTE: Local dev only — writes to public/puzzles/ on the local filesystem.

function getRecentContext(excludeDate: string, lookback = 14): string {
  const outDir = join(process.cwd(), 'public', 'puzzles')
  if (!existsSync(outDir)) return ''
  let files: string[] = []
  try {
    files = readdirSync(outDir)
      .filter((f) => f.endsWith('.json') && f !== `${excludeDate}.json`)
      .sort()
      .slice(-lookback)
  } catch { return '' }
  if (files.length === 0) return ''
  const tiles: string[] = []
  const themes: string[] = []
  const connectionTypes: string[] = []
  for (const file of files) {
    try {
      const p: Puzzle = JSON.parse(readFileSync(join(outDir, file), 'utf-8'))
      for (const t of p.tiles) tiles.push(t.text)
      for (const g of p.groups) { themes.push(g.name); connectionTypes.push(g.connection_type) }
    } catch { /* skip */ }
  }
  if (tiles.length === 0) return ''
  return `RECENTLY USED CONTENT (last ${files.length} puzzles) — do NOT repeat ANY of these tiles, shows, people, or themes:\nTiles already used: ${tiles.join(' | ')}\nGroup themes already used: ${themes.join(' | ')}\nConnection types already used: ${connectionTypes.join(', ')} — use different ones today.\nBe completely fresh. Invent new angles, pick different shows, different eras, different genres.`
}

export async function POST(request: Request) {
  const date = new URL(request.url).searchParams.get('date')
  if (!date) return Response.json({ error: 'date required' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const recentContext = getRecentContext(date)

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPuzzlePrompt(date, recentContext) }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const cleaned = content.text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const puzzle: Puzzle = JSON.parse(cleaned)
    puzzle.date = date

    if (!puzzle.tiles || puzzle.tiles.length !== 16) throw new Error('Expected 16 tiles')
    if (!puzzle.groups || puzzle.groups.length !== 4) throw new Error('Expected 4 groups')
    for (const g of puzzle.groups) {
      if (!g.tiles || g.tiles.length !== 4)
        throw new Error(`Group "${g.name}" has ${g.tiles?.length ?? 0} tiles`)
    }

    const outDir = join(process.cwd(), 'public', 'puzzles')
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, `${date}.json`), JSON.stringify(puzzle, null, 2))

    return Response.json(puzzle)
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
