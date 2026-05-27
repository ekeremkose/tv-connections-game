'use client'

import type { Tile as TileType } from '@/lib/types'

interface TileProps {
  tile: TileType
  isSelected: boolean
  isShaking: boolean
  onClick: () => void
}

export default function Tile({ tile, isSelected, isShaking, onClick }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full h-full min-h-[64px] rounded-lg font-semibold text-sm uppercase tracking-wide',
        'transition-all duration-100 select-none cursor-pointer',
        'flex items-center justify-center text-center px-2 leading-tight',
        isSelected
          ? 'bg-gray-700 text-white scale-[0.97] border-2 border-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:border-gray-200'
          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-2 border-transparent dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
        isShaking ? 'animate-shake' : '',
      ].filter(Boolean).join(' ')}
    >
      {tile.text}
    </button>
  )
}
