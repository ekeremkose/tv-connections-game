'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Puzzle } from '@/lib/types'
import { DIFFICULTY_CONFIG } from '@/lib/types'

export default function EditPuzzlePage() {
  const { date } = useParams<{ date: string }>()
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [isRegenerating, setRegenerating] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch(`/api/admin/puzzle?date=${date}`)
      .then((r) => r.json())
      .then((data) => { setPuzzle(data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [date])

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3000)
  }

  // Update a tile's text (tiles live at top level)
  function updateTileText(tileId: string, text: string) {
    setPuzzle((p) => p ? { ...p, tiles: p.tiles.map((t) => t.id === tileId ? { ...t, text } : t) } : p)
  }

  // Update a group field
  function updateGroup(groupId: string, field: string, value: unknown) {
    setPuzzle((p) =>
      p ? { ...p, groups: p.groups.map((g) => g.id === groupId ? { ...g, [field]: value } : g) } : p
    )
  }

  async function handleSave() {
    if (!puzzle) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/puzzle?date=${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(puzzle),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash(true, 'Saved!')
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    if (!confirm(`Regenerate puzzle for ${date}? This will overwrite the current version.`)) return
    setRegenerating(true)
    try {
      const res = await fetch(`/api/admin/generate?date=${date}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPuzzle(data)
      flash(true, 'Regenerated!')
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'Regeneration failed')
    } finally {
      setRegenerating(false)
    }
  }

  if (isLoading) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 animate-pulse">Loading…</p></main>
  }
  if (!puzzle) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No puzzle for {date}</p>
          <Link href="/admin" className="text-sm underline text-gray-600">← Back</Link>
        </div>
      </main>
    )
  }

  const tileMap = Object.fromEntries(puzzle.tiles.map((t) => [t.id, t]))

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 mb-1 block">← Admin</Link>
            <h1 className="text-xl font-bold text-gray-900">{date}</h1>
          </div>
          <div className="flex items-center gap-2 mt-5">
            {msg && <span className={`text-xs font-medium ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>}
            <button onClick={handleRegenerate} disabled={isRegenerating}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40">
              {isRegenerating ? 'Regenerating…' : '↺ Regenerate'}
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40">
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Groups */}
        <div className="flex flex-col gap-5">
          {puzzle.groups.map((g) => {
            const config = DIFFICULTY_CONFIG[g.difficulty]
            const groupTiles = g.tiles.map((id) => tileMap[id]).filter(Boolean)
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Colour bar */}
                <div className="px-5 py-3 flex items-center gap-3" style={{ backgroundColor: config.bg }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: config.text }}>Difficulty</span>
                  <select value={g.difficulty}
                    onChange={(e) => updateGroup(g.id, 'difficulty', Number(e.target.value))}
                    className="text-sm font-semibold border-0 rounded px-2 py-0.5 bg-white/70">
                    {[1, 2, 3, 4].map((d) => (
                      <option key={d} value={d}>{d} — {['Easy', 'Medium', 'Hard', 'Expert'][d - 1]}</option>
                    ))}
                  </select>
                  <span className="text-xs ml-auto opacity-60" style={{ color: config.text }}>{g.id}</span>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3">

                  {/* Group name */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Group Name</label>
                    <input value={g.name} onChange={(e) => updateGroup(g.id, 'name', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
                  </div>

                  {/* Connection type */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Connection Type</label>
                    <input value={g.connection_type} onChange={(e) => updateGroup(g.id, 'connection_type', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Explanation</label>
                    <textarea value={g.explanation} onChange={(e) => updateGroup(g.id, 'explanation', e.target.value)}
                      rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none" />
                  </div>

                  {/* Tiles */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Tiles</label>
                    <div className="flex flex-col gap-2">
                      {groupTiles.map((tile) => (
                        <div key={tile.id} className="flex gap-2 items-center">
                          <span className="text-xs text-gray-300 w-12 flex-shrink-0">{tile.id}</span>
                          <input value={tile.text} onChange={(e) => updateTileText(tile.id, e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex justify-end gap-3 mt-6">
          {msg && <span className={`text-sm font-medium self-center ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>}
          <button onClick={handleRegenerate} disabled={isRegenerating}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-sm font-medium">
            {isRegenerating ? 'Regenerating…' : '↺ Regenerate with AI'}
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 text-sm font-medium">
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

      </div>
    </main>
  )
}
