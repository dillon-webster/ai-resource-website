# Resource Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline comment threads to resource cards — each card shows a toggle button; clicking it expands a comment section with a lazy-loaded list, a post form (required first name, persisted in localStorage), and admin delete buttons.

**Architecture:** New `comments` Postgres table with a FK to `resources`. Three new API routes follow the existing Express/resourceStore/dbStorage pattern. The `ResourceCard` component gains comment state and an inline expand section; no new routes or pages are needed.

**Tech Stack:** Node.js/Express (server), PostgreSQL via `pg`, React + TypeScript + Tailwind (client), Node built-in `node:test` runner.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `server/db/schema.sql` | Add `comments` table DDL |
| Modify | `server/storage.ts` | Export `Comment` interface |
| Modify | `server/dbStorage.ts` | `CommentRow` type, `mapCommentRow`, `insertComment`, `selectComments`, `deleteCommentById` |
| Create | `server/dbComments.test.ts` | Unit tests for `mapCommentRow` |
| Modify | `server/resourceStore.ts` | `listComments`, `saveComment`, `deleteComment` dispatch functions |
| Modify | `server/index.ts` | `commentLimiter` + 3 comment routes, import `Comment` |
| Modify | `client/src/types.ts` | Export `Comment` interface |
| Modify | `client/src/components/ResourceCard.tsx` | Comment toggle, lazy fetch, list, post form, admin delete |

---

## Task 1: Add comments table to schema

**Files:**
- Modify: `server/db/schema.sql`

- [ ] **Step 1: Add the comments DDL**

Append to `server/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Commit**

```bash
git add server/db/schema.sql
git commit -m "feat: add comments table to schema"
```

---

## Task 2: Comment interface, DB functions, and tests

**Files:**
- Modify: `server/storage.ts`
- Modify: `server/dbStorage.ts`
- Create: `server/dbComments.test.ts`

- [ ] **Step 1: Add the Comment interface to storage.ts**

Add this block after the `Resource` interface in `server/storage.ts`:

```typescript
export interface Comment {
  id: string
  resourceId: string
  authorName: string
  body: string
  createdAt: string
}
```

- [ ] **Step 2: Write the failing test**

Create `server/dbComments.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapCommentRow } from './dbStorage'

describe('mapCommentRow', () => {
  it('maps a DB row to a Comment with camelCase fields', () => {
    const row = {
      id: 'abc',
      resource_id: 'def',
      author_name: 'Alex',
      body: 'Great resource!',
      created_at: new Date('2026-05-14T12:00:00Z'),
    }
    const result = mapCommentRow(row)
    assert.deepEqual(result, {
      id: 'abc',
      resourceId: 'def',
      authorName: 'Alex',
      body: 'Great resource!',
      createdAt: '2026-05-14T12:00:00.000Z',
    })
  })

  it('accepts a string created_at', () => {
    const row = {
      id: 'abc',
      resource_id: 'def',
      author_name: 'Alex',
      body: 'Great!',
      created_at: '2026-05-14T12:00:00Z',
    }
    const result = mapCommentRow(row)
    assert.equal(result.createdAt, '2026-05-14T12:00:00.000Z')
  })
})
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
cd server && npx tsx --test dbComments.test.ts
```

Expected: error — `mapCommentRow is not exported` (or similar).

- [ ] **Step 4: Add CommentRow, mapCommentRow, and DB functions to dbStorage.ts**

Add the following after the existing `ResourceRow` interface and `mapResourceRow` function in `server/dbStorage.ts`:

```typescript
interface CommentRow {
  id: string
  resource_id: string
  author_name: string
  body: string
  created_at: Date | string
}

export function mapCommentRow(row: CommentRow): Comment {
  return {
    id: row.id,
    resourceId: row.resource_id,
    authorName: row.author_name,
    body: row.body,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  }
}

export async function insertComment(comment: Comment): Promise<Comment> {
  await ensureReady()
  const { rows } = await pool.query<CommentRow>(
    `INSERT INTO comments (id, resource_id, author_name, body, created_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [comment.id, comment.resourceId, comment.authorName, comment.body, comment.createdAt],
  )
  return mapCommentRow(rows[0])
}

export async function selectComments(resourceId: string): Promise<Comment[]> {
  await ensureReady()
  const { rows } = await pool.query<CommentRow>(
    `SELECT * FROM comments WHERE resource_id = $1 ORDER BY created_at ASC`,
    [resourceId],
  )
  return rows.map(mapCommentRow)
}

export async function deleteCommentById(id: string): Promise<boolean> {
  await ensureReady()
  const result = await pool.query('DELETE FROM comments WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}
```

Also add `Comment` to the import from `./storage` at the top of `server/dbStorage.ts`:

```typescript
import { Resource, Comment } from './storage'
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
cd server && npx tsx --test dbComments.test.ts
```

Expected output:
```
▶ mapCommentRow
  ✔ maps a DB row to a Comment with camelCase fields
  ✔ accepts a string created_at
✔ mapCommentRow
ℹ pass 2
ℹ fail 0
```

- [ ] **Step 6: Commit**

```bash
git add server/storage.ts server/dbStorage.ts server/dbComments.test.ts
git commit -m "feat: add Comment interface and DB functions"
```

---

## Task 3: Resource store dispatch + API routes

**Files:**
- Modify: `server/resourceStore.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Add comment dispatch functions to resourceStore.ts**

Add these imports at the top of `server/resourceStore.ts` (merge into the existing `dbStorage` import line):

```typescript
import { deleteDbResource, incrementVoteDb, readDbResources, writeDbResource, insertComment, selectComments, deleteCommentById } from './dbStorage'
import { deleteJsonResource, readResources, writeResources, Resource, Comment } from './storage'
```

Then append these functions at the bottom of `server/resourceStore.ts`:

```typescript
export async function listComments(resourceId: string): Promise<Comment[]> {
  if (!useDatabase) return []
  return selectComments(resourceId)
}

export async function saveComment(comment: Comment): Promise<Comment> {
  if (!useDatabase) throw new Error('Comments require a database connection.')
  return insertComment(comment)
}

export async function deleteComment(id: string): Promise<boolean> {
  if (!useDatabase) return false
  return deleteCommentById(id)
}
```

- [ ] **Step 2: Add routes to index.ts**

Add `Comment` to the storage import and the new comment functions to the resourceStore import in `server/index.ts`:

```typescript
import { Resource, Comment } from './storage'
import { deleteResource, listResources, saveResource, voteResource, listComments, saveComment, deleteComment } from './resourceStore'
```

Add the `commentLimiter` after the existing `voteLimiter` in `server/index.ts`:

```typescript
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many comments. Please try again later.' },
})
```

Add these three routes after the existing vote route (`app.post('/api/resources/:id/vote', ...)`):

```typescript
app.get('/api/resources/:id/comments', async (req, res) => {
  try {
    const comments = await listComments(req.params.id)
    res.json(comments)
  } catch {
    res.status(500).json({ error: 'Failed to load comments.' })
  }
})

app.post('/api/resources/:id/comments', commentLimiter, async (req, res) => {
  const { authorName, body } = req.body as { authorName?: unknown; body?: unknown }

  if (!authorName || typeof authorName !== 'string' || authorName.trim() === '') {
    return res.status(400).json({ error: 'First name is required.' })
  }
  if (authorName.trim().length > 50) {
    return res.status(400).json({ error: 'First name must be 50 characters or fewer.' })
  }
  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'Message is required.' })
  }
  if (body.trim().length > 1000) {
    return res.status(400).json({ error: 'Message must be 1000 characters or fewer.' })
  }

  const comment: Comment = {
    id: uuidv4(),
    resourceId: req.params.id,
    authorName: authorName.trim(),
    body: body.trim(),
    createdAt: new Date().toISOString(),
  }

  try {
    const saved = await saveComment(comment)
    return res.status(201).json(saved)
  } catch {
    return res.status(500).json({ error: 'Failed to save comment.' })
  }
})

app.delete('/api/admin/comments/:id', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteComment(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Comment not found.' })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Failed to delete comment.' })
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add server/resourceStore.ts server/index.ts
git commit -m "feat: add comment API routes"
```

---

## Task 4: Client Comment type

**Files:**
- Modify: `client/src/types.ts`

- [ ] **Step 1: Add Comment to client types**

Append to `client/src/types.ts`:

```typescript
export interface Comment {
  id: string
  resourceId: string
  authorName: string
  body: string
  createdAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/types.ts
git commit -m "feat: add Comment type to client"
```

---

## Task 5: ResourceCard with inline comments

**Files:**
- Modify: `client/src/components/ResourceCard.tsx`

- [ ] **Step 1: Replace ResourceCard.tsx with the full updated version**

Replace the entire contents of `client/src/components/ResourceCard.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Resource, Comment } from '../types'

const VOTED_KEY = 'ai-resource-voted-ids'
const NEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000
const COMMENTER_NAME_KEY = 'ai-resource-commenter-name'
const ADMIN_TOKEN_KEY = 'ai-resource-admin-token'

interface Props {
  resource: Resource
  index: number
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

function getVotedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveVotedId(id: string) {
  const ids = getVotedIds()
  ids.add(id)
  localStorage.setItem(VOTED_KEY, JSON.stringify([...ids]))
}

export default function ResourceCard({ resource, index }: Props) {
  const cardRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [votes, setVotes] = useState(resource.votes ?? 0)
  const [hasVoted, setHasVoted] = useState(() => getVotedIds().has(resource.id))
  const [voting, setVoting] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [posting, setPosting] = useState(false)
  const [commentName, setCommentName] = useState(() => localStorage.getItem(COMMENTER_NAME_KEY) ?? '')
  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY)

  const isNew = Date.now() - new Date(resource.createdAt).getTime() < NEW_THRESHOLD_MS

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setIsVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  async function handleVote() {
    if (hasVoted || voting) return
    setVoting(true)
    setVotes((v) => v + 1)
    setHasVoted(true)
    saveVotedId(resource.id)
    try {
      const res = await fetch(`/api/resources/${resource.id}/vote`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as { votes: number }
        setVotes(data.votes)
      } else {
        setVotes((v) => v - 1)
        setHasVoted(false)
      }
    } catch {
      setVotes((v) => v - 1)
      setHasVoted(false)
    } finally {
      setVoting(false)
    }
  }

  async function fetchComments() {
    try {
      const res = await fetch(`/api/resources/${resource.id}/comments`)
      if (res.ok) setComments(await res.json() as Comment[])
    } finally {
      setCommentsLoaded(true)
    }
  }

  function toggleComments() {
    setCommentsOpen((prev) => {
      if (!prev && !commentsLoaded) void fetchComments()
      return !prev
    })
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setCommentError(null)
    const trimmedName = commentName.trim()
    const trimmedBody = commentBody.trim()
    if (!trimmedName || !trimmedBody) return
    setPosting(true)
    try {
      const res = await fetch(`/api/resources/${resource.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: trimmedName, body: trimmedBody }),
      })
      const data = await res.json().catch(() => null) as Comment | { error?: string } | null
      if (res.ok && data) {
        setComments((prev) => [...prev, data as Comment])
        setCommentBody('')
        localStorage.setItem(COMMENTER_NAME_KEY, trimmedName)
      } else {
        setCommentError((data as { error?: string } | null)?.error ?? 'Failed to post.')
      }
    } catch {
      setCommentError('Failed to post.')
    } finally {
      setPosting(false)
    }
  }

  async function handleDeleteComment(id: string) {
    if (!adminToken) return
    setDeletingCommentId(id)
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': encodeURIComponent(adminToken) },
      })
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeletingCommentId(null)
    }
  }

  return (
    <article
      ref={cardRef}
      className={`rounded-xl p-5 border transition-all duration-500 ease-out hover:border-[#4F76F6]/60 hover:shadow-[0_0_28px_rgba(79,118,246,0.18)] group flex flex-col gap-3 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{
        background: 'rgba(31, 43, 55, 0.95)',
        borderColor: 'rgba(255,255,255,0.08)',
        transitionDelay: isVisible ? `${Math.min(index % 3, 2) * 70}ms` : '0ms',
      }}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-base font-semibold text-white group-hover:text-[#4F76F6] transition-colors leading-snug">
            {resource.title}
          </h2>
          {isNew && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#77F2A1]/15 text-[#77F2A1] border border-[#77F2A1]/30">
              New
            </span>
          )}
        </div>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#4F76F6]/80 hover:text-[#77F2A1] transition-colors block truncate"
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
            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white/80 bg-[#4F76F6]/20 border border-[#4F76F6]/30">
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
        <div className="flex items-center gap-3">
          {resource.stars !== undefined && resource.stars > 0 && (
            <span className="text-[#77F2A1]/70">★ {resource.stars.toLocaleString()}</span>
          )}
          <button
            onClick={handleVote}
            disabled={hasVoted || voting}
            title={hasVoted ? 'Already voted' : 'Upvote'}
            className={`flex items-center gap-1 transition-colors ${
              hasVoted
                ? 'text-[#77F2A1]/80 cursor-default'
                : 'hover:text-[#77F2A1] cursor-pointer'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1L11 7H7.5V11H4.5V7H1L6 1Z" />
            </svg>
            <span>{votes}</span>
          </button>
          <button
            onClick={toggleComments}
            title={commentsOpen ? 'Hide comments' : 'Show comments'}
            className={`flex items-center gap-1 transition-colors cursor-pointer ${
              commentsOpen ? 'text-[#4F76F6]' : 'hover:text-[#4F76F6]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M1 1.5h10v6.5H7L4.5 11V8H1V1.5z" />
            </svg>
            {commentsLoaded && <span>{comments.length}</span>}
          </button>
          <span>{timeAgo(resource.createdAt)}</span>
        </div>
      </div>

      {commentsOpen && (
        <div className="border-t border-white/[0.08] pt-3 mt-1 flex flex-col gap-3">
          {!commentsLoaded && (
            <p className="text-xs text-white/30">Loading comments…</p>
          )}

          {commentsLoaded && comments.length === 0 && (
            <p className="text-xs text-white/30">No comments yet.</p>
          )}

          {commentsLoaded && comments.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold text-white/70">{comment.authorName}</span>
                      <span className="text-[10px] text-white/25">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{comment.body}</p>
                  </div>
                  {adminToken && (
                    <button
                      onClick={() => void handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                      title="Delete comment"
                      className="shrink-0 mt-0.5 text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={(e) => void handlePost(e)} className="flex flex-col gap-2 mt-1">
            <input
              type="text"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="First name *"
              maxLength={50}
              className="w-full px-2.5 py-1.5 rounded text-xs text-white placeholder-white/25 bg-white/5 border border-white/10 focus:outline-none focus:border-[#4F76F6]/60 focus:ring-1 focus:ring-[#4F76F6]/40 transition"
            />
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Leave a comment…"
              maxLength={1000}
              rows={2}
              className="w-full px-2.5 py-1.5 rounded text-xs text-white placeholder-white/25 bg-white/5 border border-white/10 focus:outline-none focus:border-[#4F76F6]/60 focus:ring-1 focus:ring-[#4F76F6]/40 transition resize-none"
            />
            {commentError && <p className="text-xs text-red-400">{commentError}</p>}
            <button
              type="submit"
              disabled={posting || !commentName.trim() || !commentBody.trim()}
              className="self-end px-3 py-1.5 rounded text-xs font-medium text-[#1F2B37] bg-[#77F2A1] hover:opacity-90 disabled:opacity-40 transition"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </form>
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 2: Build the client to confirm no TypeScript errors**

```bash
cd client && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Smoke test manually**

Start the dev server:
```bash
# terminal 1
cd server && npx tsx watch index.ts

# terminal 2
cd client && npm run dev
```

Open `http://localhost:5173`. On any resource card:
1. Click the chat bubble icon — comment section expands, shows "No comments yet."
2. Enter a first name and a message, click Post — comment appears immediately.
3. Click the chat bubble again — section collapses. Click again — comment count shows `1`, previous comment is still there (no re-fetch).
4. Refresh the page, expand the same card — comment persists from the DB.
5. In a new browser tab, open `http://localhost:5173/admin`, enter the admin token, then go back to the home page — trash icons appear on each comment.
6. Click a trash icon — comment disappears.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ResourceCard.tsx
git commit -m "feat: add inline comments to resource cards"
```
