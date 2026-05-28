import express from 'express'
import cors from 'cors'
import path from 'path'
import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import rateLimit from 'express-rate-limit'
import { Resource, Comment } from './storage'
import { deleteResource, listResources, saveResource, voteResource, listComments, saveComment, deleteComment } from './resourceStore'
import { getNews, getEcosystemNews } from './newsCache'
import { getAdminToken } from './adminAuth'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
})

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many votes. Please try again later.' },
})

const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many comments. Please try again later.' },
})

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken) {
    return res.status(503).json({ error: 'Admin actions are not configured.' })
  }
  if (getAdminToken(req) !== adminToken) {
    return res.status(401).json({ error: 'Invalid admin token.' })
  }
  return next()
}

app.get('/api/resources', async (_req, res) => {
  try {
    const resources = await listResources()
    res.json(resources)
  } catch {
    res.status(500).json({ error: 'Failed to load resources.' })
  }
})

app.post('/api/resources', submitLimiter, async (req, res) => {
  const { title, url, description, category, tags, submitterName, stars, githubRepo } = req.body

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
    stars: typeof stars === 'number' && stars >= 0 ? Math.floor(stars) : undefined,
    githubRepo: typeof githubRepo === 'string' && githubRepo.trim() ? githubRepo.trim() : undefined,
  }

  try {
    const savedResource = await saveResource(resource)
    return res.status(201).json(savedResource)
  } catch {
    return res.status(500).json({ error: 'Failed to save resource.' })
  }
})

app.post('/api/resources/:id/vote', voteLimiter, async (req, res) => {
  try {
    const resource = await voteResource(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found.' })
    return res.json({ votes: resource.votes })
  } catch {
    return res.status(500).json({ error: 'Failed to record vote.' })
  }
})

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

app.delete('/api/admin/resources/:id', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteResource(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Resource not found.' })
    }
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Failed to delete resource.' })
  }
})

app.get('/api/news', async (_req, res) => {
  try {
    const items = await getNews()
    res.json(items)
  } catch {
    res.status(500).json({ error: 'Failed to fetch news.' })
  }
})

app.get('/api/news/ecosystem', async (_req, res) => {
  try {
    const items = await getEcosystemNews()
    res.json(items)
  } catch {
    res.status(500).json({ error: 'Failed to fetch ecosystem news.' })
  }
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
