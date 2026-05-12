# Resource Link Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack resource link sharing app — React + Three.js frontend, Express + JSON storage backend — deployed as a single Railway service.

**Architecture:** Express server serves the REST API (`/api/resources`) and also serves the Vite-built React client as static files from `client/dist`. In development, Vite proxies `/api` to the local Express server. JSON flat-file storage is sufficient for a single class.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, React Router 6, Three.js, Express 4, uuid, tsx (runtime), Vite 5, Railway

---

## File Map

```
/
├── package.json                          # Root — build + start scripts for Railway
├── railway.toml                          # Railway deploy config
├── .gitignore
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.ts                          # Express app, routes, static serving
│   ├── storage.ts                        # Read/write resources.json
│   └── data/
│       └── resources.json               # Flat-file storage (empty array initially)
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts                    # Vite + /api proxy for dev
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx                      # React root mount
        ├── App.tsx                       # Router + layout shell
        ├── index.css                     # Tailwind directives + body base
        ├── types.ts                      # Shared Resource interface
        ├── pages/
        │   ├── Home.tsx                  # Resource listing + Three.js background
        │   └── Submit.tsx                # Submission form page
        ├── components/
        │   ├── Nav.tsx                   # Top nav bar
        │   ├── AnimatedBackground.tsx    # Three.js 3D canvas
        │   ├── ResourceCard.tsx          # Individual resource display
        │   └── SubmitForm.tsx            # Controlled form with validation
        └── public/
            └── logos/
                ├── claude.png
                ├── gemini.png
                └── codex.png
```

---

## Task 1: Scaffold the project

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "ai-resource-site",
  "private": true,
  "scripts": {
    "install:all": "cd client && npm install && cd ../server && npm install",
    "build": "cd client && npm run build",
    "start": "cd server && npx tsx index.ts",
    "dev:server": "cd server && npx tsx watch index.ts",
    "dev:client": "cd client && npm run dev"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
client/node_modules/
server/node_modules/
client/dist/
server/dist/
*.env
.DS_Store
```

- [ ] **Step 3: Create server/package.json**

```json
{
  "name": "ai-resource-site-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "npx tsx watch index.ts",
    "start": "npx tsx index.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 4: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "rootDir": "."
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create client/package.json**

```json
{
  "name": "ai-resource-site-client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "three": "^0.161.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@types/three": "^0.161.2",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.0"
  }
}
```

- [ ] **Step 6: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create client/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
```

- [ ] **Step 8: Create client/tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          dark: '#0a0f1e',
          mid: '#0d1b2a',
        },
        brand: {
          orange: '#ff6b35',
          amber: '#f7931e',
          blue: '#4361ee',
          purple: '#7b2ff7',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 9: Create client/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 10: Create client/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Resources</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 11: Install all dependencies**

```bash
npm run install:all
```

Expected: Both `client/node_modules` and `server/node_modules` populated with no errors.

- [ ] **Step 12: Commit**

```bash
git init
git add package.json .gitignore server/package.json server/tsconfig.json client/package.json client/tsconfig.json client/vite.config.ts client/tailwind.config.js client/postcss.config.js client/index.html
git commit -m "chore: scaffold project structure"
```

---

## Task 2: Server — storage layer

**Files:**
- Create: `server/data/resources.json`
- Create: `server/storage.ts`

- [ ] **Step 1: Create server/data/resources.json**

```json
[]
```

- [ ] **Step 2: Create server/storage.ts**

```typescript
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(__dirname, 'data', 'resources.json')

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

export function readResources(): Resource[] {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8')
    return []
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw) as Resource[]
}

export function writeResources(resources: Resource[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2), 'utf-8')
}
```

- [ ] **Step 3: Commit**

```bash
git add server/data/resources.json server/storage.ts
git commit -m "feat: add JSON flat-file storage layer"
```

---

## Task 3: Server — Express API

**Files:**
- Create: `server/index.ts`

- [ ] **Step 1: Create server/index.ts**

```typescript
import express from 'express'
import cors from 'cors'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { readResources, writeResources, Resource } from './storage'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/resources', (_req, res) => {
  const resources = readResources()
  res.json(resources)
})

app.post('/api/resources', (req, res) => {
  const { title, url, description, category, tags, submitterName } = req.body

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required.' })
  }
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return res.status(400).json({ error: 'A valid URL starting with http:// or https:// is required.' })
  }

  const resource: Resource = {
    id: uuidv4(),
    title: title.trim(),
    url: url.trim(),
    description: typeof description === 'string' && description.trim() ? description.trim() : undefined,
    category: typeof category === 'string' && category.trim() ? category.trim() : undefined,
    tags:
      typeof tags === 'string' && tags.trim()
        ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : undefined,
    submitterName: typeof submitterName === 'string' && submitterName.trim() ? submitterName.trim() : undefined,
    createdAt: new Date().toISOString(),
  }

  const existing = readResources()
  writeResources([resource, ...existing])

  return res.status(201).json(resource)
})

// Serve React app in production
const clientDist = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

- [ ] **Step 2: Start the server and manually test both endpoints**

In one terminal:
```bash
npm run dev:server
```
Expected output: `Server running on port 3001`

In another terminal:
```bash
curl http://localhost:3001/api/resources
```
Expected: `[]`

```bash
curl -X POST http://localhost:3001/api/resources \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Resource","url":"https://example.com","description":"A test"}'
```
Expected: `201` response with a Resource object including `id` and `createdAt`.

```bash
curl http://localhost:3001/api/resources
```
Expected: Array with one resource, newest first.

```bash
curl -X POST http://localhost:3001/api/resources \
  -H "Content-Type: application/json" \
  -d '{"title":"","url":"bad-url"}'
```
Expected: `400` with `{ "error": "Title is required." }`.

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat: add Express API with GET and POST /api/resources"
```

---

## Task 4: Client shell

**Files:**
- Create: `client/src/types.ts`
- Create: `client/src/index.css`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`

- [ ] **Step 1: Create client/src/types.ts**

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
```

- [ ] **Step 2: Create client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0a0f1e;
  color: #ffffff;
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 3: Create client/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 4: Create client/src/App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Submit from './pages/Submit'

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit" element={<Submit />} />
      </Routes>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/types.ts client/src/index.css client/src/main.tsx client/src/App.tsx
git commit -m "feat: add client shell with router and base styles"
```

---

## Task 5: Nav component

**Files:**
- Create: `client/src/components/Nav.tsx`

- [ ] **Step 1: Create client/src/components/Nav.tsx**

```tsx
import { Link } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-white/10">
      <Link
        to="/"
        className="text-lg font-bold tracking-tight text-white hover:text-[#4361ee] transition-colors"
      >
        AI Resources
      </Link>
      <Link
        to="/submit"
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-[#4361ee] to-[#7b2ff7] hover:opacity-90 transition-opacity"
      >
        Submit a Resource
      </Link>
    </nav>
  )
}
```

- [ ] **Step 2: Create placeholder pages so the dev server doesn't crash**

Create `client/src/pages/Home.tsx`:

```tsx
export default function Home() {
  return <div className="pt-24 text-center text-white/50">Home — coming soon</div>
}
```

Create `client/src/pages/Submit.tsx`:

```tsx
export default function Submit() {
  return <div className="pt-24 text-center text-white/50">Submit — coming soon</div>
}
```

- [ ] **Step 3: Start the client dev server and verify the nav renders**

Make sure `npm run dev:server` is still running on port 3001, then:

```bash
npm run dev:client
```

Open `http://localhost:5173`. Expected: dark navy page with top nav containing "AI Resources" on the left and "Submit a Resource" button on the right. Both links should navigate without a page reload.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Nav.tsx client/src/pages/Home.tsx client/src/pages/Submit.tsx
git commit -m "feat: add Nav component and placeholder pages"
```

---

## Task 6: Three.js animated background

**Files:**
- Create: `client/public/logos/claude.png`
- Create: `client/public/logos/gemini.png`
- Create: `client/public/logos/codex.png`
- Create: `client/src/components/AnimatedBackground.tsx`

- [ ] **Step 1: Add logo assets**

Create the directory `client/public/logos/` and place three PNG files:
- `claude.png` — Claude logo (download from Anthropic's brand kit or press page)
- `gemini.png` — Gemini logo (download from Google's brand resources)
- `codex.png` — Codex logo (download from OpenAI's brand resources)

Each logo should be a transparent-background PNG, roughly 200×200px or larger. The Three.js sprites will scale them down.

- [ ] **Step 2: Create client/src/components/AnimatedBackground.tsx**

```tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PARTICLE_COUNT = 4000

const LOGO_CONFIGS = [
  { src: '/logos/claude.png', baseX: -5.5, baseY: 1.5, z: -1, scale: 1.6, phase: 0 },
  { src: '/logos/gemini.png', baseX: 0.5, baseY: -1.8, z: 0.5, scale: 1.9, phase: (Math.PI * 2) / 3 },
  { src: '/logos/codex.png', baseX: 5.5, baseY: 1.0, z: -2, scale: 1.5, phase: (Math.PI * 4) / 3 },
]

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 8)

    // --- Particle wave ---
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const basePositions = new Float32Array(PARTICLE_COUNT * 3)

    const leftColor = new THREE.Color('#ff6b35')
    const midColor = new THREE.Color('#f7931e')
    const rightColor = new THREE.Color('#4361ee')
    const farRightColor = new THREE.Color('#7b2ff7')

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 22
      const z = (Math.random() - 0.5) * 12
      basePositions[i * 3] = x
      basePositions[i * 3 + 1] = 0
      basePositions[i * 3 + 2] = z
      positions[i * 3] = x
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = z

      const t = (x + 11) / 22
      let color: THREE.Color
      if (t < 0.5) {
        color = leftColor.clone().lerp(midColor, t * 2)
      } else {
        color = rightColor.clone().lerp(farRightColor, (t - 0.5) * 2)
      }
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // --- Logo sprites ---
    const textureLoader = new THREE.TextureLoader()
    const sprites: Array<THREE.Sprite & { _baseX: number; _baseY: number; _phase: number }> = []

    LOGO_CONFIGS.forEach((cfg) => {
      textureLoader.load(cfg.src, (texture) => {
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.22 })
        const sprite = new THREE.Sprite(mat) as THREE.Sprite & { _baseX: number; _baseY: number; _phase: number }
        sprite.position.set(cfg.baseX, cfg.baseY, cfg.z)
        sprite.scale.set(cfg.scale, cfg.scale, 1)
        sprite._baseX = cfg.baseX
        sprite._baseY = cfg.baseY
        sprite._phase = cfg.phase
        scene.add(sprite)
        sprites.push(sprite)
      })
    })

    // --- Resize handler ---
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // --- Animation loop ---
    let animId: number
    const posAttr = geometry.attributes.position as THREE.BufferAttribute

    const animate = (timestamp: number) => {
      animId = requestAnimationFrame(animate)
      const t = timestamp * 0.001

      // Wave: y = sin(x, time) + cos(z, time)
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = basePositions[i * 3]
        const z = basePositions[i * 3 + 2]
        posAttr.setY(i, Math.sin(x * 0.45 + t * 0.8) * 0.9 + Math.cos(z * 0.35 + t * 0.55) * 0.5)
      }
      posAttr.needsUpdate = true

      // Gentle y-axis rotation for 3D depth feel
      scene.rotation.y = Math.sin(t * 0.08) * 0.18

      // Logo drift — oscillate around base positions
      sprites.forEach((sprite) => {
        sprite.position.x = sprite._baseX + Math.sin(t * 0.25 + sprite._phase) * 0.9
        sprite.position.y = sprite._baseY + Math.cos(t * 0.18 + sprite._phase) * 0.6
      })

      renderer.render(scene, camera)
    }

    animId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  )
}
```

- [ ] **Step 3: Temporarily add AnimatedBackground to the Home placeholder to verify it renders**

Edit `client/src/pages/Home.tsx`:

```tsx
import AnimatedBackground from '../components/AnimatedBackground'

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 pt-24 text-center text-white/50">Home — coming soon</div>
    </div>
  )
}
```

Open `http://localhost:5173`. Expected: 3D particle wave flowing across the dark navy background, orange/amber on left bleeding to blue/purple on right, with the three AI logos drifting slowly at low opacity. The scene should have a subtle rocking 3D rotation.

- [ ] **Step 4: Commit**

```bash
git add client/public/logos/ client/src/components/AnimatedBackground.tsx client/src/pages/Home.tsx
git commit -m "feat: add Three.js 3D animated background with floating AI logos"
```

---

## Task 7: ResourceCard component

**Files:**
- Create: `client/src/components/ResourceCard.tsx`

- [ ] **Step 1: Create client/src/components/ResourceCard.tsx**

```tsx
import { Resource } from '../types'

interface Props {
  resource: Resource
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export default function ResourceCard({ resource }: Props) {
  return (
    <article
      className="rounded-xl p-5 border transition-all duration-300 hover:border-[#4361ee]/60 hover:shadow-[0_0_28px_rgba(67,97,238,0.18)] group flex flex-col gap-3"
      style={{
        background: 'rgba(13, 27, 42, 0.85)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div>
        <h2 className="text-base font-semibold text-white group-hover:text-[#4361ee] transition-colors leading-snug mb-1">
          {resource.title}
        </h2>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#4361ee]/80 hover:text-[#7b2ff7] transition-colors block truncate"
        >
          {resource.url}
        </a>
      </div>

      {resource.description && (
        <p className="text-sm text-white/55 leading-relaxed">{resource.description}</p>
      )}

      {(resource.category || (resource.tags && resource.tags.length > 0)) && (
        <div className="flex flex-wrap gap-1.5">
          {resource.category && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white/80 bg-[#4361ee]/20 border border-[#4361ee]/30">
              {resource.category}
            </span>
          )}
          {resource.tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full text-white/50 bg-white/5 border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-white/35 mt-auto pt-1">
        <span>{resource.submitterName ? `by ${resource.submitterName}` : ''}</span>
        <span>{timeAgo(resource.createdAt)}</span>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ResourceCard.tsx
git commit -m "feat: add ResourceCard component"
```

---

## Task 8: Home page

**Files:**
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Replace Home.tsx with the full listing page**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import ResourceCard from '../components/ResourceCard'
import { Resource } from '../types'

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/resources')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load resources.')
        return r.json() as Promise<Resource[]>
      })
      .then((data) => {
        setResources(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      <div className="relative z-10 pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-14">
            <h1 className="text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-[#ff6b35] via-white to-[#4361ee] bg-clip-text text-transparent">
              AI Resources
            </h1>
            <p className="text-white/50 text-lg">Community-curated links for the class</p>
          </div>

          {loading && (
            <p className="text-center text-white/35 text-sm">Loading resources...</p>
          )}

          {error && (
            <p className="text-center text-red-400 text-sm">{error}</p>
          )}

          {!loading && !error && resources.length === 0 && (
            <p className="text-center text-white/35 text-sm">
              No resources yet —{' '}
              <Link to="/submit" className="text-[#4361ee] hover:underline">
                submit the first one
              </Link>
              .
            </p>
          )}

          {!loading && !error && resources.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the Home page in the browser**

With `npm run dev:server` and `npm run dev:client` running:

1. Open `http://localhost:5173`. Expected: animated 3D background, gradient hero title "AI Resources", empty state message with a link to `/submit`.
2. Use curl to POST a resource (from Task 3, Step 2), then reload. Expected: one resource card appears in the grid.
3. Add 2–3 more resources via curl and confirm they appear newest-first in a responsive grid.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat: build Home page with resource grid and animated background"
```

---

## Task 9: SubmitForm component + Submit page

**Files:**
- Create: `client/src/components/SubmitForm.tsx`
- Modify: `client/src/pages/Submit.tsx`

- [ ] **Step 1: Create client/src/components/SubmitForm.tsx**

```tsx
import { useState } from 'react'
import { Resource } from '../types'

const CATEGORIES = ['Article', 'Video', 'Tool', 'Tutorial', 'Paper', 'Other']

interface FormState {
  title: string
  url: string
  description: string
  category: string
  tags: string
  submitterName: string
}

interface Errors {
  title?: string
  url?: string
}

interface Props {
  onSuccess: (resource: Resource) => void
}

const EMPTY_FORM: FormState = {
  title: '',
  url: '',
  description: '',
  category: '',
  tags: '',
  submitterName: '',
}

export default function SubmitForm({ onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  function validate(): Errors {
    const errs: Errors = {}
    if (!form.title.trim()) errs.title = 'Title is required.'
    if (!form.url.trim() || !/^https?:\/\//i.test(form.url.trim())) {
      errs.url = 'URL must start with http:// or https://'
    }
    return errs
  }

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (field === 'title' || field === 'url') {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMessage(null)
    setServerError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data: Resource | { error: string } = await res.json()

      if (!res.ok) {
        setServerError((data as { error: string }).error || 'Submission failed.')
      } else {
        onSuccess(data as Resource)
        setSuccessMessage('Resource submitted! Thanks for contributing.')
        setForm(EMPTY_FORM)
      }
    } catch {
      setServerError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase =
    'w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#4361ee]/60 focus:ring-1 focus:ring-[#4361ee]/40 transition'
  const inputBg = 'bg-white/5'
  const selectBg = 'bg-[#0d1b2a]'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {successMessage && (
        <div className="rounded-lg px-4 py-3 text-sm text-green-300 bg-green-500/10 border border-green-500/20">
          {successMessage}
        </div>
      )}
      {serverError && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={handleChange('title')}
          placeholder="e.g. Attention Is All You Need"
          className={`${inputBase} ${inputBg}`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          URL <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.url}
          onChange={handleChange('url')}
          placeholder="https://..."
          className={`${inputBase} ${inputBg}`}
        />
        {errors.url && <p className="mt-1 text-xs text-red-400">{errors.url}</p>}
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">Description</label>
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Brief summary of what this resource covers..."
          rows={3}
          className={`${inputBase} ${inputBg} resize-none`}
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">Category</label>
        <select
          value={form.category}
          onChange={handleChange('category')}
          className={`${inputBase} ${selectBg}`}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} style={{ background: '#0d1b2a' }}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          Tags{' '}
          <span className="text-white/30 text-xs">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={handleChange('tags')}
          placeholder="e.g. llm, transformers, paper"
          className={`${inputBase} ${inputBg}`}
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          Your Name{' '}
          <span className="text-white/30 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          value={form.submitterName}
          onChange={handleChange('submitterName')}
          placeholder="Anonymous"
          className={`${inputBase} ${inputBg}`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-[#4361ee] to-[#7b2ff7] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {submitting ? 'Submitting...' : 'Submit Resource'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Replace Submit.tsx with the full submit page**

```tsx
import { Resource } from '../types'
import SubmitForm from '../components/SubmitForm'

export default function Submit() {
  function handleSuccess(_resource: Resource) {
    // Success feedback is shown inline in the form
  }

  return (
    <div
      className="min-h-screen pt-24 pb-16 px-6"
      style={{
        background:
          'radial-gradient(ellipse at 15% 60%, rgba(255,107,53,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 40%, rgba(123,47,247,0.07) 0%, transparent 55%), #0a0f1e',
      }}
    >
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-white">Submit a Resource</h1>
        <p className="text-white/45 text-sm mb-8">Share something useful with the class.</p>
        <div
          className="rounded-2xl p-8 border border-white/10"
          style={{ background: 'rgba(13, 27, 42, 0.92)' }}
        >
          <SubmitForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the full submission flow**

With both dev servers running:

1. Navigate to `http://localhost:5173/submit`. Expected: centered form card on dark gradient background, all six fields visible.
2. Click Submit with no input. Expected: inline errors appear under Title and URL fields; no network request made.
3. Enter a title but type `not-a-url` in the URL field. Expected: URL error shown after clicking Submit.
4. Fill in Title (`Test Resource`) and URL (`https://example.com`) only, click Submit. Expected: green success banner, form clears.
5. Navigate to `http://localhost:5173/`. Expected: the submitted resource appears as a card in the grid.
6. Submit again with all fields populated (description, category, tags, name). Verify card shows all fields including chips and submitter name.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/SubmitForm.tsx client/src/pages/Submit.tsx
git commit -m "feat: add submission form with validation and Submit page"
```

---

## Task 10: Railway deployment

**Files:**
- Create: `railway.toml`

- [ ] **Step 1: Create railway.toml**

```toml
[build]
buildCommand = "npm run install:all && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/resources"
```

- [ ] **Step 2: Verify the production build locally**

```bash
npm run build
```

Expected: `client/dist/` is created with `index.html`, JS bundles, and assets.

```bash
npm start
```

Expected: `Server running on port 3001`

Open `http://localhost:3001`. Expected: full app loads (both home and submit pages), API works, no console errors. This is the same bundle Railway will serve.

- [ ] **Step 3: Commit and push**

```bash
git add railway.toml
git commit -m "chore: add Railway deployment config"
git push
```

- [ ] **Step 4: Deploy on Railway**

1. Go to [railway.app](https://railway.app) and create a new project.
2. Connect your GitHub repo.
3. Railway will detect `railway.toml` and run the build + start commands automatically.
4. Once deployed, open the Railway-provided URL and verify the full app works end-to-end.

**Note on persistence:** Railway's default filesystem is ephemeral on hobby plans — `resources.json` will reset on redeploy. To make it persistent, add a Railway **Volume** mounted at `server/data/` in the Railway dashboard (Settings → Volumes). This is a one-time setup after first deploy.

---

## Manual Verification Checklist

Run through these after the Railway deploy is live:

- [ ] Home page loads with 3D animated background (Chrome + Safari)
- [ ] Three logos drift visibly in the background at low opacity
- [ ] Orange-to-blue color gradient across the particle field
- [ ] Resource grid is empty with a link to /submit on first load
- [ ] Submit form: empty title → inline error, no request sent
- [ ] Submit form: invalid URL → inline error, no request sent
- [ ] Valid submission → green banner, form clears
- [ ] Navigate back to home → new resource card visible
- [ ] Resource card: clicking URL opens in new tab
- [ ] Category chip and tags chips render correctly
- [ ] Submitter name and timestamp display at card bottom
- [ ] Nav links work on both pages
- [ ] Mobile layout: cards stack to single column on narrow screens
