# GitHub Plugin Submission — Design Spec
Date: 2026-05-12

## Overview

Add "Claude Code Plugin" as a resource category. When selected, the submit form accepts a GitHub repo URL and auto-fills the title and description from the GitHub REST API (client-side, no auth). Plugin cards on the home page display a star count and a direct GitHub link.

## Architecture

Four files change:

| File | Change |
|------|--------|
| `client/src/types.ts` | Add `stars?: number`, `githubRepo?: string` to `Resource` |
| `server/storage.ts` | Add `stars?: number`, `githubRepo?: string` to `Resource` |
| `server/index.ts` | Accept and store `stars` + `githubRepo` in POST handler |
| `client/src/components/SubmitForm.tsx` | GitHub autofill logic + conditional UI |
| `client/src/components/ResourceCard.tsx` | Plugin badge, star count, GitHub icon |

## Resource Type Extension

Two new optional fields added to the `Resource` interface in both `client/src/types.ts` and `server/storage.ts`:

```typescript
stars?: number       // GitHub stargazers_count at time of submission
githubRepo?: string  // "owner/repo" slug, e.g. "anthropics/claude-code"
```

## Server: POST /api/resources

Accept `stars` and `githubRepo` in the request body alongside existing fields. Validate that `stars` is a non-negative integer if present. Store both fields on the resource object.

No server-side GitHub fetch — data comes from the client.

## Submit Form: Autofill Behavior

**Category list:** Add `'Claude Code Plugin'` to the `CATEGORIES` array.

**Conditional URL field:** When `category === 'Claude Code Plugin'`:
- Label changes to "GitHub Repo URL"
- Placeholder: `https://github.com/owner/repo`

**Autofill trigger:** On URL input `onBlur`, if category is "Claude Code Plugin":
1. Parse URL with regex: `/github\.com\/([^/]+)\/([^/\s]+)/`
2. If match, fetch `https://api.github.com/repos/{owner}/{repo}`
3. Show inline loading state ("Fetching repo info...")
4. On success:
   - Auto-fill `title` with `data.name`
   - Auto-fill `description` with `data.description ?? ''`
   - Store `stars = data.stargazers_count` and `githubRepo = data.full_name` in component state
5. On failure (non-200, network error, rate limit):
   - Show inline message: "Couldn't fetch repo info — fill in manually"
   - Leave title/description empty for user to fill

**Edited fields:** Auto-filled title and description remain fully editable. User can override.

**Submit payload:** `stars` and `githubRepo` included in the JSON body alongside existing fields.

**Non-plugin categories:** No change to existing form behavior.

## ResourceCard: Plugin Display

When `resource.category === 'Claude Code Plugin'`:

- **Plugin badge:** Small `Plugin` label in the card header, styled with `text-[#7b2ff7]` and a matching border — distinct from the category tag color
- **GitHub icon link:** Top-right corner of the card, links to `https://github.com/{resource.githubRepo}`, opens in new tab. Only shown if `githubRepo` is present.
- **Star count:** Card footer shows `⭐ {stars}` if `stars` is present and > 0

All other card content (title, description, tags, submitter name, date) unchanged.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid GitHub URL format | No fetch attempted; no error shown |
| Repo not found (404) | "Couldn't fetch repo info — fill in manually" |
| Network error / timeout | "Couldn't fetch repo info — fill in manually" |
| GitHub rate limit (403/429) | "Couldn't fetch repo info — fill in manually" |
| `description` is null in API response | Auto-fills empty string; user fills manually |

## Out of Scope

- Server-side GitHub token / higher rate limits
- Refreshing star counts after submission (stars are snapshotted at submit time)
- Validating that the repo is actually a Claude Code plugin
- Moderating or approving plugin submissions
