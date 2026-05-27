'use client'

interface LivesDotsProps {
  lives: number
  maxLives?: number
}

export default function LivesDots({ lives, maxLives = 4 }: LivesDotsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">Mistakes remaining:</span>
      {Array.from({ length: maxLives }).map((_, i) => (
        <span
          key={i}
          className="w-4 h-4 rounded-full inline-block transition-all duration-300 text-gray-800 dark:text-gray-200"
          style={{
            backgroundColor: i < lives ? 'currentColor' : 'transparent',
            border: '2px solid currentColor',
            opacity: i < lives ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  )
}
