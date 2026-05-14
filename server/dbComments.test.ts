import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapCommentRow } from './dbStorage'

describe('mapCommentRow', () => {
  it('maps a DB row to a Comment with camelCase fields', () => {
    const row = {
      id: 'abc',
      resource_id: 'def',
      author_name: 'Alex',
      body: 'Great resource!',
      created_at: new Date('2026-05-14T12:00:00Z'),
    }
    const result = mapCommentRow(row)
    assert.deepEqual(result, {
      id: 'abc',
      resourceId: 'def',
      authorName: 'Alex',
      body: 'Great resource!',
      createdAt: '2026-05-14T12:00:00.000Z',
    })
  })

  it('accepts a string created_at', () => {
    const row = {
      id: 'abc',
      resource_id: 'def',
      author_name: 'Alex',
      body: 'Great!',
      created_at: '2026-05-14T12:00:00Z',
    }
    const result = mapCommentRow(row)
    assert.equal(result.createdAt, '2026-05-14T12:00:00.000Z')
  })
})
