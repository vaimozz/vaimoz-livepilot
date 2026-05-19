#!/usr/bin/env bash
set -euo pipefail
cp -n .env.example .env || true
npm install
npm run build
npm run migrate
printf '\nVaimoz LivePilot siap. Jalankan: npm start\n'
