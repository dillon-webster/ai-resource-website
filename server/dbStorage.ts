import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import { Resource } from './storage'

const DATA_FILE = path.join(__dirname, 'data', 'resources.json')

interface ResourceRow {
  id: string
  title: string
  url: string
  description: string | null
  category: string | null
  tags: string[] | null
  submitter_name: string | null
  created_at: Date | string
  stars: number | null
  github_repo: string | null
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

let ready: Promise<void> | null = null

export function mapResourceRow(row: ResourceRow): Resource {
  const resource: Resource = {
    id: row.id,
    title: row.title,
    url: row.url,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  }
  if (row.description) resource.description = row.description
  if (row.category) resource.category = row.category
  if (row.tags) resource.tags = row.tags
  if (row.submitter_name) resource.submitterName = row.submitter_name
  if (row.stars !== null) resource.stars = row.stars
  if (row.github_repo) resource.githubRepo = row.github_repo
  return resource
}

async function ensureReady(): Promise<void> {
  if (!ready) {
    ready = initializeDatabase()
  }
  return ready
}

async function initializeDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resources (
      id uuid PRIMARY KEY,
      title text NOT NULL,
      url text NOT NULL,
      description text,
      category text,
      tags text[],
      submitter_name text,
      created_at timestamptz NOT NULL DEFAULT now(),
      stars integer,
      github_repo text
    )
  `)

  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*) FROM resources')
  if (Number(rows[0]?.count ?? 0) > 0) return

  const seedResources = readSeedResources()
  for (const resource of seedResources.reverse()) {
    await insertResource(resource)
  }
}

function readSeedResources(): Resource[] {
  if (!fs.existsSync(DATA_FILE)) return []
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw) as Resource[]
}

async function insertResource(resource: Resource): Promise<Resource> {
  const { rows } = await pool.query<ResourceRow>(
    `
      INSERT INTO resources (
        id,
        title,
        url,
        description,
        category,
        tags,
        submitter_name,
        created_at,
        stars,
        github_repo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        url = EXCLUDED.url,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        submitter_name = EXCLUDED.submitter_name,
        created_at = EXCLUDED.created_at,
        stars = EXCLUDED.stars,
        github_repo = EXCLUDED.github_repo
      RETURNING *
    `,
    [
      resource.id,
      resource.title,
      resource.url,
      resource.description ?? null,
      resource.category ?? null,
      resource.tags ?? null,
      resource.submitterName ?? null,
      resource.createdAt,
      resource.stars ?? null,
      resource.githubRepo ?? null,
    ],
  )
  return mapResourceRow(rows[0])
}

export async function readDbResources(): Promise<Resource[]> {
  await ensureReady()
  const { rows } = await pool.query<ResourceRow>(
    'SELECT * FROM resources ORDER BY created_at DESC',
  )
  return rows.map(mapResourceRow)
}

export async function writeDbResource(resource: Resource): Promise<Resource> {
  await ensureReady()
  return insertResource(resource)
}
