# AGENTS.md — fips-dash

## Project Overview

Single-page dashboard for monitoring a FIPS mesh networking node. Full-stack TypeScript: Bun API server + React 19 / Vite / Tailwind CSS v4 frontend.

## Architecture

```
Browser → Vite dev (port 3001, proxies /api) or nginx (prod)
       → Bun.serve() API (port 3005, 127.0.0.1)
       → fipsctl -s /var/run/fips/control.sock show <command>
       → FIPS daemon
```

Data pipeline: `fipsctl JSON → FipsXxxResponse types → sanitizer functions → DashboardXxx types → JSON API → client interfaces → React UI`

### Key Files

| File | Purpose |
|---|---|
| `src/server/index.ts` | Bun.serve() HTTP server, routes `/api/*` |
| `src/server/api.ts` | Server types, sanitizers, fipsctl wrapper (~650 lines) |
| `src/client/App.tsx` | Main dashboard component, client types, all UI sections (~650 lines) |
| `src/client/TreeGraph.tsx` | SVG spanning tree visualization with d3-zoom, phantom node reconstruction |
| `src/client/mockData.ts` | Mock data for development (toggle via `VITE_MOCK=true`) |
| `src/client/index.css` | Tailwind CSS v4 import |
| `vite.config.ts` | Vite config, dev proxy `/api` → localhost:3005 |
| `.env` | `FIPS_CONTROL_SOCKET`, `PORT` |

## Development

```sh
bun run dev        # starts both API server (3005) and Vite dev server (3001)
bun run build      # builds client to dist/client/
bun run typecheck  # tsc for client + server
```

Open `http://localhost:3001` in browser. Vite proxies `/api` to the Bun backend.

## Conventions

### Security — sensitive fields

**NEVER return `remote_addr` or `transport_addr`** from the API. These fields exist in `fipsctl` output and in `FipsXxxResponse` server types, but sanitizer functions must strip them. Only port numbers (extracted from `local_addr`) are exposed.

Fields that must NOT pass through sanitizers to `DashboardXxx` types or the API response:
- `transport_addr` (peers)
- `remote_addr` (links, sessions)

### Styling

- Page: `max-w-7xl`, `bg-black`
- Section panels: `bg-neutral-900 rounded`, padding `px-3 py-2`
- Inner cards / stat chips: `bg-neutral-950 rounded`, padding `px-2 py-1.5`
- Table cells: `py-1 px-1.5`
- Text sizes: do not change when adjusting padding
- No `neutral-800` — use `neutral-900` for panels, `neutral-950` for inner elements

### CopyButton

Returns `null` when `navigator.clipboard` is unavailable (non-localhost HTTP without HTTPS).

### Tree coords

Coords arrays from `fipsctl` are ordered `[self, parent, grandparent, ..., root]`. The `TreeGraph.tsx` `buildLayout` function reverses them to `[root, ..., parent, self]` for tree layout. Mock data must also use the fipsctl ordering (self-to-root).

Phantom (inferred) intermediate nodes are created from every prefix of every reversed coords array. They are styled differently: smaller radius, dashed stroke, dimmer colors.

### Types — dual type definitions

Types are defined in three layers:
1. **Server types** (`FipsXxxResponse`) in `api.ts` — match raw fipsctl JSON output
2. **Dashboard types** (`DashboardXxx`) in `api.ts` — sanitized, exported as API contract
3. **Client types** (`StatusData`, `Peer`, `Link`, `TreeData`, `Session`, `Transport`) in `App.tsx` — consumed by React components

`TreeGraph.tsx` also exports its own `TreeData` and `DirectPeer` interfaces used by both `App.tsx` and `mockData.ts`. Keep all layers in sync when adding fields.

### API endpoints

All served from Bun on `127.0.0.1:$PORT`:

| Route | Handler | Description |
|---|---|---|
| `GET /api/info` | `getInfo()` | All 6 fipsctl commands in parallel (single response) |
| `GET /api/status` | `getStatus()` | Node status only |
| `GET /api/peers` | `getPeers()` | Authenticated peers |
| `GET /api/links` | `getLinks()` | Active links |
| `GET /api/tree` | `getTree()` | Spanning tree |
| `GET /api/sessions` | `getSessions()` | Sessions |
| `GET /api/transports` | `getTransports()` | Transport stats |

The frontend uses only `/api/info` for a single aggregated fetch.

### fipsctl commands

The API wraps these shell commands:
```sh
fipsctl -s /var/run/fips/control.sock show status
fipsctl -s /var/run/fips/control.sock show peers
fipsctl -s /var/run/fips/control.sock show links
fipsctl -s /var/run/fips/control.sock show tree
fipsctl -s /var/run/fips/control.sock show sessions
fipsctl -s /var/run/fips/control.sock show transports
```

### Transport stats

Stats fields vary by transport type:
- **Common**: `packets_sent/recv`, `bytes_sent/recv`, `send_errors`, `recv_errors`, `mtu_exceeded`
- **UDP**: `kernel_drops`
- **TCP**: `connect_refused`, `connect_timeouts`, `connections_accepted/established/rejected`
- **Ethernet**: `beacons_sent/recv`, `frames_sent/recv`, `frames_too_long/too_short`

UI conditionally renders type-specific stats.

## Production Deployment

`scripts/install-debian.sh` automates Debian/Ubuntu installation:
- Installs nginx, bun, creates system user
- Builds app, syncs to `/opt/fips-dash`
- Sets up systemd service + nginx (static files + reverse proxy)

Systemd unit: `systemd/fips-dash.service` — runs as `fips:fips`, reads `.env`, executes Bun directly.
