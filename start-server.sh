#!/bin/sh
cd "$(dirname "$0")"
bun run build:server || exit 1
FIPS_CONTROL_SOCKET="${FIPS_SOCK:-/run/fips/control.sock}" bun run src/server/index.tsx
