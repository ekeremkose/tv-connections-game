'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Puzzle, Group, Tile, GuessRecord } from '@/lib/types'
import { DIFFICULTY_CONFIG } from '@/lib/types'
import {
  getPuzzleFromStorage,
  savePuzzleToStorage,
  getGameStateFromStorage,
  saveGameStateToStorage,
} from '@/lib/storage'
import TileComponent from '@/components/Tile'
import SolvedRow from '@/components/SolvedRow'
import LivesDots from '@/components/LivesDots'
import EndScreen from '@/components/EndScreen'
import Toast from '@/components/Toast'
import CalendarModal from '@/components/CalendarModal'

const MAX_LIVES = 4
const MAX_SELECTION = 4

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTodayDate(): string {
  return localDateStr(new Date())
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Home() {
  const todayDate = getTodayDate()

  const [activeDate, setActiveDate] = useState(todayDate)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notAvailable, setNotAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shuffledTiles, setShuffledTiles] = useState<Tile[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [solvedGroupIds, setSolvedGroupIds] = useState<string[]>([])
  const [lives, setLives] = useState(MAX_LIVES)
  const [guessHistory, setGuessHistory] = useState<GuessRecord[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [isWon, setIsWon] = useState(false)
  const [shakingIds, setShakingIds] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [showEndScreen, setShowEndScreen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const activeDateRef = useRef(activeDate)
  activeDateRef.current = activeDate

  // Load puzzle whenever activeDate changes
  useEffect(() => {
    let cancelled = false

    async function load() {
      setPuzzle(null)
      setIsLoading(true)
      setNotAvailable(false)
      setError(null)
      setSelectedIds([])
      setSolvedGroupIds([])
      setLives(MAX_LIVES)
      setGuessHistory([])
      setIsComplete(false)
      setIsWon(false)
      setShowEndScreen(false)

      // Check localStorage cache first
      const cached = getPuzzleFromStorage(activeDate)
      if (cached) {
        if (cancelled) return
        setPuzzle(cached)
        restoreState(cached, activeDate)
        setIsLoading(false)
        return
      }

      // Fetch static JSON from /public/puzzles/
      try {
        const res = await fetch(`/puzzles/${activeDate}.json`)
        if (res.status === 404) {
          if (!cancelled) setNotAvailable(true)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: Puzzle = await res.json()
        if (cancelled) return
        savePuzzleToStorage(data)
        setPuzzle(data)
        restoreState(data, activeDate)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load puzzle')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [activeDate])

  function restoreState(p: Puzzle, d: string) {
    const saved = getGameStateFromStorage(d)
    if (saved) {
      const solvedIds = saved.solvedGroupIds
      setSolvedGroupIds(solvedIds)
      setLives(saved.lives)
      setGuessHistory(saved.guessHistory)
      setIsComplete(saved.isComplete)
      setIsWon(saved.isWon)
      if (saved.isComplete) setShowEndScreen(true)

      const solvedTileIds = new Set(
        p.groups.filter((g) => solvedIds.includes(g.id)).flatMap((g) => g.tiles)
      )
      setShuffledTiles(shuffle(p.tiles.filter((t) => !solvedTileIds.has(t.id))))
    } else {
      setShuffledTiles(shuffle(p.tiles))
    }
  }

  const persistState = useCallback(
    (
      solvedIds: string[], livesLeft: number, history: GuessRecord[],
      complete: boolean, won: boolean
    ) => {
      saveGameStateToStorage({
        date: activeDateRef.current,
        solvedGroupIds: solvedIds,
        lives: livesLeft,
        guessHistory: history,
        isComplete: complete,
        isWon: won,
      })
    }, []
  )

  function toggleTile(id: string) {
    if (isComplete) return
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id)
      if (prev.length >= MAX_SELECTION) return prev
      return [...prev, id]
    })
  }

  function showToastMsg(msg: string) {
    setToast(null)
    setTimeout(() => setToast(msg), 10)
  }

  function handleSubmit() {
    if (selectedIds.length !== MAX_SELECTION || !puzzle) return

    // Map tile → group
    const tileToGroup = new Map<string, Group>()
    for (const g of puzzle.groups) {
      for (const id of g.tiles) tileToGroup.set(id, g)
    }

    const groups = selectedIds.map((id) => tileToGroup.get(id))
    const uniqueGroupIds = new Set(groups.map((g) => g?.id))

    // Correct guess
    if (uniqueGroupIds.size === 1 && groups[0]) {
      const solved = groups[0]
      const newSolvedIds = [...solvedGroupIds, solved.id]
      const newTiles = shuffledTiles.filter((t) => !selectedIds.includes(t.id))
      const newHistory: GuessRecord[] = [
        ...guessHistory,
        { tileIds: selectedIds, correct: true, groupId: solved.id, difficulty: solved.difficulty },
      ]
      const won = newSolvedIds.length === 4

      setSolvedGroupIds(newSolvedIds)
      setShuffledTiles(newTiles)
      setSelectedIds([])
      setGuessHistory(newHistory)

      if (won) {
        setIsWon(true)
        setIsComplete(true)
        setTimeout(() => setShowEndScreen(true), 600)
      }

      persistState(newSolvedIds, lives, newHistory, won, won)
      return
    }

    // One away?
    const groupCounts = new Map<string | undefined, number>()
    for (const g of groups) {
      const key = g?.id
      groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1)
    }
    if (Math.max(...Array.from(groupCounts.values())) === 3) {
      showToastMsg('One away!')
      setShakingIds(selectedIds)
      setTimeout(() => setShakingIds([]), 600)
      const newHistory: GuessRecord[] = [...guessHistory, { tileIds: selectedIds, correct: false }]
      setGuessHistory(newHistory)
      persistState(solvedGroupIds, lives, newHistory, false, false)
      return
    }

    // Wrong guess
    const newLives = lives - 1
    const newHistory: GuessRecord[] = [...guessHistory, { tileIds: selectedIds, correct: false }]
    setShakingIds(selectedIds)
    setTimeout(() => setShakingIds([]), 600)
    setLives(newLives)
    setGuessHistory(newHistory)

    if (newLives === 0) {
      setIsComplete(true)
      persistState(solvedGroupIds, 0, newHistory, true, false)
      setTimeout(() => setShowEndScreen(true), 700)
    } else {
      persistState(solvedGroupIds, newLives, newHistory, false, false)
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const tileMap = puzzle
    ? Object.fromEntries(puzzle.tiles.map((t) => [t.id, t]))
    : {}

  const solvedGroups = puzzle
    ? puzzle.groups.filter((g) => solvedGroupIds.includes(g.id))
    : []

  const solvedTileIdSet = new Set(solvedGroups.flatMap((g) => g.tiles))
  const unsolvedTiles = shuffledTiles.filter((t) => !solvedTileIdSet.has(t.id))
  const isToday = activeDate === todayDate

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-2xl font-bold text-gray-900 mb-3">TV Connections</div>
        <div className="text-gray-400 text-sm animate-pulse">Loading puzzle…</div>
      </main>
    )
  }

  if (notAvailable) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <div className="text-2xl font-bold text-gray-900 mb-3">TV Connections</div>
          <p className="text-gray-500 text-sm mb-5">
            {isToday
              ? "Today's puzzle is not available yet. Please check back later."
              : `No puzzle available for ${formatDateLabel(activeDate)}.`}
          </p>
          {!isToday && (
            <button
              onClick={() => setActiveDate(todayDate)}
              className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Back to Today
            </button>
          )}
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <div className="text-2xl font-bold text-gray-900 mb-3">TV Connections</div>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setActiveDate((d) => { setError(null); return d })}
              className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
            {!isToday && (
              <button
                onClick={() => setActiveDate(todayDate)}
                className="border border-gray-300 px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back to Today
              </button>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (!puzzle) return null

  // ── Game UI ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center bg-white pt-8 pb-16 px-4">
      <Toast message={toast} onDismiss={() => setToast(null)} />

      {showEndScreen && (
        <EndScreen
          isWon={isWon}
          lives={lives}
          guessHistory={guessHistory}
          groups={puzzle.groups}
          tileMap={tileMap}
          date={activeDate}
          onClose={() => setShowEndScreen(false)}
        />
      )}

      {showHistory && (
        <CalendarModal
          todayDate={todayDate}
          activeDate={activeDate}
          onPlay={(d) => { setShowHistory(false); setActiveDate(d) }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Header */}
      <div className="w-full max-w-[480px] mb-6">
        <div className="relative border-b border-gray-200 pb-4 text-center">
          <button
            onClick={() => setShowHistory(true)}
            className="absolute right-0 top-1 text-gray-400 hover:text-gray-700 transition-colors text-sm font-medium"
          >
            Calendar
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">TV Connections</h1>
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest">
            {formatDateLabel(activeDate)}
          </p>
        </div>

        {!isToday && (
          <div className="flex items-center justify-between mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">Playing a past puzzle</span>
            <button
              onClick={() => setActiveDate(todayDate)}
              className="text-xs text-amber-800 font-semibold underline hover:no-underline"
            >
              Back to Today
            </button>
          </div>
        )}

        {isToday && (
          <p className="text-center text-sm text-gray-500 mt-3">
            Create four groups of four TV-related items
          </p>
        )}
      </div>

      {/* Solved rows */}
      <div className="w-full max-w-[480px] flex flex-col gap-2 mb-3">
        {solvedGroups.map((g) => (
          <SolvedRow
            key={g.id}
            group={g}
            tiles={g.tiles.map((id) => tileMap[id]).filter(Boolean)}
          />
        ))}
      </div>

      {/* Tile grid */}
      {unsolvedTiles.length > 0 && (
        <div className="w-full max-w-[480px] grid grid-cols-4 gap-2 mb-5">
          {unsolvedTiles.map((tile) => (
            <TileComponent
              key={tile.id}
              tile={tile}
              isSelected={selectedIds.includes(tile.id)}
              isShaking={shakingIds.includes(tile.id)}
              onClick={() => toggleTile(tile.id)}
            />
          ))}
        </div>
      )}

      {/* Lives */}
      <div className="mb-5">
        <LivesDots lives={lives} />
      </div>

      {/* Controls */}
      {!isComplete && (
        <div className="flex gap-3">
          <button
            onClick={() => { setShuffledTiles((p) => shuffle(p)); setSelectedIds([]) }}
            className="px-5 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Shuffle
          </button>
          <button
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
            className="px-5 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Deselect All
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedIds.length !== MAX_SELECTION}
            className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      )}

      {isComplete && !showEndScreen && (
        <button
          onClick={() => setShowEndScreen(true)}
          className="px-6 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          See Results
        </button>
      )}
    </main>
  )
}
