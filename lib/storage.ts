import type { Puzzle, GameState } from './types'

const PUZZLE_KEY_PREFIX = 'tv-connections-puzzle-'
const STATE_KEY_PREFIX = 'tv-connections-state-'

export function getPuzzleFromStorage(date: string): Puzzle | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PUZZLE_KEY_PREFIX + date)
    if (!raw) return null
    return JSON.parse(raw) as Puzzle
  } catch {
    return null
  }
}

export function savePuzzleToStorage(puzzle: Puzzle): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PUZZLE_KEY_PREFIX + puzzle.date, JSON.stringify(puzzle))
  } catch { /* quota exceeded or private mode */ }
}

export function getGameStateFromStorage(date: string): GameState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STATE_KEY_PREFIX + date)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

export function saveGameStateToStorage(state: GameState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STATE_KEY_PREFIX + state.date, JSON.stringify(state))
  } catch { /* quota exceeded or private mode */ }
}
