import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { generateOnePuzzle } from '@/lib/generate'

// NOTE: Local dev only — writes to public/puzzles/ and pushes to GitHub.

export async function POST(request: Request) {
  const date = new URL(request.url).searchParams.get('date')
  if (!date) return Response.json({ error: 'date required' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const logs: string[] = []
  const log = (msg: string) => { console.log(msg); logs.push(msg) }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const puzzle = await generateOnePuzzle(date, client, { onLog: log })

    const outDir = join(process.cwd(), 'public', 'puzzles')
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, `${date}.json`), JSON.stringify(puzzle, null, 2))
    log(`💾 Saved public/puzzles/${date}.json`)

    // Push to GitHub so Vercel picks it up
    try {
      execSync('git add public/puzzles/', { cwd: process.cwd() })
      execSync(`git commit -m "puzzle ${date}"`, { cwd: process.cwd() })
      execSync('git push origin main', { cwd: process.cwd() })
      log(`🚀 Pushed to GitHub — Vercel will deploy shortly`)
    } catch (gitErr) {
      const gitMsg = gitErr instanceof Error ? gitErr.message : String(gitErr)
      log(`⚠️  Git push failed: ${gitMsg}`)
    }

    return Response.json({ puzzle, logs })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e), logs },
      { status: 500 }
    )
  }
}
