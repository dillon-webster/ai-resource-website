# Mobile Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a touch-friendly mobile homepage while preserving the existing desktop news and animated background experience.

**Architecture:** Add responsive branches inside the existing React components instead of introducing new routes or state containers. `NewsStrip` renders a mobile tab layout below `sm` and the current hover-card grid at `sm` and above. `AnimatedBackground` keeps the desktop scene unchanged and applies mobile-specific logo coordinates, scales, and opacity targets at runtime.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Three.js, Vite.

---

## File Structure

- Modify `client/src/components/NewsStrip.tsx`: add selected mobile tab state, render mobile segmented tabs, and hide the desktop hover cards on mobile.
- Modify `client/src/components/AnimatedBackground.tsx`: add mobile logo configuration and disable focus camera/logo behavior on small screens.
- Modify `client/src/pages/Home.tsx`: tighten mobile top padding, heading size, and margins while preserving desktop classes.
- Verify with `npm run build` from the repository root.

### Task 1: Mobile News Tabs

**Files:**
- Modify: `client/src/components/NewsStrip.tsx`

- [ ] **Step 1: Add selected-source state and first-available default**

Add `selectedSource` state initialized to `anthropic`. After news loads, choose the first source with at least one article, falling back to `anthropic`.

```tsx
const [selectedSource, setSelectedSource] = useState<NewsSource['source']>('anthropic')

useEffect(() => {
  const firstWithArticles = sources.find((source) => source?.articles?.length)?.source
  if (firstWithArticles) setSelectedSource(firstWithArticles)
}, [sources])
```

- [ ] **Step 2: Render mobile segmented tabs**

Before the desktop grid, render a `sm:hidden` block with a three-button tab row and a single selected source article list.

```tsx
const selectedConfig = SOURCE_CONFIG[selectedSource]
const selectedData = sources.find((s) => s?.source === selectedSource) ?? null
const selectedArticles = selectedData?.articles ?? []
```

The selected tab button uses the source color for border and background accent. Article links are vertical rows with title and date.

- [ ] **Step 3: Preserve desktop hover cards**

Wrap the existing three-card grid in `hidden sm:grid`. Keep existing `onMouseEnter`, `onMouseLeave`, absolute extra article dropdown, and focus behavior unchanged for desktop.

### Task 2: Mobile Background Composition

**Files:**
- Modify: `client/src/components/AnimatedBackground.tsx`

- [ ] **Step 1: Add mobile logo config**

Add mobile-specific base positions and scales alongside the current desktop `LOGO_CONFIGS`.

```ts
const MOBILE_LOGO_CONFIGS = [
  { baseX: -1.7, baseY: 2.4, scale: 1.15 },
  { baseX: 1.45, baseY: 0.55, scale: 1.22 },
  { baseX: -0.9, baseY: -2.05, scale: 1.05 },
]
```

- [ ] **Step 2: Track mobile viewport state**

Inside the Three.js effect, maintain `isMobileRef` based on `window.innerWidth < 640` and update it on resize before resizing the renderer.

```ts
const isMobileRef = { current: window.innerWidth < 640 }

const onResize = () => {
  isMobileRef.current = window.innerWidth < 640
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
```

- [ ] **Step 3: Apply mobile logo positions and opacity**

When creating sprites, keep the desktop base fields. During animation, if `isMobileRef.current` is true, use the mobile config for position/scale and ignore `focusRef.current`.

```ts
const effectiveFocusedIdx = isMobileRef.current ? null : focusRef.current
const mobileCfg = MOBILE_LOGO_CONFIGS[i]
const baseX = isMobileRef.current ? mobileCfg.baseX : sp._baseX
const baseY = isMobileRef.current ? mobileCfg.baseY : sp._baseY
const targetScale = isMobileRef.current ? mobileCfg.scale : LOGO_CONFIGS[i].scale
const targetOpacity = isMobileRef.current ? lerp(0.11, 0.05, scrollProgress) : desktopTargetOpacity
```

Use `effectiveFocusedIdx` for camera and ribbon focus so mobile taps never zoom the camera into a single logo.

### Task 3: Mobile Homepage Spacing

**Files:**
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Reduce mobile vertical space**

Update the homepage wrapper and hero classes:

```tsx
<div className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16">
  <div className="text-center mb-7 sm:mb-10 px-5 sm:px-6">
    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2 sm:mb-3 ...">
```

- [ ] **Step 2: Keep desktop spacing intact**

Retain the existing `lg:px-10`, desktop grid, and sidebar behavior. Only add mobile-first classes where the current mobile spacing is too loose.

### Task 4: Verification

**Files:**
- Read: build output only

- [ ] **Step 1: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build complete without errors.

- [ ] **Step 2: Inspect changed files**

Run:

```bash
git diff -- client/src/components/NewsStrip.tsx client/src/components/AnimatedBackground.tsx client/src/pages/Home.tsx
```

Expected: desktop code remains present, mobile branches are isolated with responsive classes and viewport checks.
