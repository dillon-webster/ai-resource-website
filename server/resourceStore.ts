import { readDbResources, writeDbResource } from './dbStorage'
import { readResources, writeResources, Resource } from './storage'

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
