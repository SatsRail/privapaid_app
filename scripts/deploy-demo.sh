#!/usr/bin/env bash
# Deploy latest code to your PrivaPaid demo instance.
# Usage: bash scripts/deploy-demo.sh
#
# Requires a .deploy.env file in the project root:
#   DEPLOY_SSH_KEY=~/.ssh/your-key
#   DEPLOY_HOST=ec2-user@your-ip
#   DEPLOY_APP_DIR=/home/ec2-user/privapaid
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.deploy.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Missing .deploy.env file. Create one in the project root:"
  echo ""
  echo "  DEPLOY_SSH_KEY=~/.ssh/your-key"
  echo "  DEPLOY_HOST=ec2-user@your-ip"
  echo "  DEPLOY_APP_DIR=/home/ec2-user/privapaid"
  exit 1
fi

source "$ENV_FILE"

: "${DEPLOY_SSH_KEY:?Set DEPLOY_SSH_KEY in .deploy.env}"
: "${DEPLOY_HOST:?Set DEPLOY_HOST in .deploy.env}"
: "${DEPLOY_APP_DIR:=/home/ec2-user/privapaid}"

KEEP_RELEASES=3

echo "==> Deploying to ${DEPLOY_HOST}..."

echo "==> Pulling latest code..."
ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" "cd $DEPLOY_APP_DIR && git pull && git submodule update --init --recursive"

echo "==> Rebuilding and restarting containers..."
ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" "cd $DEPLOY_APP_DIR && sudo docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache app && sudo docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d"

echo "==> Waiting for health check..."
for i in $(seq 1 30); do
  HEALTH=$(ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" "curl -sf http://localhost:3000/api/health 2>/dev/null" || echo "")
  if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "==> Health check passed: $HEALTH"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "==> ERROR: Health check failed after 150s"
    ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" "cd $DEPLOY_APP_DIR && sudo docker-compose logs --tail 20 app"
    exit 1
  fi
  echo "    Waiting... ($i/30)"
  sleep 5
done

echo "==> Pruning old releases (keeping ${KEEP_RELEASES})..."
ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" bash -s "$KEEP_RELEASES" <<'CLEANUP'
  KEEP=$1
  # Remove stopped containers
  sudo docker container prune -f 2>/dev/null || true
  # Remove old images beyond the last N
  sudo docker images --format '{{.ID}} {{.CreatedAt}}' --filter 'dangling=false' \
    | sort -k2 -r | awk -v keep="$KEEP" 'NR>keep {print $1}' \
    | xargs -r sudo docker rmi -f 2>/dev/null || true
  # Remove dangling images and build cache
  sudo docker image prune -f 2>/dev/null || true
  sudo docker builder prune -af 2>/dev/null || true
  echo "Disk after cleanup: $(df -h / | tail -1 | awk '{print $4 " free (" $5 " used)"}')"
CLEANUP

echo "==> Deploy complete!"
