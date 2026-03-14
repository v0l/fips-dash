# FIPS Dash

Single-page dashboard for a running FIPS node.

It uses:
- `bun`
- `vite`
- `react` + `typescript`
- `tailwindcss` v4
- `Bun.serve`
- `fipsctl show ...` for all node data

The UI renders a compact black / neutral dashboard with:
- node status
- forwarding stats
- spanning tree stats
- peers
- links
- sessions
- transports
- a generated static peer YAML example

## Requirements

- `bun`
- `fipsctl` in `PATH`
- a running FIPS daemon

## Configuration

Create a `.env` file:

```env
FIPS_CONTROL_SOCKET=/var/run/fips/control.sock
PORT=3000
```

## Development

```bash
bun install
bun run dev
```

The app uses one aggregated API endpoint:

- `/api/info`

That endpoint calls `fipsctl` commands in the Bun API server and returns a sanitized combined response for the UI.

## Build

```bash
bun run build
```

## Run API Server

```bash
bun run src/server/index.ts
```

## Debian / Ubuntu Install

For a basic nginx + systemd deployment on Debian or Ubuntu:

```bash
sudo SERVER_NAME=your-hostname.example.com ./scripts/install-debian.sh
```

Optional environment overrides:

```bash
sudo \
  SERVER_NAME=fips.example.com \
  INSTALL_DIR=/opt/fips-dash \
  APP_USER=fips \
  API_PORT=3000 \
  FIPS_CONTROL_SOCKET=/var/run/fips/control.sock \
  ./scripts/install-debian.sh
```

The installer will:
- install nginx, bun, and required packages
- copy the app into `/opt/fips-dash`
- create `/opt/fips-dash/.env`
- build the app
- install a `systemd` service
- configure nginx to serve `dist/client`
- reverse proxy `/api/` to the Bun backend on localhost

## Notes

- Sensitive transport / peer address details are not passed through directly to the browser.
- The static peer YAML uses the current hostname and the detected local transport ports.
- The dashboard is intended to sit on the same host as the FIPS daemon, or somewhere that can run `fipsctl` against the control socket.

## systemd

A sample service file is included at:

`systemd/fips-dash.service`

Install it with something like:

```bash
sudo cp systemd/fips-dash.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fips-dash
```
