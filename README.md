# FIPS Dash

Single-page dashboard for a running FIPS node.

It uses:
- `bun`
- `vite`
- `react` + `typescript`
- `tailwindcss` v4
- `express`
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

That endpoint calls `fipsctl` commands on the server and returns a sanitized combined response for the UI.

## Build

```bash
bun run build
```

## Run

```bash
./start-server.sh
```

Then open:

```text
http://localhost:3000
```

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
