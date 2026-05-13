export function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/)
  if (!match) return null
  const repo = match[2].replace(/\/$/, '')
  if (!repo) return null
  return { owner: match[1], repo }
}
