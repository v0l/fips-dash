import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

// API routes
import * as api from './api.js'

app.get('/api/status', api.getStatus)
app.get('/api/peers', api.getPeers)
app.get('/api/links', api.getLinks)
app.get('/api/tree', api.getTree)
app.get('/api/sessions', api.getSessions)
app.get('/api/transports', api.getTransports)
app.get('/api/info', api.getInfo)

// Serve static files
app.use(express.static(path.join(__dirname, '../client')))

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'))
})

const PORT = parseInt(import.meta.env.PORT || '3000')
app.listen(PORT, () => {
  console.log(`FIPS Dashboard running on http://localhost:${PORT}`)
})
