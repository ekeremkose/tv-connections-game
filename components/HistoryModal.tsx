'use client'

import { useEffect, useState } from 'react'
import { getGameStateFromStorage, getPuzzleFromStorage } from '@/lib/storage'
import { DIFFICULTY_CONFIG } from '@/lib/types'
import type { GameState, Puzzle, Group } from '@/lib/types'

const START_DATE = '2026-05-23'

interface DayEntry {
  date: string
  label: string
  state: GameState | null
  puzzle: Puzzle | null
}

interface HistoryModalProps {
  todayDate: string
  onPlay: (date: string) => void
  onClose: () => void
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getAvailableDates(todayDate: string): string[] {
  const dates: string[] = []
  const [sy, sm, sd] = START_DATE.split('-').map(Number)
  const [ty, tm, td] = todayDate.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const cur = new Date(ty, tm - 1, td)
  cur.setDate(cur.getDate() - 1)
  while (cur >= start) {
    dates.push(localDateStr(cur))
    cur.setDate(cur.getDate() - 1)
  }
  return dates
}

function formatLabel(dateStr: string, todayDate: string): string {
  const [ty, tm, td] = todayDate.split('-').map(Number)
  const [dy, dm, dd] = dateStr.split('-').map(Number)
  const diffDays = Math.round((new Date(ty, tm - 1, td).getTime() - new Date(dy, dm - 1, dd).getTime()) / 86400000)
  if (diffDays === 1) return 'Yesterday'
  return new Date(dy, dm - 1, dd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function buildEmojiGrid(state: GameState, puzzle: Puzzle): string {
  const tileToGroup = new Map<string, Group>()
  for (const g of puzzle.groups) {
    for (const tileId of g.tiles) tileToGroup.set(tileId, g)
  }
  return state.guessHistory
    .map((guess) =>
      guess.tileIds.map((id) => {
        const g = tileToGroup.get(id)
        return g ? DIFFICULTY_CONFIG[g.difficulty].emoji : '⬜'
      }).join('')
    ).join('\n')
}

export default function HistoryModal({ todayDate, onPlay, onClose }: HistoryModalProps) {
  const [entries, setEntries] = useState<DayEntry[]>([])

  useEffect(() => {
    setEntries(
      getAvailableDates(todayDate).map((date) => ({
        date,
        label: formatLabel(date, todayDate),
        state: getGameStateFromStorage(date),
        puzzle: getPuzzleFromStorage(date),
      }))
    )
  }, [todayDate])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col animate-pop-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Past Puzzles</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {entries.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">No past puzzles yet</p>
          ) : (
            entries.map((entry) => {
              const played = entry.state !== null
              const completed = entry.state?.isComplete ?? false
              const won = entry.state?.isWon ?? false
              const inProgress = played && !completed

              return (
                <div key={entry.date} className="px-5 py-4 flex items-start gap-4">
                  <div className="min-w-[90px] flex-shrink-0">
                    <div className="text-sm font-semibold text-gray-800">{entry.label}</div>
                    <div className="mt-1">
                      {!played && <span className="text-xs text-gray-400">Not played</span>}
                      {inProgress && <span className="text-xs text-blue-500 font-medium">In progress</span>}
                      {completed && won && <span className="text-xs text-green-600 font-medium">Won · {entry.state!.lives} ♥ left</span>}
                      {completed && !won && <span className="text-xs text-red-500 font-medium">Lost</span>}
                    </div>
                  </div>

                  <div className="flex-1 font-mono text-sm leading-snug whitespace-pre">
                    {played && entry.puzzle ? buildEmojiGrid(entry.state!, entry.puzzle) : null}
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={() => onPlay(entry.date)}
                      className={[
                        'text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
                        completed ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-700',
                      ].join(' ')}
                    >
                      {completed ? 'Review' : inProgress ? 'Continue' : 'Play'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
