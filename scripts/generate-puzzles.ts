import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

config({ path: join(process.cwd(), '.env.local'), override: true })

import { generateOnePuzzle } from '../lib/generate'

const OUT_DIR = join(process.cwd(), 'public', 'puzzles')

async function generatePuzzle(date: string, force = false): Promise<void> {
  const outPath = join(OUT_DIR, `${date}.json`)

  if (existsSync(outPath) && !force) {
    console.log(`⏭  ${date} — already exists (use --force to overwrite)`)
    return
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const puzzle = await generateOnePuzzle(date, client)

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(outPath, JSON.stringify(puzzle, null, 2))
  console.log(`✅ ${date} — saved to public/puzzles/${date}.json`)
}

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
