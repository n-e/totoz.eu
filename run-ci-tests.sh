#!/bin/bash

set -e

docker compose up -d
npm ci
npm run build
./create-test-db.sh
DATABASE_URL=psql://totoz:example@localhost/totoz_test npm start &
npx playwright install chromium
npx playwright test e2e/
node --test