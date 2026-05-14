import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import { Resource, Comment } from './storage'

const DATA_FILE   = path.join(__dirname, 'data', 'resources.json')
const SCHEMA_FILE = path.join(__dirname, 'db', 'schema.sql')

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
  votes: number
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
  resource.votes = row.votes ?? 0
  return resource
}

async function ensureReady(): Promise<void> {
  if (!ready) {
    ready = initializeDatabase()
  }
  return ready
}

async function initializeDatabase(): Promise<void> {
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8')
  await pool.query(schema)
  await pool.query('ALTER TABLE resources ADD COLUMN IF NOT EXISTS votes integer NOT NULL DEFAULT 0')

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
        id, title, url, description, category, tags,
        submitter_name, created_at, stars, github_repo, votes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      resource.votes ?? 0,
    ],
  )
  return mapResourceRow(rows[0])
}

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

export async function incrementVoteDb(id: string): Promise<Resource | null> {
  await ensureReady()
  const { rows } = await pool.query<ResourceRow>(
    'UPDATE resources SET votes = votes + 1 WHERE id = $1 RETURNING *',
    [id],
  )
  return rows[0] ? mapResourceRow(rows[0]) : null
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

export async function deleteDbResource(id: string): Promise<boolean> {
  await ensureReady()
  const result = await pool.query('DELETE FROM resources WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}
