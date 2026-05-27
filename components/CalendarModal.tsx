'use client'

import { useEffect, useState } from 'react'
import { getGameStateFromStorage } from '@/lib/storage'

const START_DATE = '2026-05-23'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface CalendarModalProps {
  todayDate: string
  activeDate: string
  onPlay: (date: string) => void
  onClose: () => void
}

interface DayState {
  isWon: boolean
  isLost: boolean
  inProgress: boolean
}

function localDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function getMonthGrid(year: number, month: number): (number | null)[] {
  // month is 1-indexed
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const offset = (firstDow + 6) % 7 // shift to Mon-first
  const grid: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

export default function CalendarModal({ todayDate, activeDate, onPlay, onClose }: CalendarModalProps) {
  const [ty, tm, td] = todayDate.split('-').map(Number)
  const [sy, sm, sd] = START_DATE.split('-').map(Number)

  const [year, setYear] = useState(ty)
  const [month, setMonth] = useState(tm)
  const [dayStates, setDayStates] = useState<Record<string, DayState>>({})

  const todayMs = new Date(ty, tm - 1, td).getTime()
  const startMs = new Date(sy, sm - 1, sd).getTime()

  // Load game states for every visible day
  useEffect(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const states: Record<string, DayState> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = localDateStr(year, month, d)
      const s = getGameStateFromStorage(dateStr)
      if (s) {
        states[dateStr] = {
          isWon: s.isWon,
          isLost: s.isComplete && !s.isWon,
          inProgress: !s.isComplete,
        }
      }
    }
    setDayStates(states)
  }, [year, month])

  // ── Navigation ─────────────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (year === ty && month === tm) return
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  function prevYear() {
    // Don't go before the start year
    if (year <= sy) return
    setYear((y) => y - 1)
    // If new year-month would be before start, clamp month
    if (year - 1 === sy && month < sm) setMonth(sm)
  }

  function nextYear() {
    if (year >= ty) return
    setYear((y) => y + 1)
    // If new year-month would be after today, clamp month
    if (year + 1 === ty && month > tm) setMonth(tm)
  }

  const canGoPrevMonth = !(year === sy && month === sm)
  const canGoNextMonth = !(year === ty && month === tm)
  const canGoPrevYear = year > sy
  const canGoNextYear = year < ty

  const grid = getMonthGrid(year, month)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-pop-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Puzzles</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none transition-colors">✕</button>
        </div>

        {/* Month + Year navigation */}
        <div className="px-5 py-3">
          {/* Year row */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={prevYear}
              disabled={!canGoPrevYear}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-20 transition-colors text-xs font-bold"
            >
              ««
            </button>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{year}</span>
            <button
              onClick={nextYear}
              disabled={!canGoNextYear}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-20 transition-colors text-xs font-bold"
            >
              »»
            </button>
          </div>

          {/* Month row */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              disabled={!canGoPrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-20 transition-colors font-bold text-lg"
            >
              ‹
            </button>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-base">{MONTHS[month - 1]}</span>
            <button
              onClick={nextMonth}
              disabled={!canGoNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-20 transition-colors font-bold text-lg"
            >
              ›
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 px-4 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 font-medium py-1">
              {d[0]}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 px-4 pb-4 gap-y-1">
          {grid.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />

            const dateStr = localDateStr(year, month, day)
            const dayMs = new Date(year, month - 1, day).getTime()
            const isToday = dateStr === activeDate
            const isPlayable = dayMs >= startMs && dayMs <= todayMs
            const s = dayStates[dateStr]

            const dotColor = s?.isWon
              ? 'bg-green-500'
              : s?.isLost
              ? 'bg-red-400'
              : s?.inProgress
              ? 'bg-blue-400'
              : null

            return (
              <button
                key={dateStr}
                onClick={() => isPlayable && onPlay(dateStr)}
                disabled={!isPlayable}
                title={isPlayable ? dateStr : undefined}
                className={[
                  'flex flex-col items-center justify-center rounded-xl py-1.5 gap-0.5 transition-colors',
                  isToday
                    ? 'bg-gray-900 text-white font-bold dark:bg-gray-100 dark:text-gray-900'
                    : isPlayable
                    ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-pointer'
                    : 'text-gray-300 dark:text-gray-600 cursor-default',
                ].join(' ')}
              >
                <span className="text-sm leading-none">{day}</span>
                <span
                  className={[
                    'w-1.5 h-1.5 rounded-full',
                    dotColor
                      ? dotColor
                      : isToday
                      ? 'bg-transparent'
                      : 'bg-transparent',
                  ].join(' ')}
                />
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          {[
            { color: 'bg-green-500', label: 'Won' },
            { color: 'bg-red-400', label: 'Lost' },
            { color: 'bg-blue-400', label: 'In progress' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
