import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'

describe('fetchSourceForTest', () => {
  const FAKE_RSS = (items: Array<{ title: string; link: string }>) => `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    ${items.map(i => `<item><title>${i.title}</title><link>${i.link}</link><pubDate>Mon, 12 May 2026 10:00:00 +0000</pubDate></item>`).join('\n    ')}
  </channel>
</rss>`

  let originalFetch: typeof globalThis.fetch

  before(() => { originalFetch = globalThis.fetch })
  after(() => { globalThis.fetch = originalFetch })

  it('returns articles when feed succeeds', async () => {
    const { fetchSourceForTest } = await import('./newsCache.ts?bust=' + Date.now())

    globalThis.fetch = async () =>
      new Response(FAKE_RSS([
        { title: 'Post 1', link: 'https://anthropic.com/1' },
        { title: 'Post 2', link: 'https://anthropic.com/2' },
      ]), { status: 200 })

    const result = await fetchSourceForTest('anthropic', 'https://www.anthropic.com/rss.xml')
    assert.equal(result?.source, 'anthropic')
    assert.equal(result?.articles.length, 2)
    assert.equal(result?.articles[0].title, 'Post 1')
    assert.equal(result?.articles[0].url, 'https://anthropic.com/1')
  })

  it('caps articles at 5', async () => {
    const { fetchSourceForTest } = await import('./newsCache.ts?bust=' + Date.now())

    globalThis.fetch = async () =>
      new Response(FAKE_RSS(
        Array.from({ length: 8 }, (_, i) => ({ title: `Post ${i+1}`, link: `https://openai.com/${i+1}` }))
      ), { status: 200 })

    const result = await fetchSourceForTest('openai', 'https://openai.com/news/rss.xml')
    assert.equal(result?.articles.length, 5)
  })

  it('returns null when fetch throws', async () => {
    const { fetchSourceForTest } = await import('./newsCache.ts?bust=' + Date.now())

    globalThis.fetch = async () => { throw new Error('network error') }

    const result = await fetchSourceForTest('openai', 'https://openai.com/news/rss.xml')
    assert.equal(result, null)
  })

  it('returns null when feed returns non-200', async () => {
    const { fetchSourceForTest } = await import('./newsCache.ts?bust=' + Date.now())

    globalThis.fetch = async () => new Response('Not Found', { status: 404 })

    const result = await fetchSourceForTest('google', 'https://blog.google/technology/ai/rss/')
    assert.equal(result, null)
  })
})
