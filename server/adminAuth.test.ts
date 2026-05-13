import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getAdminToken } from './adminAuth'

describe('getAdminToken', () => {
  it('reads the admin token from the JSON body', () => {
    const result = getAdminToken({
      body: { adminToken: 'token-with-unicode-✓' },
      header: () => undefined,
    })

    assert.equal(result, 'token-with-unicode-✓')
  })

  it('falls back to the x-admin-token header', () => {
    const result = getAdminToken({
      body: {},
      header: (name) => (name === 'x-admin-token' ? 'header-token' : undefined),
    })

    assert.equal(result, 'header-token')
  })
})
