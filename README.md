# AI Resource Website

A full-stack resource-sharing web app for collecting useful AI, programming, and learning links. The site lets visitors browse curated resources, submit new links, vote on helpful entries, leave comments, and follow live AI news from major labs.

The project is built for a class-style resource hub: simple enough for students to use quickly, but complete enough to support persistent hosted data, moderation, and a polished frontend experience.

Live site: https://ai-resource-website-production.up.railway.app/

## Features

- Browse resources in newest-first order
- Filter resources by category
- Search resources by title, description, tags, category, or submitter
- Submit resources with title, URL, description, category, tags, and optional submitter name
- Client-side and server-side validation for required fields
- Upvote resources, with local duplicate-vote protection in the browser
- Add comments to resources
- Admin page for deleting bad resources or comments
- Live AI news strip from Anthropic, Google AI, and OpenAI
- Animated brand-colored background tied to the news cards
- GitHub repo enrichment for plugin submissions
- PostgreSQL support for hosted persistent storage
- JSON file fallback for local development without a database

## Tech Stack

- React
- TypeScript
- React Router
- Tailwind CSS
- Vite
- Express
- PostgreSQL
- Railway

## Project Structure

```text
client/               React frontend
client/src/           Pages, components, utilities, and styles
server/               Express API and storage layer
server/data/          Local JSON seed/fallback data
server/db/schema.sql  PostgreSQL schema reference
railway.toml          Railway build and deploy configuration
```

## Local Development

Install dependencies for both apps:

```bash
npm run install:all
```

Start the API server:

```bash
npm run dev:server
```

In another terminal, start the Vite frontend:

```bash
npm run dev:client
```

The frontend runs through Vite and proxies `/api` requests to the local Express server on port `3001`.

## Environment Variables

The app works without environment variables for local development, using the JSON fallback data file.

Optional variables:

```text
DATABASE_URL  PostgreSQL connection string. Enables database-backed storage.
ADMIN_TOKEN   Token used to access admin delete actions.
PORT          Server port. Defaults to 3001.
```

## Storage

The server supports two storage modes:

- If `DATABASE_URL` is set, the server uses PostgreSQL.
- If `DATABASE_URL` is not set, the server uses `server/data/resources.json`.

On first startup with PostgreSQL, the server creates the required tables and seeds resources from `server/data/resources.json` when the database is empty.

## API Overview

```text
GET    /api/resources
POST   /api/resources
POST   /api/resources/:id/vote
GET    /api/resources/:id/comments
POST   /api/resources/:id/comments
GET    /api/news
DELETE /api/admin/resources/:id
DELETE /api/admin/comments/:id
```

Admin routes require `ADMIN_TOKEN`.

## Verification

Build the frontend:

```bash
cd client
npm run build
```

Typecheck the server:

```bash
cd server
./node_modules/.bin/tsc --noEmit
```

Run the server test suite:

```bash
cd server
./node_modules/.bin/tsx --test *.test.ts
```

Current test coverage includes storage mapping, JSON resource deletion, admin token handling, comment mapping, GitHub URL parsing, and news feed parsing/fallback behavior.

## Railway Deployment

This project is configured for Railway with `railway.toml`.

Build command:

```bash
npm run install:all && npm run build
```

Start command:

```bash
npm start
```

Healthcheck path:

```text
/api/resources
```

For persistent hosted submissions, add a Railway PostgreSQL service and set `DATABASE_URL` on the web service.

To enable admin moderation, set `ADMIN_TOKEN` on the Railway web service. Visit `/admin`, enter that token, and delete resources or comments from the public list.

## Notes

- The app can run locally without PostgreSQL because of the JSON fallback.
- The live news strip depends on external Anthropic, Google AI, and OpenAI feeds/pages.
- A Vite bundle-size warning may appear during build because the frontend includes Three.js for the animated background. The build still succeeds.
