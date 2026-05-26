'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string | null
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      className={[
        'fixed top-6 left-1/2 -translate-x-1/2 z-50',
        'bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      ].join(' ')}
    >
      {message}
    </div>
  )
}
