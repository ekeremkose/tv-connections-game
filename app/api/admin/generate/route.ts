import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { SYSTEM_PROMPT, buildPuzzlePrompt } from '@/lib/prompt'
import type { Puzzle } from '@/lib/types'

// NOTE: Local dev only — writes to public/puzzles/ on the local filesystem.

export async function POST(request: Request) {
  const date = new URL(request.url).searchParams.get('date')
  if (!date) return Response.json({ error: 'date required' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPuzzlePrompt(date) }],
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
