#!/usr/bin/env bash
set -euo pipefail

APP_NAME="fips-dash"
APP_USER="${APP_USER:-fips}"
APP_GROUP="${APP_GROUP:-$APP_USER}"
INSTALL_DIR="${INSTALL_DIR:-/opt/fips-dash}"
API_PORT="${API_PORT:-3000}"
SERVER_NAME="${SERVER_NAME:-_}"
FIPS_CONTROL_SOCKET="${FIPS_CONTROL_SOCKET:-/var/run/fips/control.sock}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_UNIT_PATH="/etc/systemd/system/${APP_NAME}.service"
NGINX_SITE_PATH="/etc/nginx/sites-available/${APP_NAME}"
NGINX_SITE_LINK="/etc/nginx/sites-enabled/${APP_NAME}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this installer as root." >&2
    exit 1
  fi
}

install_packages() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y curl ca-certificates nginx rsync unzip
}

install_bun() {
  if command -v bun >/dev/null 2>&1; then
    return
  fi

  curl -fsSL https://bun.sh/install | bash
  ln -sf /root/.bun/bin/bun /usr/local/bin/bun
}

ensure_user() {
  if ! getent group "${APP_GROUP}" >/dev/null; then
    groupadd --system "${APP_GROUP}"
  fi

  if ! id -u "${APP_USER}" >/dev/null 2>&1; then
    useradd --system --gid "${APP_GROUP}" --home-dir "${INSTALL_DIR}" --create-home --shell /usr/sbin/nologin "${APP_USER}"
  fi
}

sync_app() {
  mkdir -p "${INSTALL_DIR}"
  rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    "${REPO_DIR}/" "${INSTALL_DIR}/"

  cat > "${INSTALL_DIR}/.env" <<EOF
FIPS_CONTROL_SOCKET=${FIPS_CONTROL_SOCKET}
PORT=${API_PORT}
EOF

  chown -R "${APP_USER}:${APP_GROUP}" "${INSTALL_DIR}"
}

build_app() {
  sudo -u "${APP_USER}" env PATH="/usr/local/bin:/usr/bin:/bin" bash -lc "cd '${INSTALL_DIR}' && bun install && bun run build"
}

write_systemd_unit() {
  cat > "${SYSTEMD_UNIT_PATH}" <<EOF
[Unit]
Description=FIPS Dash API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=/usr/local/bin/bun run src/server/index.tsx
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

write_nginx_site() {
  cat > "${NGINX_SITE_PATH}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    root ${INSTALL_DIR}/dist/client;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF

  ln -sf "${NGINX_SITE_PATH}" "${NGINX_SITE_LINK}"
  rm -f /etc/nginx/sites-enabled/default
}

enable_services() {
  nginx -t
  systemctl daemon-reload
  systemctl enable --now "${APP_NAME}"
  systemctl reload nginx
  systemctl enable nginx
  systemctl restart nginx
}

print_summary() {
  cat <<EOF

Install complete.

- App dir: ${INSTALL_DIR}
- API port: ${API_PORT}
- Socket: ${FIPS_CONTROL_SOCKET}
- Site: http://${SERVER_NAME}

Useful commands:
  systemctl status ${APP_NAME}
  journalctl -u ${APP_NAME} -f
  systemctl status nginx

EOF
}

main() {
  require_root
  install_packages
  install_bun
  ensure_user
  sync_app
  build_app
  write_systemd_unit
  write_nginx_site
  enable_services
  print_summary
}

main "$@"
