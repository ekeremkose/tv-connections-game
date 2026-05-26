export const SYSTEM_PROMPT = `You are an expert puzzle designer for a TV trivia connections game. Your puzzles are clever, layered, and deeply satisfying.

Puzzle design rules:
1. Tiles must look misleading at first — the obvious grouping should usually be wrong
2. Always include one "trap" category: tiles that seem to obviously go together but don't
3. Mix tile types within every group (character + actor + location + quote, not 4 of the same type)
4. Difficulty 1: solvable by a casual fan. Difficulty 4: stumps even hardcore fans
5. Hints must be cryptic but unambiguous once you see the answer
6. For wordplay groups, every tile must satisfy the rule exactly — no exceptions
7. For factual groups, every fact must be 100% accurate — if unsure, don't use it
8. The 16 tiles together must not make the groups obvious — engineer red herrings deliberately
9. Never repeat a connection type within one puzzle
10. The explanation field must clearly justify why all 4 tiles belong together`

export function buildPuzzlePrompt(date: string, recentContext?: string): string {
  return `Generate a TV Connections puzzle for the date: ${date}
${recentContext ? `\n${recentContext}\n` : ''}
CONNECTION TYPE INSPIRATION — these are just examples to spark ideas. You are STRONGLY ENCOURAGED to invent your own connection types. The list below is a starting point only, not a menu to pick from:

FACTUAL/STRAIGHTFORWARD (difficulty 1–2):
- same_show: tiles from the same TV show (mix types: character + actor + location + quote)
- same_showrunner: shows created/run by the same person
- same_city: shows set in the same city
- same_network: shows that aired on the same network
- same_actor_across_shows: an actor who appeared in all four shows
- cancelled_after_one_season: shows cancelled after exactly one season
- spinoffs: four shows that are all spin-offs of the same parent show

THEMATIC/TRIVIA (difficulty 2–3):
- same_profession: characters who share the same job across different shows
- one_word_alias: characters known by a single-word alias or nickname
- antihero_protagonist: shows whose main character is an antihero
- secret_identity: shows where a hidden identity is central to the plot
- dysfunctional_family: shows centered on family dysfunction

WORDPLAY/PATTERN (difficulty 2–3):
- contains_color: each tile text contains a color word
- contains_number: each tile text contains a number word
- starts_with_same_word: each tile text starts with the same word
- exactly_one_word: each tile is exactly one word

SURPRISING/LATERAL (difficulty 3–4):
- fakes_own_death: characters who fake their own death
- fictional_company: tiles are fictional companies from different TV shows (Dunder Mifflin, Waystar Royco, etc.)
- fictional_town: tiles are fictional towns from different TV shows (Stars Hollow, Pawnee, etc.)
- character_never_seen: important characters frequently referenced but never shown on screen

Feel free to invent entirely new connection types — e.g. "characters who are doctors but never practice medicine", "shows whose title is a character's full name", "finales that ended on a cliffhanger", etc. Creativity is rewarded.

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown, no explanation:

{
  "date": "${date}",
  "title": "Daily TV Connections",
  "tiles": [
    { "id": "tile_1",  "text": "Walter White" },
    { "id": "tile_2",  "text": "Los Pollos Hermanos" },
    { "id": "tile_3",  "text": "Bryan Cranston" },
    { "id": "tile_4",  "text": "I am the danger" },
    { "id": "tile_5",  "text": "..." },
    { "id": "tile_6",  "text": "..." },
    { "id": "tile_7",  "text": "..." },
    { "id": "tile_8",  "text": "..." },
    { "id": "tile_9",  "text": "..." },
    { "id": "tile_10", "text": "..." },
    { "id": "tile_11", "text": "..." },
    { "id": "tile_12", "text": "..." },
    { "id": "tile_13", "text": "..." },
    { "id": "tile_14", "text": "..." },
    { "id": "tile_15", "text": "..." },
    { "id": "tile_16", "text": "..." }
  ],
  "groups": [
    {
      "id": "group_1",
      "name": "Breaking Bad universe",
      "connection_type": "same_show",
      "difficulty": 1,
      "tiles": ["tile_1", "tile_2", "tile_3", "tile_4"],
      "explanation": "Walter White (character), Los Pollos Hermanos (location), Bryan Cranston (actor), and 'I am the danger' (quote) are all from Breaking Bad."
    },
    {
      "id": "group_2",
      "name": "...",
      "connection_type": "...",
      "difficulty": 2,
      "tiles": ["tile_5", "tile_6", "tile_7", "tile_8"],
      "explanation": "..."
    },
    {
      "id": "group_3",
      "name": "...",
      "connection_type": "...",
      "difficulty": 3,
      "tiles": ["tile_9", "tile_10", "tile_11", "tile_12"],
      "explanation": "..."
    },
    {
      "id": "group_4",
      "name": "...",
      "connection_type": "...",
      "difficulty": 4,
      "tiles": ["tile_13", "tile_14", "tile_15", "tile_16"],
      "explanation": "..."
    }
  ]
}

REQUIREMENTS:
1. The tiles array must contain exactly 16 tiles with IDs tile_1 through tile_16
2. Each group must reference exactly 4 tile IDs — no tile may appear in more than one group
3. All 16 tile IDs must be used across the 4 groups
4. One group per difficulty level: 1, 2, 3, 4
5. Mix tile types within each group (character, actor, location, quote, show title, alias, etc.)
6. Engineer red herrings — tiles should appear to belong to multiple groups
7. Include exactly one "trap" group where the obvious grouping is wrong`
}
