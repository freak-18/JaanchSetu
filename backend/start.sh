#!/bin/sh
set -e
COUNT=$(node -e "const {PrismaClient}=require('@prisma/client');new PrismaClient().user.count().then(n=>{console.log(n);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})")
if [ "$COUNT" = "0" ]; then
  echo "==> Empty database — running seed..."
  node dist/seed/seed.js
  echo "==> Seed complete."
fi
exec node dist/main
