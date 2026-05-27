import { MetadataRoute } from 'next'
import { readdirSync } from 'fs'
import { join } from 'path'

export default function sitemap(): MetadataRoute.Sitemap {
  const puzzlesDir = join(process.cwd(), 'public', 'puzzles')

  let puzzleDates: string[] = []
  try {
    puzzleDates = readdirSync(puzzlesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort()
  } catch {
    // puzzles dir might not exist in some environments
  }

  const puzzleUrls: MetadataRoute.Sitemap = puzzleDates.map((date) => ({
    url: `https://tvconnectionsgame.com/?date=${date}`,
    lastModified: new Date(date),
    changeFrequency: 'never',
    priority: 0.7,
  }))

  return [
    {
      url: 'https://tvconnectionsgame.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...puzzleUrls,
  ]
}
