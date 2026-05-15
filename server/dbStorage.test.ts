import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapResourceRow } from './dbStorage'

describe('mapResourceRow', () => {
  it('maps a Postgres resource row to the API resource shape', () => {
    const result = mapResourceRow({
      id: 'a1b2c3d4-0001-0000-0000-000000000001',
      title: 'Attention Is All You Need',
      url: 'https://arxiv.org/abs/1706.03762',
      description: 'Transformer paper',
      category: 'Paper',
      tags: ['transformers', 'attention'],
      submitter_name: 'Prof. Martinez',
      created_at: new Date('2026-05-12T14:00:00.000Z'),
      stars: null,
      github_repo: null,
      votes: 0,
    })

    assert.deepEqual(result, {
      id: 'a1b2c3d4-0001-0000-0000-000000000001',
      title: 'Attention Is All You Need',
      url: 'https://arxiv.org/abs/1706.03762',
      description: 'Transformer paper',
      category: 'Paper',
      tags: ['transformers', 'attention'],
      submitterName: 'Prof. Martinez',
      createdAt: '2026-05-12T14:00:00.000Z',
      votes: 0,
    })
  })
})
