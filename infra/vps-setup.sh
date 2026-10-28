#!/bin/sh
# Run this on the Ubuntu VPS, from the VoiceAgent-main directory, after
# infra/livekit.yaml keys match backend/.env and agent/.env.
# It is not for the Windows development machine.
set -eu

if [ "$(uname -s)" != "Linux" ]; then
  echo "This script installs Docker and firewall rules on the Ubuntu VPS."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
  echo "Log out and back in so the docker group applies, then run this script again."
  exit 0
fi

sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 7882/udp
sudo ufw allow 3001/tcp
sudo ufw --force enable

docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml logs --tail 50 livekit
