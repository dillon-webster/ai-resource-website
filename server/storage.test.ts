import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { removeResourceById, Resource } from './storage'

describe('removeResourceById', () => {
  const resources: Resource[] = [
    {
      id: 'first',
      title: 'First',
      url: 'https://example.com/first',
      createdAt: '2026-05-13T15:00:00.000Z',
    },
    {
      id: 'second',
      title: 'Second',
      url: 'https://example.com/second',
      createdAt: '2026-05-13T16:00:00.000Z',
    },
  ]

  it('removes a resource by id and reports success', () => {
    const result = removeResourceById(resources, 'first')

    assert.equal(result.deleted, true)
    assert.deepEqual(result.resources.map((resource) => resource.id), ['second'])
  })

  it('keeps resources unchanged when the id does not exist', () => {
    const result = removeResourceById(resources, 'missing')

    assert.equal(result.deleted, false)
    assert.deepEqual(result.resources, resources)
  })
})
