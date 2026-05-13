interface AdminTokenRequest {
  body?: unknown
  header(name: string): string | undefined
}

export function getAdminToken(req: AdminTokenRequest): string | undefined {
  if (
    req.body &&
    typeof req.body === 'object' &&
    'adminToken' in req.body &&
    typeof req.body.adminToken === 'string'
  ) {
    return req.body.adminToken
  }

  const raw = req.header('x-admin-token')
  if (raw === undefined) return undefined
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
