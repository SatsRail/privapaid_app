#!/bin/sh
set -e

DATA_DIR="/app/data"
GENERATED_ENV="$DATA_DIR/.generated-env"

mkdir -p "$DATA_DIR"

# Load previously generated secrets if they exist
if [ -f "$GENERATED_ENV" ]; then
  . "$GENERATED_ENV"
  AUTH_SECRET="${AUTH_SECRET:-$NEXTAUTH_SECRET}"
  export NEXTAUTH_SECRET AUTH_SECRET SK_ENCRYPTION_KEY
fi

# Generate NEXTAUTH_SECRET if not set
if [ -z "$NEXTAUTH_SECRET" ]; then
  NEXTAUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> "$GENERATED_ENV"
  export NEXTAUTH_SECRET
  AUTH_SECRET="$NEXTAUTH_SECRET"
  export AUTH_SECRET
  echo "Generated NEXTAUTH_SECRET"
fi

# Generate SK_ENCRYPTION_KEY if not set
if [ -z "$SK_ENCRYPTION_KEY" ]; then
  SK_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "SK_ENCRYPTION_KEY=$SK_ENCRYPTION_KEY" >> "$GENERATED_ENV"
  export SK_ENCRYPTION_KEY
  echo "Generated SK_ENCRYPTION_KEY"
fi

exec "$@"
