import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'TV Connections Game – Daily TV Show Puzzle',
  description: 'Free daily TV show connections puzzle. Group 16 tiles into 4 categories based on TV shows, characters, actors, and more. New puzzle every day!',
  keywords: [
    'tv connections game',
    'tv show connections',
    'daily tv puzzle',
    'connections game tv shows',
    'tv trivia game',
    'daily word puzzle',
    'tv show quiz',
    'connections puzzle',
    'nyt connections tv',
    'television connections game',
  ],
  metadataBase: new URL('https://tvconnectionsgame.com'),
  openGraph: {
    title: 'TV Connections Game – Daily TV Show Puzzle',
    description: 'Group 16 TV-related tiles into 4 categories. Free daily puzzle, new challenge every day!',
    url: 'https://tvconnectionsgame.com',
    siteName: 'TV Connections Game',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'TV Connections Game – Daily TV Show Puzzle',
    description: 'Group 16 TV-related tiles into 4 categories. Free daily puzzle, new challenge every day!',
  },
  alternates: {
    canonical: 'https://tvconnectionsgame.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
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
