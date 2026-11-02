#!/bin/sh
set -e
until npx prisma db push --skip-generate --accept-data-loss; do echo "waiting for database..."; sleep 2; done
if [ "$FORCE_SEED" = "true" ]; then
  echo "==> FORCE_SEED=true: will seed after API starts..."
  (sleep 20 && node dist/seed/seed.js && echo "==> Seed complete.") &
fi
exec node dist/main.js
