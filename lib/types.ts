export interface Tile {
  id: string   // e.g. "tile_1"
  text: string
}

export interface Group {
  id: string          // e.g. "group_1"
  name: string        // e.g. "Characters from Breaking Bad"
  connection_type: string
  difficulty: 1 | 2 | 3 | 4
  tiles: string[]     // tile IDs
  explanation: string
}

export interface Puzzle {
  date: string
  title: string
  tiles: Tile[]
  groups: Group[]
}

export interface GuessRecord {
  tileIds: string[]
  correct: boolean
  groupId?: string
  difficulty?: number
}

export interface GameState {
  date: string
  solvedGroupIds: string[]
  lives: number
  guessHistory: GuessRecord[]
  isComplete: boolean
  isWon: boolean
}

export const DIFFICULTY_CONFIG: Record<number, { bg: string; text: string; emoji: string }> = {
  1: { bg: '#F9DF6D', text: '#000', emoji: '🟨' },
  2: { bg: '#A0C35A', text: '#000', emoji: '🟩' },
  3: { bg: '#B0C4EF', text: '#000', emoji: '🟦' },
  4: { bg: '#BA81C5', text: '#000', emoji: '🟪' },
}
