# TV Connections

A daily TV trivia puzzle game — group 16 tiles into 4 categories of 4. Powered by static JSON files generated with Claude AI.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Add your API key

Create `.env.local` in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...your key here...
ADMIN_ENABLED=true
```

> `ADMIN_ENABLED=true` activates the `/admin` panel locally. **Do not set this on Vercel** — the admin panel will return 404 in production automatically.

Get your key at [console.anthropic.com](https://console.anthropic.com) → API Keys.

### 3. Generate a puzzle

```bash
# Today's puzzle
npm run generate:puzzle

# Specific date
npm run generate:puzzle -- --date 2026-05-27

# Date range (e.g. a whole week)
npm run generate:puzzle -- --from 2026-05-26 --to 2026-06-01

# Force-overwrite an existing puzzle
npm run generate:puzzle -- --date 2026-05-27 --force
```

Puzzles are saved to `public/puzzles/YYYY-MM-DD.json`.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Admin panel (local only)

Open [http://localhost:3000/admin](http://localhost:3000/admin) to:

- See all dates and their puzzle status
- Generate puzzles for missing dates
- Edit any field (tile text, group name, explanation, difficulty)
- Regenerate a puzzle with AI
- Delete a puzzle

> **Note:** The admin panel writes to the local filesystem. It does not work on Vercel (read-only filesystem). To deploy an admin panel, migrate writes to a database.

### 6. Deploy to Vercel

```bash
# Push to GitHub first
git add .
git commit -m "add puzzles"
git push

# Then deploy via Vercel dashboard or CLI
npx vercel
```

**No environment variables needed on Vercel** — puzzles are static JSON files committed to the repo. The `ANTHROPIC_API_KEY` is only used locally to generate puzzles.

---

## Puzzle format

Puzzles are stored as JSON in `public/puzzles/YYYY-MM-DD.json`:

```json
{
  "date": "2026-05-26",
  "title": "Daily TV Connections",
  "tiles": [
    { "id": "tile_1",  "text": "Walter White" },
    { "id": "tile_2",  "text": "Los Pollos Hermanos" },
    ...
    { "id": "tile_16", "text": "..." }
  ],
  "groups": [
    {
      "id": "group_1",
      "name": "Breaking Bad universe",
      "connection_type": "same_show",
      "difficulty": 1,
      "tiles": ["tile_1", "tile_2", "tile_3", "tile_4"],
      "explanation": "Walter White, Los Pollos Hermanos, Bryan Cranston, and 'I am the danger' are all from Breaking Bad."
    }
  ]
}
```

Difficulty levels: `1` = Easy (🟨), `2` = Medium (🟩), `3` = Hard (🟦), `4` = Expert (🟪)

---

## Architecture

```
public/puzzles/          ← static puzzle JSON (served by Next.js, committed to git)
app/page.tsx             ← game UI, fetches /puzzles/YYYY-MM-DD.json directly
app/admin/               ← local-only puzzle manager
scripts/generate-puzzles.ts  ← CLI to generate puzzles via Claude API
lib/
  types.ts               ← TypeScript types
  prompt.ts              ← system prompt + connection types pool
  storage.ts             ← localStorage helpers (puzzle cache + game state)
```

The frontend **never calls Claude API** — it only fetches static files from `/public/puzzles/`.

---

## Adding a database later

The current MVP uses the filesystem. To add Supabase (or another DB):

1. Replace `app/api/admin/puzzle/route.ts` with DB read/write calls
2. Replace `app/api/admin/generate/route.ts` with DB write after generation
3. Optionally replace static file fetching in `app/page.tsx` with a DB read API route

The `lib/storage.ts` localStorage layer (client-side game state) stays the same regardless.
