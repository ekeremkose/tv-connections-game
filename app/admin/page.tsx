'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const START_DATE = '2026-05-23'

function localDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getTodayDate() {
  return localDateStr(new Date())
}

function getDateRange(): string[] {
  const dates: string[] = []
  const [sy, sm, sd] = START_DATE.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  // Show up to 14 days ahead
  const end = new Date()
  end.setDate(end.getDate() + 14)
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(localDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates.reverse() // newest first
}

interface DateStatus {
  date: string
  exists: boolean
  generating: boolean
  error: string | null
}

export default function AdminPage() {
  const today = getTodayDate()
  const allDates = getDateRange()
  const [statuses, setStatuses] = useState<Record<string, DateStatus>>(() =>
    Object.fromEntries(allDates.map((d) => [d, { date: d, exists: false, generating: false, error: null }]))
  )

  useEffect(() => {
    // Check which dates have puzzles
    Promise.all(
      allDates.map(async (date) => {
        const res = await fetch(`/api/admin/puzzle?date=${date}`)
        return { date, exists: res.ok }
      })
    ).then((results) => {
      setStatuses((prev) => {
        const next = { ...prev }
        for (const { date, exists } of results) {
          next[date] = { ...next[date], exists }
        }
        return next
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleGenerate(date: string) {
    setStatuses((prev) => ({
      ...prev,
      [date]: { ...prev[date], generating: true, error: null },
    }))
    try {
      const res = await fetch(`/api/admin/generate?date=${date}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatuses((prev) => ({
        ...prev,
        [date]: { ...prev[date], generating: false, exists: true, error: null },
      }))
    } catch (e) {
      setStatuses((prev) => ({
        ...prev,
        [date]: { ...prev[date], generating: false, error: e instanceof Error ? e.message : String(e) },
      }))
    }
  }

  async function handleDelete(date: string) {
    if (!confirm(`Delete puzzle for ${date}?`)) return
    await fetch(`/api/admin/puzzle?date=${date}`, { method: 'DELETE' })
    setStatuses((prev) => ({ ...prev, [date]: { ...prev[date], exists: false } }))
  }

  function formatLabel(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
    if (dateStr === today) return `${label} — Today`
    return label
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-0.5">TV Connections — Puzzle Manager</p>
          </div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 underline">
            ← Back to game
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {allDates.map((date) => {
            const s = statuses[date]
            const isFuture = date > today
            const isPast = date < today

            return (
              <div key={date} className="flex items-center gap-3 px-5 py-3.5">
                {/* Status dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    s.generating
                      ? 'bg-yellow-400 animate-pulse'
                      : s.exists
                      ? 'bg-green-500'
                      : 'bg-red-400'
                  }`}
                />

                {/* Date label */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${isFuture ? 'text-gray-400' : 'text-gray-800'}`}>
                    {formatLabel(date)}
                  </span>
                  {s.error && (
                    <p className="text-xs text-red-500 mt-0.5 truncate">{s.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.exists && (
                    <Link
                      href={`/admin/${date}`}
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                    >
                      Edit
                    </Link>
                  )}
                  {!s.exists && !s.generating && (
                    <button
                      onClick={() => handleGenerate(date)}
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 font-medium transition-colors"
                    >
                      Generate
                    </button>
                  )}
                  {s.generating && (
                    <span className="text-xs text-gray-400 animate-pulse">Generating…</span>
                  )}
                  {s.exists && (
                    <button
                      onClick={() => handleDelete(date)}
                      className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
