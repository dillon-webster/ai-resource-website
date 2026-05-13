import { deleteDbResource, readDbResources, writeDbResource } from './dbStorage'
import { deleteJsonResource, readResources, writeResources, Resource } from './storage'

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
