#!/bin/bash
# Run this from the project root to deploy to Vercel.
# Prerequisites:
#   1. Accept Xcode license if on Mac: sudo xcodebuild -license
#   2. Login to Vercel once: npx vercel login
#   3. Set env vars in Vercel dashboard (or pass them): DATABASE_URL, DIRECT_URL, AUTH_SECRET, OPENAI_API_KEY

set -e
cd "$(dirname "$0")/.."

echo "=== Building and deploying to Vercel ==="
npx vercel --prod

echo ""
echo "Done! Open the production URL shown above."
echo "If you haven't yet, add env vars in Vercel: Project → Settings → Environment Variables"
echo "  DATABASE_URL, DIRECT_URL, AUTH_SECRET, OPENAI_API_KEY"
