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

  return req.header('x-admin-token')
}
