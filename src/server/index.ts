import 'dotenv/config'

import { getInfo, getLinks, getPeers, getSessions, getStatus, getTransports, getTree } from './api.js'

const PORT = Number.parseInt(process.env.PORT || '3000', 10)
const HOSTNAME = process.env.HOSTNAME || '127.0.0.1'
const STATIC_DIR = process.env.STATIC_DIR || ''

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  })
}

async function serveStatic(pathname: string): Promise<Response | null> {
  if (!STATIC_DIR) return null
  const { join } = await import('path')
  const { existsSync } = await import('fs')

  let filePath = join(STATIC_DIR, pathname)
  if (!existsSync(filePath) || (await Bun.file(filePath).stat()).isDirectory()) {
    filePath = join(STATIC_DIR, 'index.html')
  }
  const file = Bun.file(filePath)
  if (!await file.exists()) return null
  return new Response(file)
}

const server = Bun.serve({
  hostname: HOSTNAME,
  port: PORT,
  async fetch(request: Request) {
    const url = new URL(request.url)

    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405)
    }

    try {
      switch (url.pathname) {
        case '/api/info':
          return json(await getInfo())
        case '/api/status':
          return json(await getStatus())
        case '/api/peers':
          return json(await getPeers())
        case '/api/links':
          return json(await getLinks())
        case '/api/tree':
          return json(await getTree())
        case '/api/sessions':
          return json(await getSessions())
        case '/api/transports':
          return json(await getTransports())
        default: {
          const staticResponse = await serveStatic(url.pathname)
          if (staticResponse) return staticResponse
          return json({ error: 'Not found' }, 404)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      return json({ error: 'Failed to fetch dashboard info', details: message }, 503)
    }
  },
})

console.log(`FIPS Dash API listening on http://${server.hostname}:${server.port}`)
