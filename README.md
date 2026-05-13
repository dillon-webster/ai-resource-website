# AI Resource Website

A class resource-sharing web app for collecting helpful AI, programming, and learning links. Visitors can browse curated resources, submit new links, and open external resources in a new tab.

## Features

- Browse submitted resources in newest-first order
- Submit resources with title, URL, description, category, tags, and optional submitter name
- Client-side and server-side validation for required fields
- Category filtering on the home page
- Live AI news strip from Anthropic, Google AI, and OpenAI RSS feeds
- GitHub repo enrichment for Claude Code Plugin submissions
- Railway Postgres support for persistent hosted storage
- JSON file fallback for local development without a database
- Delete-only admin page for removing bad or test submissions

## Tech Stack

- React
- TypeScript
- React Router
- Tailwind CSS
- Express
- PostgreSQL on Railway
- Vite

## Project Structure

```text
client/               React frontend
server/               Express API and storage layer
server/data/          Local JSON seed/fallback data
server/db/schema.sql  Postgres table schema reference
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

The Vite app proxies `/api` requests to the local Express server on port `3001`.

## Storage

The app supports two storage modes:

- If `DATABASE_URL` is set, the server uses PostgreSQL.
- If `DATABASE_URL` is not set, the server uses `server/data/resources.json`.

On first startup with Postgres, the server creates the `resources` table if needed and seeds it from `server/data/resources.json` when the table is empty.

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

For persistent hosted submissions, add a Railway Postgres service and set `DATABASE_URL` on the web service.

To enable the admin page, add an `ADMIN_TOKEN` variable on the Railway web service. Visit `/admin`, enter that token, and delete resources from the public list.

## Useful Commands

Build the frontend:

```bash
npm run build
```

Start the production server locally:

```bash
npm start
```

Run the current test files:

```bash
cd server
npx tsx --test dbStorage.test.ts newsCache.test.ts ../client/src/utils/parseGithubUrl.test.ts
```
