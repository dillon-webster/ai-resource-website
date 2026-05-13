import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseGithubRepo } from './parseGithubUrl.ts'

describe('parseGithubRepo', () => {
  it('parses a standard GitHub URL', () => {
    const result = parseGithubRepo('https://github.com/anthropics/claude-code')
    assert.deepEqual(result, { owner: 'anthropics', repo: 'claude-code' })
  })

  it('parses a URL with trailing slash', () => {
    const result = parseGithubRepo('https://github.com/owner/my-plugin/')
    assert.deepEqual(result, { owner: 'owner', repo: 'my-plugin' })
  })

  it('parses a URL with a path suffix', () => {
    const result = parseGithubRepo('https://github.com/owner/repo/tree/main')
    assert.deepEqual(result, { owner: 'owner', repo: 'repo' })
  })

  it('returns null for a non-GitHub URL', () => {
    const result = parseGithubRepo('https://openai.com/some-tool')
    assert.equal(result, null)
  })

  it('returns null for a bare GitHub URL with no repo', () => {
    const result = parseGithubRepo('https://github.com/owner')
    assert.equal(result, null)
  })

  it('returns null for an empty string', () => {
    const result = parseGithubRepo('')
    assert.equal(result, null)
  })
})
