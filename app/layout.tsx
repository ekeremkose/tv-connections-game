import type { Metadata } from 'next'
import Script from 'next/script'
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
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3832617786523969"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-white dark:bg-gray-900 min-h-screen font-sans antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  )
}
