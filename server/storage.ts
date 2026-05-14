import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(__dirname, 'data', 'resources.json')

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
  votes?: number
}

export function readResources(): Resource[] {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8')
    return []
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw) as Resource[]
}

export function writeResources(resources: Resource[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2), 'utf-8')
}

export function removeResourceById(
  resources: Resource[],
  id: string,
): { resources: Resource[]; deleted: boolean } {
  const filtered = resources.filter((resource) => resource.id !== id)
  return {
    resources: filtered,
    deleted: filtered.length !== resources.length,
  }
}

export interface Comment {
  id: string
  resourceId: string
  authorName: string
  body: string
  createdAt: string
}

export function deleteJsonResource(id: string): boolean {
  const existing = readResources()
  const result = removeResourceById(existing, id)
  if (result.deleted) {
    writeResources(result.resources)
  }
  return result.deleted
}
