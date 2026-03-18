#!/bin/sh
set -e

mkdir -p /var/run/fips
fips &
FIPS_PID=$!

bun run src/server/index.ts &
BUN_PID=$!

trap 'kill $FIPS_PID $BUN_PID 2>/dev/null; wait' INT TERM

wait $BUN_PID
kill $FIPS_PID 2>/dev/null
wait $FIPS_PID
