FROM rust:trixie AS builder-fips
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends git clang pkg-config libssl-dev libdbus-1-dev && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/jmcorgan/fips.git ./
RUN cargo build --release

FROM oven/bun:latest AS builder-app
WORKDIR /build

COPY package.json ./
RUN bun install

COPY vite.config.ts index.html tsconfig*.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:latest AS runtime-fips
WORKDIR /build
COPY --from=builder-fips /build/target/release/fips /usr/local/bin/fips
COPY --from=builder-fips /build/target/release/fipsctl /usr/local/bin/fipsctl

FROM oven/bun:latest AS final
WORKDIR /app

COPY --from=builder-app /build/dist/client ./dist/client
COPY --from=builder-app /build/node_modules ./node_modules
COPY --from=runtime-fips /usr/local/bin/fips /usr/local/bin/fips
COPY --from=runtime-fips /usr/local/bin/fipsctl /usr/local/bin/fipsctl
COPY package.json ./
COPY src/server ./src/server
COPY entrypoint.sh ./entrypoint.sh

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0 FIPS_CONTROL_SOCKET=/var/run/fips/control.sock STATIC_DIR=/app/dist/client
ENTRYPOINT ["/app/entrypoint.sh"]
