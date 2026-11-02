#!/bin/sh
set -e
until npx prisma db push --skip-generate --accept-data-loss; do echo "waiting for database..."; sleep 2; done
COUNT=$(node -e "const {PrismaClient}=require('@prisma/client');new PrismaClient().user.count().then(n=>{console.log(n);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})")
if [ "$COUNT" = "0" ] || [ "$FORCE_SEED" = "true" ]; then
  echo "==> Seeding demo data..."
  node dist/seed/seed.js || echo "seed failed"
  echo "==> Seed complete."
fi
exec node dist/main.js
