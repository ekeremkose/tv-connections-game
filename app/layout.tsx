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
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              if (localStorage.getItem('tv-connections-theme') === 'dark') {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="bg-white dark:bg-gray-900 min-h-screen font-sans antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  )
}
