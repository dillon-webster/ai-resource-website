import { deleteDbResource, incrementVoteDb, readDbResources, writeDbResource, insertComment, selectComments, deleteCommentById } from './dbStorage'
import { deleteJsonResource, readResources, writeResources, Resource, Comment } from './storage'

const useDatabase = Boolean(process.env.DATABASE_URL)

export async function listResources(): Promise<Resource[]> {
  if (useDatabase) {
    return readDbResources()
  }
  return readResources()
}

export async function saveResource(resource: Resource): Promise<Resource> {
  if (useDatabase) {
    return writeDbResource(resource)
  }

  const existing = readResources()
  writeResources([resource, ...existing])
  return resource
}

export async function deleteResource(id: string): Promise<boolean> {
  if (useDatabase) {
    return deleteDbResource(id)
  }

  return deleteJsonResource(id)
}

export async function voteResource(id: string): Promise<Resource | null> {
  if (useDatabase) {
    return incrementVoteDb(id)
  }

  const resources = readResources()
  const resource = resources.find((r) => r.id === id)
  if (!resource) return null
  resource.votes = (resource.votes ?? 0) + 1
  writeResources(resources)
  return resource
}

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
