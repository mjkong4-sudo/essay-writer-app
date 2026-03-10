#!/bin/bash
# Run this after creating your GitHub repo and Neon database

set -e

echo "=== 1. GitHub push ==="
if [ -z "$GITHUB_REPO" ]; then
  echo "Enter your GitHub repo URL (e.g. https://github.com/username/essay-writer-app.git):"
  read -r GITHUB_REPO
fi

git remote add origin "$GITHUB_REPO" 2>/dev/null || git remote set-url origin "$GITHUB_REPO"
git push -u origin main

echo ""
echo "=== 2. Database setup ==="
echo "Add DATABASE_URL and DIRECT_URL from Neon to your .env, then run:"
echo "  npx prisma db push"
echo ""
echo "=== 3. Vercel ==="
echo "Import the repo at vercel.com and add env vars: DATABASE_URL, DIRECT_URL, OPENAI_API_KEY"
echo ""
echo "Done!"
