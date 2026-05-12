# Resource Link Page — Design Spec
*Date: 2026-05-12*

## Overview

A web application for a single AI-tools class where students can submit and browse educational resource links. No authentication required. Hosted on Railway as a single service.

---

## Architecture

Single Railway service: Express backend serving the API and the built React client as static files.

```
/
├── server/
│   ├── index.ts              # Express entrypoint; serves /api/* and static client/dist
│   └── data/
│       └── resources.json    # Flat-file persistent storage
└── client/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.tsx          # Resource listing page
    │   │   └── Submit.tsx        # Submission form page
    │   ├── components/
    │   │   ├── AnimatedBackground.tsx  # Three.js 3D canvas
    │   │   ├── ResourceCard.tsx
    │   │   ├── SubmitForm.tsx
    │   │   └── Nav.tsx
    │   └── main.tsx
    └── vite.config.ts
```

**API:**
- `GET /api/resources` — returns all resources, sorted newest first
- `POST /api/resources` — validates and appends a new resource to resources.json

All other routes serve `client/dist/index.html` (SPA fallback).

**Tech stack:**
- Frontend: React + TypeScript + Tailwind CSS + React Router + Three.js
- Backend: Node.js + Express + TypeScript
- Storage: JSON file (`server/data/resources.json`)
- Build: Vite (client), ts-node or tsx (server)
- Hosting: Railway (single service)

---

## Pages & Navigation

### Navigation
Slim top nav on both pages:
- Left: site name/logo
- Right: "Submit a Resource" button linking to `/submit`

### Home Page (`/`)
- Full-screen Three.js 3D animated background (see Visual Design)
- Hero text overlay (site title)
- Grid of resource cards below, sorted newest first
- Empty state message if no resources yet

### Submit Page (`/submit`)
- Same dark navy base; static gradient background (no full 3D animation)
- Centered form card
- Inline validation errors and success feedback

---

## Data Model

```ts
interface Resource {
  id: string           // uuid v4
  title: string        // required
  url: string          // required
  description?: string
  category?: string    // one of the fixed categories below
  tags?: string[]      // parsed from comma-separated input
  submitterName?: string
  createdAt: string    // ISO 8601 timestamp
}
```

**Category options:** `Article`, `Video`, `Tool`, `Tutorial`, `Paper`, `Other`

Storage: `server/data/resources.json` — a JSON array of Resource objects. Read fully on each GET; on POST, read → prepend new resource → write full array back (acceptable at single-class scale).

---

## Visual Design

### Color Palette
| Token | Value | Usage |
|---|---|---|
| Navy dark | `#0a0f1e` | Canvas/page background |
| Navy mid | `#0d1b2a` | Card backgrounds |
| Orange | `#ff6b35` | Left-side wave particles |
| Amber | `#f7931e` | Left-side gradient blend |
| Blue | `#4361ee` | Right-side wave particles |
| Purple | `#7b2ff7` | Right-side gradient blend |
| White | `#ffffff` | Scattered particle dots, text |

### Three.js Animated Background (Home page only)
A full-viewport `<canvas>` rendered behind page content via `position: fixed; z-index: 0`.

**Scene composition:**
- Perspective camera with slight depth — scene feels 3D, not flat
- Particle field: thousands of small white dots flowing in a 3D wave pattern, color-shifted by x-position (orange/amber on left → blue/purple on right)
- Three floating logo sprites (Claude, Gemini, Codex): rendered as `THREE.Sprite` with their respective SVG/PNG logos, drifting slowly at different z-depths, low opacity (~0.15–0.25), gentle random drift paths
- Subtle continuous rotation of the overall scene on the y-axis to reinforce depth

**Submit page background:** Static CSS radial gradient using the same palette — no Three.js overhead.

### Resource Cards
- Semi-transparent dark background (`rgba(13, 27, 42, 0.85)`) with subtle border (`rgba(255,255,255,0.08)`)
- Soft blue/purple glow on hover
- Layout: title (bold), URL (truncated, opens new tab), description (if present), category chip + tag chips, submitter name (if present), relative timestamp

---

## Validation & Error Handling

### Client-side
- Title: non-empty string
- URL: matches `^https?://` pattern
- Errors shown inline below each field, cleared as user corrects them
- Form submit button disabled while a submission is in flight

### Server-side
- `POST /api/resources` returns `400` with `{ error: string }` if title or URL is missing/empty or URL fails format check
- Returns `201` with the created Resource object on success

### Submission flow
1. Client validates → shows inline errors if invalid, stops
2. POST to `/api/resources`
3. On `201`: show green success banner, clear form
4. On error: show red error banner with server message
5. Since submit and home are separate pages, the home page fetches fresh data on every mount — navigating back to `/` will show the new resource automatically

---

## Testing

Manual verification only (MVP for a single class):
- Form validation (empty title, invalid URL, blank submission)
- Successful submission → resource appears in listing
- External links open in new tab
- Three.js background renders in Chrome and Safari
- Mobile layout is usable (responsive grid)
