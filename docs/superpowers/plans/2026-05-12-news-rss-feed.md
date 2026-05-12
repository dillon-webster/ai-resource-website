# RSS News Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Latest from the Labs" news strip to the home page that shows the most recent article from Anthropic, OpenAI, and Google AI — fetched from RSS feeds server-side — and drives a Three.js camera zoom toward the matching logo on hover.

**Architecture:** A new `/api/news` server endpoint fetches three RSS feeds in parallel, caches results in memory for 30 minutes, and returns one article per source. A new `NewsStrip` React component renders those articles as compact cards; on hover it writes a logo index to a shared `focusRef`. `AnimatedBackground` reads `focusRef` each animation frame and smoothly lerps the camera toward the focused logo.

**Tech Stack:** Node.js `node:test` (built-in, no install needed) for server tests, `fast-xml-parser` for RSS XML, `tsx` to run TypeScript tests, React `useRef` for zero-render shared state, Three.js for camera lerp.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Install | `server/package.json` | Add `fast-xml-parser` dependency |
| Create | `server/newsCache.ts` | RSS fetch + 30-min in-memory cache |
| Create | `server/newsCache.test.ts` | Unit tests for cache TTL + fallback logic |
| Modify | `server/index.ts` | Add `GET /api/news` route |
| Modify | `client/src/types.ts` | Add `NewsItem` type |
| Create | `client/src/components/NewsStrip.tsx` | 3-card news strip with hover interaction |
| Modify | `client/src/components/AnimatedBackground.tsx` | Accept `focusRef` prop, drive camera lerp |
| Modify | `client/src/pages/Home.tsx` | Create `focusRef`, insert `NewsStrip`, pass props |

---

## Task 1: Install fast-xml-parser

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install the package**

Run from the `server/` directory:
```bash
cd server && npm install fast-xml-parser
```

Expected: `fast-xml-parser` appears in `server/package.json` dependencies and `server/node_modules/fast-xml-parser/` exists.

- [ ] **Step 2: Verify import resolves**

```bash
cd server && npx tsx -e "import { XMLParser } from 'fast-xml-parser'; console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add fast-xml-parser to server"
```

---

## Task 2: Server cache module

**Files:**
- Create: `server/newsCache.ts`
- Create: `server/newsCache.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/newsCache.test.ts`:

```typescript
import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'

// We need to intercept fetch. Node 18+ has global fetch.
// We'll replace globalThis.fetch for each test.

describe('getNews', () => {
  const FAKE_RSS = (title: string, link: string) => `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <pubDate>Mon, 12 May 2026 10:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`

  let originalFetch: typeof globalThis.fetch

  before(() => {
    originalFetch = globalThis.fetch
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('returns one item per source when all feeds succeed', async () => {
    // Reset module cache between tests by re-importing with a cache-bust
    // We test the pure fetchLatestItem helper exported for testing
    const { fetchLatestItemForTest } = await import('./newsCache.ts?bust=' + Date.now())

    globalThis.fetch = async (url: string | URL | Request) => {
      const u = url.toString()
      if (u.includes('anthropic')) return new Response(FAKE_RSS('Anthropic Post', 'https://anthropic.com/a'), { status: 200 })
      if (u.includes('openai'))   return new Response(FAKE_RSS('OpenAI Post',    'https://openai.com/b'),    { status: 200 })
      return new Response(FAKE_RSS('Google Post', 'https://google.com/c'), { status: 200 })
    }

    const item = await fetchLatestItemForTest('anthropic', 'https://www.anthropic.com/rss.xml')
    assert.equal(item?.source, 'anthropic')
    assert.equal(item?.title, 'Anthropic Post')
    assert.equal(item?.url, 'https://anthropic.com/a')
  })

  it('returns null when a feed fetch fails', async () => {
    const { fetchLatestItemForTest } = await import('./newsCache.ts?bust=' + Date.now())

    globalThis.fetch = async () => { throw new Error('network error') }

    const item = await fetchLatestItemForTest('openai', 'https://openai.com/news/rss.xml')
    assert.equal(item, null)
  })

  it('returns null when feed returns non-200', async () => {
    const { fetchLatestItemForTest } = await import('./newsCache.ts?bust=' + Date.now())

    globalThis.fetch = async () => new Response('Not Found', { status: 404 })

    const item = await fetchLatestItemForTest('google', 'https://blog.google/technology/ai/rss/')
    assert.equal(item, null)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npx tsx --test newsCache.test.ts
```

Expected: Error — `Cannot find module './newsCache.ts'` (or similar). Tests fail because the module doesn't exist yet.

- [ ] **Step 3: Create server/newsCache.ts**

```typescript
import { XMLParser } from 'fast-xml-parser'

export interface NewsItem {
  source: 'anthropic' | 'openai' | 'google'
  title: string
  url: string
  date: string
}

const FEEDS: Array<{ source: NewsItem['source']; url: string }> = [
  { source: 'anthropic', url: 'https://www.anthropic.com/rss.xml' },
  { source: 'openai',    url: 'https://openai.com/news/rss.xml' },
  { source: 'google',    url: 'https://blog.google/technology/ai/rss/' },
]

const CACHE_TTL_MS = 30 * 60 * 1000

interface Cache {
  items: (NewsItem | null)[]
  fetchedAt: number
}

let cache: Cache | null = null

export async function fetchLatestItemForTest(
  source: NewsItem['source'],
  feedUrl: string
): Promise<NewsItem | null> {
  return fetchLatestItem(source, feedUrl)
}

async function fetchLatestItem(
  source: NewsItem['source'],
  feedUrl: string
): Promise<NewsItem | null> {
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const xml = await res.text()
    const parser = new XMLParser()
    const parsed = parser.parse(xml)
    const channel = parsed?.rss?.channel
    if (!channel) return null
    const rawItems = channel.item
    const items = Array.isArray(rawItems) ? rawItems : [rawItems]
    const first = items[0]
    if (!first) return null
    return {
      source,
      title: String(first.title ?? '').trim(),
      url:   String(first.link ?? '').trim(),
      date:  String(first.pubDate ?? '').trim(),
    }
  } catch {
    return null
  }
}

export async function getNews(): Promise<(NewsItem | null)[]> {
  const now = Date.now()
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items
  }
  const items = await Promise.all(FEEDS.map(f => fetchLatestItem(f.source, f.url)))
  cache = { items, fetchedAt: now }
  return items
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npx tsx --test newsCache.test.ts
```

Expected output: All 3 tests pass with `✓` marks.

- [ ] **Step 5: Commit**

```bash
git add server/newsCache.ts server/newsCache.test.ts
git commit -m "feat: add RSS news cache module"
```

---

## Task 3: Add /api/news route

**Files:**
- Modify: `server/index.ts` — add import + route before the static file serving block

- [ ] **Step 1: Add import and route**

Open `server/index.ts`. After the existing imports at the top, add:

```typescript
import { getNews } from './newsCache'
```

Then add this route **before** the `app.use(express.static(clientDist))` line (must come before the catch-all `*` route):

```typescript
app.get('/api/news', async (_req, res) => {
  try {
    const items = await getNews()
    res.json(items)
  } catch {
    res.status(500).json({ error: 'Failed to fetch news.' })
  }
})
```

The `server/index.ts` route section should now read (in order):
1. `GET /api/resources`
2. `POST /api/resources`
3. `GET /api/news`  ← new
4. `app.use(express.static(...))`
5. `app.get('*', ...)`

- [ ] **Step 2: Verify the server starts and endpoint responds**

```bash
cd server && npx tsx index.ts &
sleep 2
curl http://localhost:3001/api/news
```

Expected: A JSON array with 3 entries (some may be `null` if feeds are temporarily unreachable, but the endpoint should return 200 and a valid array — not a 500).

```bash
kill %1
```

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat: add GET /api/news endpoint"
```

---

## Task 4: Add NewsItem type to client

**Files:**
- Modify: `client/src/types.ts`

- [ ] **Step 1: Add the type**

Open `client/src/types.ts` and append:

```typescript
export interface NewsItem {
  source: 'anthropic' | 'openai' | 'google'
  title: string
  url: string
  date: string
}
```

The full file should now be:

```typescript
export interface Resource {
  id: string
  title: string
  url: string
  description?: string
  category?: string
  tags?: string[]
  submitterName?: string
  createdAt: string
}

export interface NewsItem {
  source: 'anthropic' | 'openai' | 'google'
  title: string
  url: string
  date: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/types.ts
git commit -m "feat: add NewsItem type"
```

---

## Task 5: Update AnimatedBackground to accept focusRef

**Files:**
- Modify: `client/src/components/AnimatedBackground.tsx`

The key changes:
1. Accept a `focusRef` prop
2. Add `camXRef` to track camera X position
3. In the animation loop: read `focusRef.current` each frame, lerp camera X/Z toward the focused logo, adjust logo opacities

- [ ] **Step 1: Add the focusRef prop and camXRef**

Replace the component signature and refs block. Find:

```typescript
export default function AnimatedBackground() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const scrollRef  = useRef(0)
  const camZRef    = useRef(9)
  const camYRef    = useRef(0)
```

Replace with:

```typescript
interface Props {
  focusRef: React.RefObject<number | null>
}

export default function AnimatedBackground({ focusRef }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const scrollRef  = useRef(0)
  const camZRef    = useRef(9)
  const camYRef    = useRef(0)
  const camXRef    = useRef(0)
```

Also add the React import at the top of the file if not already present. The existing import line is:
```typescript
import { useEffect, useRef } from 'react'
```
Change to:
```typescript
import { useEffect, useRef } from 'react'
import type React from 'react'
```

Actually, `React.RefObject` requires React to be in scope. Since this is React 18 with the JSX transform, change the import to:

```typescript
import { useEffect, useRef, type MutableRefObject } from 'react'
```

And update the Props interface to:
```typescript
interface Props {
  focusRef: MutableRefObject<number | null>
}
```

- [ ] **Step 2: Read focusRef once at the top of the animate function**

Find the first line inside the `animate` function body:

```typescript
      animId = requestAnimationFrame(animate)
      const t = reduceMotion ? 0 : ts * 0.001
      const scrollProgress = clamp01(scrollRef.current / 520)
```

Replace with:

```typescript
      animId = requestAnimationFrame(animate)
      const t = reduceMotion ? 0 : ts * 0.001
      const scrollProgress = clamp01(scrollRef.current / 520)
      const focusedIdx = focusRef.current
```

This single read is used by both the camera block (Step 3) and logo block (Step 4) below.

- [ ] **Step 3: Replace the camera position block**

Find the existing camera position block:

```typescript
      const targetZ = reduceMotion ? 9 : 9 - scrollProgress * 1.4
      const targetY = reduceMotion ? 0 : scrollProgress * 0.25

      camZRef.current += (targetZ - camZRef.current) * 0.055
      camYRef.current += (targetY - camYRef.current) * 0.055
      camera.position.z = camZRef.current
      camera.position.y = camYRef.current
```

Replace with:

```typescript
      const scrollTargetZ = reduceMotion ? 9 : 9 - scrollProgress * 1.4
      const targetZ = focusedIdx !== null ? 6.0 : scrollTargetZ
      const targetY = reduceMotion ? 0 : scrollProgress * 0.25
      const targetX = (focusedIdx !== null && LOGO_CONFIGS[focusedIdx])
        ? LOGO_CONFIGS[focusedIdx].baseX * 0.35
        : 0

      camZRef.current += (targetZ - camZRef.current) * 0.04
      camYRef.current += (targetY - camYRef.current) * 0.055
      camXRef.current += (targetX - camXRef.current) * 0.04
      camera.position.z = camZRef.current
      camera.position.y = camYRef.current
      camera.position.x = camXRef.current
```

Note: `baseX * 0.35` keeps the camera shift subtle — the logos are far from center (up to ±5.8 units) so we only partially shift the camera so the logo comes into better view without going off-screen.

- [ ] **Step 4: Replace the logo animation block**

Find the existing logo block inside the `animate` function:

```typescript
      // Logos drift in slow Lissajous paths
      sprites.forEach((sp) => {
        sp.material.opacity = logoFocus
        sp.position.x = sp._baseX + Math.sin(t * 0.16 + sp._phase) * 0.7
        sp.position.y = sp._baseY + Math.cos(t * 0.11 + sp._phase) * 0.45 - scrollProgress * 0.5
      })
```

Replace with:

```typescript
      // Logos drift in slow Lissajous paths; brighten focused logo
      sprites.forEach((sp, i) => {
        let targetOpacity: number
        if (focusedIdx === null) {
          targetOpacity = logoFocus
        } else if (i === focusedIdx) {
          targetOpacity = 0.55
        } else {
          targetOpacity = 0.04
        }
        sp.material.opacity += (targetOpacity - sp.material.opacity) * 0.05
        sp.position.x = sp._baseX + Math.sin(t * 0.16 + sp._phase) * 0.7
        sp.position.y = sp._baseY + Math.cos(t * 0.11 + sp._phase) * 0.45 - scrollProgress * 0.5
      })
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/AnimatedBackground.tsx
git commit -m "feat: AnimatedBackground accepts focusRef for camera zoom"
```

---

## Task 6: Create NewsStrip component

**Files:**
- Create: `client/src/components/NewsStrip.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useEffect, useState, type MutableRefObject } from 'react'
import { NewsItem } from '../types'

const SOURCE_CONFIG: Record<
  NewsItem['source'],
  { label: string; color: string; logoIndex: number }
> = {
  anthropic: { label: 'Anthropic', color: '#ff6b35', logoIndex: 0 },
  google:    { label: 'Google AI', color: '#4361ee', logoIndex: 1 },
  openai:    { label: 'OpenAI',    color: '#10b981', logoIndex: 2 },
}

const SOURCES: NewsItem['source'][] = ['anthropic', 'openai', 'google']

interface Props {
  focusRef: MutableRefObject<number | null>
}

export default function NewsStrip({ focusRef }: Props) {
  const [items, setItems] = useState<(NewsItem | null)[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/news')
      .then((r) => {
        if (!r.ok) throw new Error('failed')
        return r.json() as Promise<(NewsItem | null)[]>
      })
      .then((data) => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="px-6 lg:px-10 mb-8">
        <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">
          Latest from the Labs
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-10 mb-8">
      <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">
        Latest from the Labs
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SOURCES.map((source) => {
          const cfg  = SOURCE_CONFIG[source]
          const item = items.find((i) => i?.source === source) ?? null

          return (
            <a
              key={source}
              href={item?.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => { focusRef.current = cfg.logoIndex }}
              onMouseLeave={() => { focusRef.current = null }}
              className="group flex flex-col justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200"
              style={{ borderLeftColor: cfg.color, borderLeftWidth: '2px' }}
            >
              <span className="text-xs font-semibold mb-2" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
              {item ? (
                <>
                  <p className="text-sm text-white/75 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-white/30 mt-2">
                    {new Date(item.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/30">No recent news</p>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/NewsStrip.tsx
git commit -m "feat: add NewsStrip component"
```

---

## Task 7: Wire everything together in Home.tsx

**Files:**
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Update imports and add focusRef**

Find the top of `Home.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import ResourceCard from '../components/ResourceCard'
import { Resource } from '../types'
```

Replace with:

```typescript
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import NewsStrip from '../components/NewsStrip'
import ResourceCard from '../components/ResourceCard'
import { Resource } from '../types'
```

- [ ] **Step 2: Add focusRef inside the component**

Find the start of the `Home` function body:

```typescript
export default function Home() {
  const [resources, setResources] = useState<Resource[]>([])
```

Replace with:

```typescript
export default function Home() {
  const focusRef = useRef<number | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
```

- [ ] **Step 3: Pass focusRef to AnimatedBackground**

Find:

```typescript
      <AnimatedBackground />
```

Replace with:

```typescript
      <AnimatedBackground focusRef={focusRef} />
```

- [ ] **Step 4: Insert NewsStrip between hero and resources**

Find the hero closing tag and the loading/error states block:

```typescript
        {loading && <p className="text-center text-white/35 text-sm px-6">Loading resources...</p>}
```

Insert `<NewsStrip focusRef={focusRef} />` immediately before that line:

```typescript
        <NewsStrip focusRef={focusRef} />

        {loading && <p className="text-center text-white/35 text-sm px-6">Loading resources...</p>}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Start dev environment and manually verify**

In one terminal:
```bash
cd server && npx tsx index.ts
```

In another:
```bash
cd client && npx vite
```

Open `http://localhost:5173` and verify:
- "Latest from the Labs" strip appears between the hero and resources
- 3 cards show (Anthropic, OpenAI, Google AI) with headlines and dates
- Hovering a card smoothly zooms the Three.js camera toward the matching floating logo and brightens it
- Moving the mouse off returns the camera to default position
- Clicking a card opens the article in a new tab
- Loading skeleton shows briefly before articles appear

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat: wire NewsStrip and AnimatedBackground focus interaction"
```
