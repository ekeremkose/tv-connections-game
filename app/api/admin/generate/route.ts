import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { generateOnePuzzle } from '@/lib/generate'

// NOTE: Local dev only — writes to public/puzzles/ on the local filesystem.

export async function POST(request: Request) {
  const date = new URL(request.url).searchParams.get('date')
  if (!date) return Response.json({ error: 'date required' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const logs: string[] = []

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const puzzle = await generateOnePuzzle(date, client, {
      onLog: (msg) => {
        console.log(msg)
        logs.push(msg)
      },
    })

    const outDir = join(process.cwd(), 'public', 'puzzles')
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, `${date}.json`), JSON.stringify(puzzle, null, 2))

    return Response.json({ puzzle, logs })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e), logs },
      { status: 500 }
    )
  }
}
