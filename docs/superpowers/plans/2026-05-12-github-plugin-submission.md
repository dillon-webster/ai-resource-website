# GitHub Plugin Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Claude Code Plugin" as a resource category that auto-fills title, description, and star count from the GitHub API when a repo URL is pasted.

**Architecture:** A pure utility function parses GitHub repo URLs; the submit form calls it on URL blur, fetches the GitHub REST API client-side, and auto-fills the form. Two new optional fields (`stars`, `githubRepo`) are added to the Resource type and stored server-side. Plugin resource cards display a star count in the footer.

**Tech Stack:** GitHub REST API (unauthenticated), `node:test` + `tsx` for URL parser unit tests, React state for autofill UX.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `client/src/utils/parseGithubUrl.ts` | Pure function: URL string → `{owner, repo}` or `null` |
| Create | `client/src/utils/parseGithubUrl.test.ts` | Unit tests for URL parser |
| Modify | `client/src/types.ts` | Add `stars?`, `githubRepo?` to `Resource` |
| Modify | `server/storage.ts` | Add `stars?`, `githubRepo?` to `Resource` |
| Modify | `server/index.ts` | Accept + validate + store new fields in POST handler |
| Modify | `client/src/components/SubmitForm.tsx` | GitHub autofill logic + conditional URL label |
| Modify | `client/src/components/ResourceCard.tsx` | Star count in footer for plugin cards |

---

## Task 1: URL parser utility + tests

**Files:**
- Create: `client/src/utils/parseGithubUrl.ts`
- Create: `client/src/utils/parseGithubUrl.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `client/src/utils/parseGithubUrl.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseGithubRepo } from './parseGithubUrl.ts'

describe('parseGithubRepo', () => {
  it('parses a standard GitHub URL', () => {
    const result = parseGithubRepo('https://github.com/anthropics/claude-code')
    assert.deepEqual(result, { owner: 'anthropics', repo: 'claude-code' })
  })

  it('parses a URL with trailing slash', () => {
    const result = parseGithubRepo('https://github.com/owner/my-plugin/')
    assert.deepEqual(result, { owner: 'owner', repo: 'my-plugin' })
  })

  it('parses a URL with a path suffix', () => {
    const result = parseGithubRepo('https://github.com/owner/repo/tree/main')
    assert.deepEqual(result, { owner: 'owner', repo: 'repo' })
  })

  it('returns null for a non-GitHub URL', () => {
    const result = parseGithubRepo('https://openai.com/some-tool')
    assert.equal(result, null)
  })

  it('returns null for a bare GitHub URL with no repo', () => {
    const result = parseGithubRepo('https://github.com/owner')
    assert.equal(result, null)
  })

  it('returns null for an empty string', () => {
    const result = parseGithubRepo('')
    assert.equal(result, null)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/dillon/Code/Dixie Tech/ai-website/client" && npx tsx --test src/utils/parseGithubUrl.test.ts 2>&1
```

Expected: `Cannot find module './parseGithubUrl.ts'` — tests fail because the file doesn't exist yet.

- [ ] **Step 3: Create the parser utility**

Create `client/src/utils/parseGithubUrl.ts`:

```typescript
export function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/)
  if (!match) return null
  const repo = match[2].replace(/\/$/, '')
  if (!repo) return null
  return { owner: match[1], repo }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/dillon/Code/Dixie Tech/ai-website/client" && npx tsx --test src/utils/parseGithubUrl.test.ts 2>&1
```

Expected: All 6 tests pass with `✔` marks.

---

## Task 2: Extend Resource type

**Files:**
- Modify: `client/src/types.ts`
- Modify: `server/storage.ts`

- [ ] **Step 1: Update client types**

Open `client/src/types.ts`. Replace the `Resource` interface:

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
  stars?: number
  githubRepo?: string
}
```

- [ ] **Step 2: Update server storage type**

Open `server/storage.ts`. Replace the `Resource` interface:

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
  stars?: number
  githubRepo?: string
}
```

- [ ] **Step 3: Verify TypeScript compiles on both sides**

```bash
cd "/Users/dillon/Code/Dixie Tech/ai-website/client" && npx tsc --noEmit 2>&1
cd "/Users/dillon/Code/Dixie Tech/ai-website/server" && npx tsc --noEmit 2>&1
```

Expected: No errors from either command.

---

## Task 3: Update server POST handler

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Update the POST /api/resources handler**

Open `server/index.ts`. Find the POST handler body:

```typescript
  const { title, url, description, category, tags, submitterName } = req.body
```

Replace with:

```typescript
  const { title, url, description, category, tags, submitterName, stars, githubRepo } = req.body
```

Then find the `resource` object construction:

```typescript
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
```

Replace with:

```typescript
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
    stars: typeof stars === 'number' && stars >= 0 ? Math.floor(stars) : undefined,
    githubRepo: typeof githubRepo === 'string' && githubRepo.trim() ? githubRepo.trim() : undefined,
  }
```

- [ ] **Step 2: Verify the server compiles and the endpoint accepts new fields**

Restart the server if running, then:

```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; sleep 1
cd "/Users/dillon/Code/Dixie Tech/ai-website/server" && npx tsx index.ts &
sleep 2
curl -s -X POST http://localhost:3001/api/resources \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Plugin","url":"https://github.com/owner/repo","category":"Claude Code Plugin","stars":42,"githubRepo":"owner/repo"}' | python3 -m json.tool
kill %1 2>/dev/null
```

Expected: JSON response containing `"stars": 42` and `"githubRepo": "owner/repo"`.

---

## Task 4: Update SubmitForm with GitHub autofill

**Files:**
- Modify: `client/src/components/SubmitForm.tsx`

- [ ] **Step 1: Add the Claude Code Plugin category**

Find the CATEGORIES constant at the top of `client/src/components/SubmitForm.tsx`:

```typescript
const CATEGORIES = ['Article', 'Video', 'Tool', 'Tutorial', 'Paper', 'Other']
```

Replace with:

```typescript
const CATEGORIES = ['Article', 'Video', 'Tool', 'Tutorial', 'Paper', 'Claude Code Plugin', 'Other']
```

- [ ] **Step 2: Add stars, githubRepo, and fetchStatus state**

Find the component state declarations:

```typescript
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
```

Replace with:

```typescript
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [stars, setStars] = useState<number | undefined>(undefined)
  const [githubRepo, setGithubRepo] = useState<string | undefined>(undefined)
  const [githubStatus, setGithubStatus] = useState<'idle' | 'loading' | 'error'>('idle')
```

- [ ] **Step 3: Add the autofill handler**

First add the import at the top of `client/src/components/SubmitForm.tsx`, after the existing imports:

```typescript
import { parseGithubRepo } from '../utils/parseGithubUrl'
```

Then find the `handleChange` function and add the new handler after it (before `handleSubmit`):

```typescript
  async function handleUrlBlur() {
    if (form.category !== 'Claude Code Plugin') return
    const parsed = parseGithubRepo(form.url)
    if (!parsed) return

    setGithubStatus('loading')
    try {
      const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json() as {
        name: string
        description: string | null
        stargazers_count: number
        full_name: string
      }
      setForm((prev) => ({
        ...prev,
        title: data.name,
        description: data.description ?? '',
      }))
      setStars(data.stargazers_count)
      setGithubRepo(data.full_name)
      setGithubStatus('idle')
    } catch {
      setGithubStatus('error')
    }
  }
```

- [ ] **Step 4: Reset plugin state when category changes**

Find the `handleChange` function:

```typescript
  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (field === 'title' || field === 'url') {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    }
  }
```

Replace with:

```typescript
  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (field === 'title' || field === 'url') {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
      if (field === 'category') {
        setStars(undefined)
        setGithubRepo(undefined)
        setGithubStatus('idle')
      }
    }
  }
```

- [ ] **Step 5: Include stars and githubRepo in the submit payload**

Find the fetch call inside `handleSubmit`:

```typescript
        body: JSON.stringify(form),
```

Replace with:

```typescript
        body: JSON.stringify({ ...form, stars, githubRepo }),
```

- [ ] **Step 6: Update the URL field to show conditional label and feedback**

Find the URL field block:

```typescript
      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          URL <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.url}
          onChange={handleChange('url')}
          placeholder="https://..."
          className={`${inputBase} bg-white/5`}
        />
        {errors.url && <p className="mt-1 text-xs text-red-400">{errors.url}</p>}
      </div>
```

Replace with:

```typescript
      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          {form.category === 'Claude Code Plugin' ? 'GitHub Repo URL' : 'URL'}{' '}
          <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.url}
          onChange={handleChange('url')}
          onBlur={handleUrlBlur}
          placeholder={form.category === 'Claude Code Plugin' ? 'https://github.com/owner/repo' : 'https://...'}
          className={`${inputBase} bg-white/5`}
        />
        {errors.url && <p className="mt-1 text-xs text-red-400">{errors.url}</p>}
        {githubStatus === 'loading' && (
          <p className="mt-1 text-xs text-white/40">Fetching repo info...</p>
        )}
        {githubStatus === 'error' && (
          <p className="mt-1 text-xs text-white/40">Couldn't fetch repo info — fill in manually.</p>
        )}
        {githubStatus === 'idle' && githubRepo && (
          <p className="mt-1 text-xs text-[#7b2ff7]/80">✓ {githubRepo} · ★ {stars?.toLocaleString()}</p>
        )}
      </div>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd "/Users/dillon/Code/Dixie Tech/ai-website/client" && npx tsc --noEmit 2>&1
```

Expected: No errors.

---

## Task 5: Update ResourceCard with star count

**Files:**
- Modify: `client/src/components/ResourceCard.tsx`

- [ ] **Step 1: Add star count to the card footer**

Find the footer block at the bottom of the `article`:

```typescript
      <div className="flex items-center justify-between text-xs text-white/35 mt-auto pt-1">
        <span>{resource.submitterName ? `by ${resource.submitterName}` : ''}</span>
        <span>{timeAgo(resource.createdAt)}</span>
      </div>
```

Replace with:

```typescript
      <div className="flex items-center justify-between text-xs text-white/35 mt-auto pt-1">
        <span>{resource.submitterName ? `by ${resource.submitterName}` : ''}</span>
        <div className="flex items-center gap-3">
          {resource.stars !== undefined && resource.stars > 0 && (
            <span className="text-[#7b2ff7]/70">★ {resource.stars.toLocaleString()}</span>
          )}
          <span>{timeAgo(resource.createdAt)}</span>
        </div>
      </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/dillon/Code/Dixie Tech/ai-website/client" && npx tsc --noEmit 2>&1
```

Expected: No errors.

---

## Task 6: Manual integration test

- [ ] **Step 1: Start both servers**

Terminal 1:
```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; sleep 1
cd "/Users/dillon/Code/Dixie Tech/ai-website/server" && npx tsx index.ts
```

Terminal 2:
```bash
cd "/Users/dillon/Code/Dixie Tech/ai-website/client" && npx vite
```

- [ ] **Step 2: Test the submit flow**

Open `http://localhost:5173/submit` and verify:
1. "Claude Code Plugin" appears in the category dropdown
2. Selecting it changes the URL label to "GitHub Repo URL" and updates the placeholder
3. Paste `https://github.com/anthropics/anthropic-sdk-python` and click out of the field
4. Title auto-fills with `anthropic-sdk-python`, description fills with the repo description, and a `✓ anthropics/anthropic-sdk-python · ★ N` confirmation appears below the URL field
5. Title and description are editable after autofill
6. Submitting creates the resource and it appears on the home page with a star count in the card footer

- [ ] **Step 3: Test non-GitHub URL with Claude Code Plugin category**

Paste `https://example.com/something` into the URL field with Claude Code Plugin selected, then blur. Verify: "Couldn't fetch repo info — fill in manually." appears and no auto-fill occurs.

- [ ] **Step 4: Test category switch resets state**

Select "Claude Code Plugin", paste a valid GitHub URL, let it autofill. Then switch category to "Article". Verify the star confirmation message disappears and the stars/githubRepo are not sent on submission (submit the form and check the response doesn't include `stars`).
