'use client'

import { useState } from 'react'
import type { Group, Tile, GuessRecord } from '@/lib/types'
import { DIFFICULTY_CONFIG } from '@/lib/types'
import SolvedRow from './SolvedRow'

interface EndScreenProps {
  isWon: boolean
  lives: number
  guessHistory: GuessRecord[]
  groups: Group[]
  tileMap: Record<string, Tile>
  date: string
  onClose: () => void
}

export default function EndScreen({ isWon, lives, guessHistory, groups, tileMap, date, onClose }: EndScreenProps) {
  const [copied, setCopied] = useState(false)

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }

  function buildShareText() {
    const tileToGroup = new Map<string, Group>()
    for (const g of groups) {
      for (const tileId of g.tiles) tileToGroup.set(tileId, g)
    }

    const rows = guessHistory.map((guess) =>
      guess.tileIds.map((id) => {
        const g = tileToGroup.get(id)
        return g ? DIFFICULTY_CONFIG[g.difficulty].emoji : '⬜'
      }).join('')
    )

    return [
      `TV Connections — ${formatDate(date)}`,
      ...rows,
      `Lives left: ${lives}`,
      'tvconnections.app',
    ].join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your results:', text)
    }
  }

  const sorted = [...groups].sort((a, b) => a.difficulty - b.difficulty)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-pop-in">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">{isWon ? '🎉' : '😔'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isWon ? 'Brilliant!' : 'Better luck tomorrow'}
          </h2>
          {isWon && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {lives === 4 ? 'Perfect game!' : `Solved with ${lives} ${lives === 1 ? 'life' : 'lives'} remaining`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-5">
          {sorted.map((g) => (
            <SolvedRow
              key={g.id}
              group={g}
              tiles={g.tiles.map((id) => tileMap[id]).filter(Boolean)}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Share Results'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
