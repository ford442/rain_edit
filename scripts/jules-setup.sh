#!/bin/bash
# scripts/jules-setup.sh
# Tailored minimal setup for ford442/rain_edit (Monaco + custom glslify + Three.js rain layers)

set -euo pipefail

echo "🚀 [Jules] Setting up rain_edit environment..."

echo "📦 Installing dependencies..."
if npm ci --no-audit --no-fund --prefer-offline; then
  echo "✅ npm ci succeeded"
else
  echo "⚠️ npm ci had issues — falling back to npm install..."
  npm install --no-audit --no-fund --prefer-offline
fi

# Playwright browsers (only needed if a task will run your screenshot_*.js scripts)
# Uncomment the next line if Jules tasks frequently involve running those:
# npx playwright install --with-deps chromium

echo "✅ [Jules] rain_edit environment ready!"
