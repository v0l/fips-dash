import 'dotenv/config'

import { getInfo, getLinks, getPeers, getSessions, getStatus, getTransports, getTree } from './api.js'

const PORT = Number.parseInt(process.env.PORT || '3000', 10)

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  })
}

const server = Bun.serve({
  hostname: '127.0.0.1',
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
        default:
          return json({ error: 'Not found' }, 404)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      return json({ error: 'Failed to fetch dashboard info', details: message }, 503)
    }
  },
})

console.log(`FIPS Dash API listening on http://${server.hostname}:${server.port}`)
