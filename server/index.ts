import express from 'express'
import cors from 'cors'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { readResources, writeResources, Resource } from './storage'
import { getNews } from './newsCache'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/resources', (_req, res) => {
  const resources = readResources()
  res.json(resources)
})

app.post('/api/resources', (req, res) => {
  const { title, url, description, category, tags, submitterName } = req.body

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
  }

  const existing = readResources()
  writeResources([resource, ...existing])

  return res.status(201).json(resource)
})

app.get('/api/news', async (_req, res) => {
  try {
    const items = await getNews()
    res.json(items)
  } catch {
    res.status(500).json({ error: 'Failed to fetch news.' })
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
