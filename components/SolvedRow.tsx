'use client'

import { useState } from 'react'
import type { Group, Tile } from '@/lib/types'
import { DIFFICULTY_CONFIG } from '@/lib/types'

interface SolvedRowProps {
  group: Group
  tiles: Tile[]
}

export default function SolvedRow({ group, tiles }: SolvedRowProps) {
  const [showExplanation, setShowExplanation] = useState(false)
  const config = DIFFICULTY_CONFIG[group.difficulty]

  return (
    <div
      className="w-full rounded-lg p-3 animate-pop-in"
      style={{ backgroundColor: config.bg, opacity: 0 }}
    >
      <div
        className="flex flex-col gap-1 cursor-pointer"
        onClick={() => setShowExplanation((v) => !v)}
        onMouseEnter={() => setShowExplanation(true)}
        onMouseLeave={() => setShowExplanation(false)}
      >
        <div className="font-bold text-sm uppercase tracking-wider text-center" style={{ color: config.text }}>
          {group.name}
        </div>
        <div className="text-xs text-center font-medium" style={{ color: config.text, opacity: 0.8 }}>
          {tiles.map((t) => t.text).join(' · ')}
        </div>
        {showExplanation && (
          <div className="mt-1 text-xs text-center italic animate-fade-in" style={{ color: config.text, opacity: 0.75 }}>
            {group.explanation}
          </div>
        )}
      </div>
    </div>
  )
}
