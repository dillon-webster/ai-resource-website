# RSS News Feed — Design Spec
Date: 2026-05-12

## Overview

Add a "Latest from the Labs" news strip to the home page that displays the most recent article from Anthropic, OpenAI, and Google AI. Hovering a news card smoothly moves the Three.js camera toward that company's floating logo in the animated background.

## Architecture

Three moving parts with a single shared `focusRef` owned by `Home`:

1. **Server** — `/api/news` endpoint with in-memory RSS caching
2. **`NewsStrip` component** — compact 3-card strip; writes to `focusRef` on hover
3. **`AnimatedBackground` update** — reads `focusRef` each frame to drive camera lerp

`Home` creates `focusRef = useRef<number | null>(null)` and passes it to both components.

## Server: `/api/news`

**RSS sources:**
| Source    | Feed URL                                    |
|-----------|---------------------------------------------|
| Anthropic | `https://www.anthropic.com/rss.xml`         |
| OpenAI    | `https://openai.com/news/rss.xml`           |
| Google AI | `https://blog.google/technology/ai/rss/`    |

**Caching:** Module-level cache object with a timestamp. Refreshes if older than 30 minutes. All three feeds fetched in parallel on refresh.

**Parsing:** `fast-xml-parser` added to `server/package.json`. Pulls first `<item>` from each feed: `title`, `link`, `pubDate`.

**Error handling:** Each source is fetched independently. A failed source returns `null` for that entry; the others still return. No hard crash.

**Response shape:**
```json
[
  { "source": "anthropic", "title": "...", "url": "...", "date": "..." },
  { "source": "openai",    "title": "...", "url": "...", "date": "..." },
  { "source": "google",    "title": "...", "url": "...", "date": "..." }
]
```

## Client: `NewsStrip` Component

**Placement:** Between the hero section and the resources grid in `Home.tsx`.

**Layout:**
- 3 cards in a horizontal row on desktop (≥sm), stacked vertically on mobile
- Each card: colored left-border accent, company name, article headline (1 line, truncated), formatted publish date, full card is a link opening in a new tab

**Company accent colors:**
| Source    | Color  |
|-----------|--------|
| Anthropic | Orange (`#ff6b35`) |
| OpenAI    | Teal (`#10b981`) |
| Google    | Blue-purple (`#4361ee`) |

**Interaction:**
- `onMouseEnter`: set `focusRef.current = logoIndex`
- `onMouseLeave`: set `focusRef.current = null`

**Logo index mapping** (matches `LOGO_CONFIGS` order in `AnimatedBackground`):
| Index | Logo   | Source    |
|-------|--------|-----------|
| 0     | Claude | Anthropic |
| 1     | Gemini | Google    |
| 2     | Codex  | OpenAI    |

**Loading/error states:** While fetching, each card shows a subtle skeleton. If a source is null, its card shows "No recent news" placeholder.

## AnimatedBackground Update

**New prop:** `focusRef: React.RefObject<number | null>`

**Per-frame behavior (inside animation loop):**
- Read `focusRef.current` each frame — no re-renders triggered
- If a logo index is focused:
  - Lerp `camera.position.x` toward `LOGO_CONFIGS[index].baseX` (speed: 0.04)
  - Lerp `camera.position.z` toward 6.0 absolute (overrides scroll-driven Z target while focused, speed: 0.04)
  - Lerp focused logo opacity toward 0.55 (speed: 0.05)
  - Lerp other logos opacity toward 0.04 (speed: 0.05)
- If no logo is focused:
  - Lerp camera X back to 0 (speed: 0.04)
  - Lerp camera Z back to scroll-driven target (speed: 0.04)
  - Lerp all logos back to their base opacity (speed: 0.05)

Scroll-driven parallax continues to work — focus is additive on top of the scroll offsets.

## Data Flow

```
Server (RSS fetch + cache)
    ↓ /api/news (JSON)
NewsStrip (fetch on mount)
    ↓ onMouseEnter/Leave
focusRef (owned by Home)
    ↓ read each frame
AnimatedBackground (camera lerp)
```

## Out of Scope

- Storing news articles persistently (no DB, memory cache only)
- More than 1 article per source
- Auto-refresh on the client (fetch once on mount is sufficient given 30-min server cache)
- Admin controls for feed URLs
