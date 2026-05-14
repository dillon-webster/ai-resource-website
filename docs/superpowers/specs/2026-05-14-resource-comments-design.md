# Resource Comments Design

**Date:** 2026-05-14  
**Status:** Approved

## Summary

Add inline comment threads to resource cards. Each card shows a comment count; clicking it expands a comment section directly below the card. Commenters provide a required first name. Admins can delete individual comments.

## Data Model

New `comments` table in Postgres:

```sql
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- `ON DELETE CASCADE` ensures comments are cleaned up when a resource is deleted.
- No separate migration tooling exists; the schema is applied via `server/db/schema.sql` at startup (same pattern as the `resources` table).

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/resources/:id/comments` | None | Returns comments for a resource, ordered oldest-first |
| POST | `/api/resources/:id/comments` | None (rate-limited) | Creates a comment |
| DELETE | `/api/admin/comments/:id` | Admin token | Deletes a comment |

**POST body:**
```json
{ "authorName": "Alex", "body": "Really useful resource!" }
```
Both fields required, non-empty strings. `authorName` max 50 chars, `body` max 1000 chars.

**Rate limiting:** POST comments uses the existing `submitLimiter` config (10 requests per 15 min per IP).

**GET response:**
```json
[
  {
    "id": "uuid",
    "resourceId": "uuid",
    "authorName": "Alex",
    "body": "Really useful resource!",
    "createdAt": "2026-05-14T12:00:00Z"
  }
]
```

## Frontend

### ResourceCard changes

- Add a `Comment` type to `client/src/types.ts`.
- Add a comment count button to the bottom row of `ResourceCard` alongside the existing vote button and timestamp. Shows `💬 N` where N is the total comment count (fetched with comments on first expand).
- State: `commentsOpen: boolean`, `comments: Comment[]`, `commentsLoaded: boolean`, `posting: boolean`.
- Comments load lazily — fetched only on first expand, not at page load.
- The expanded section renders below the card's existing content inside the same `<article>`.

### Comment list

Each comment shows:
- `authorName` (bold, small)
- `body`
- `timeAgo(createdAt)` (muted, xs)
- A trash icon button, visible only when `sessionStorage.getItem('ai-resource-admin-token')` is non-null (same key and storage used by the Admin page). Clicking it calls `DELETE /api/admin/comments/:id` with the `x-admin-token` header (URL-encoded value) and removes the comment from local state on success.

### Post form

Two inputs inside the expanded section:
- `First name` — text input, required, max 50 chars. Value persists in localStorage under key `ai-resource-commenter-name` so the user doesn't retype it.
- `Message` — textarea, required, max 1000 chars.
- `Post` button — disabled while `posting`. On success, appends the new comment to local state and clears the message field (name stays).

## Admin

Comment deletion uses the existing `requireAdmin` middleware and `adminLimiter` rate limiter. No new admin UI page needed — delete buttons appear inline on the card when the admin token is in localStorage, matching the pattern used by the Admin page (`sessionStorage` key `ai-resource-admin-token`, `x-admin-token` header).

## Server changes

- Add `saveComment`, `listComments`, `deleteComment` functions to `server/resourceStore.ts` (mirrors existing resource store pattern).
- Update `server/db/schema.sql` to include the `comments` table DDL.
- `server/dbStorage.ts` gets corresponding implementations.
- Three new routes added to `server/index.ts`.

## Out of scope

- No threading/replies — comments are flat.
- No upvoting comments.
- No email notifications.
- No standalone discussion board.
