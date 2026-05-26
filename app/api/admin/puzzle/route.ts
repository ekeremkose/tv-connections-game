import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import type { Puzzle } from '@/lib/types'

// NOTE: This route writes to the local filesystem (public/puzzles/).
// It works in local dev only. On Vercel the filesystem is read-only.
// Migrate writes to a database (e.g. Supabase) when deploying the admin panel.

function puzzlePath(date: string) {
  return join(process.cwd(), 'public', 'puzzles', `${date}.json`)
}

function validate(puzzle: Puzzle, date: string): string | null {
  if (!puzzle.tiles || puzzle.tiles.length !== 16) return 'Expected 16 tiles'
  if (!puzzle.groups || puzzle.groups.length !== 4) return 'Expected 4 groups'
  const tileIds = new Set(puzzle.tiles.map((t) => t.id))
  for (const g of puzzle.groups) {
    if (!g.tiles || g.tiles.length !== 4) return `Group "${g.name}" must have 4 tiles`
    for (const id of g.tiles) {
      if (!tileIds.has(id)) return `Unknown tile ID "${id}" in group "${g.name}"`
    }
  }
  return null
}

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date')
  if (!date) return Response.json({ error: 'date required' }, { status: 400 })
  try {
    return Response.json(JSON.parse(readFileSync(puzzlePath(date), 'utf-8')))
  } catch {
    return Response.json({ error: 'Puzzle not found' }, { status: 404 })
  }
}

export async function PUT(request: Request) {
  const date = new URL(request.url).searchParams.get('date')
  if (!date) return Response.json({ error: 'date required' }, { status: 400 })
  try {
    const puzzle: Puzzle = await request.json()
    const err = validate(puzzle, date)
    if (err) return Response.json({ error: err }, { status: 400 })
    puzzle.date = date
    writeFileSync(puzzlePath(date), JSON.stringify(puzzle, null, 2))
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const date = new URL(request.url).searchParams.get('date')
  if (!date) return Response.json({ error: 'date required' }, { status: 400 })
  try {
    const path = puzzlePath(date)
    if (existsSync(path)) unlinkSync(path)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
