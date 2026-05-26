import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TV Connections',
  description: 'A daily TV trivia connections puzzle',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
