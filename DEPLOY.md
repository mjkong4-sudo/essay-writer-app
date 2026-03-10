# Deploy ThinkDraft (Essay Web App)

The app is a Next.js 16 project with Prisma (Neon), NextAuth, and OpenAI. **Vercel** is the recommended host.

---

## 1. Prerequisites

- **Git** – code in a Git repo (e.g. GitHub).
- **Vercel account** – [vercel.com](https://vercel.com) (free tier is enough).
- **Neon database** – [neon.tech](https://neon.tech) (free tier). Create a project and copy the connection strings.
- **OpenAI API key** – [platform.openai.com](https://platform.openai.com/api-keys).

---

## 2. Push your code to GitHub

If the project is not in a repo yet:

```bash
cd "/Users/minjicupertino/Downloads/Essay Web App"
git init
git add .
git commit -m "Initial commit"
# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## 3. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import** your GitHub repository (Essay Web App).
3. **Configure project**
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** `./` (or the folder that contains `package.json` if the repo has multiple apps).
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** leave default.
   - **Install Command:** `npm install` (default).

4. **Environment variables** – add these in the Vercel project **Settings → Environment Variables** (for Production, Preview, and Development if you use Vercel dev):

   | Name             | Value / notes |
   |------------------|---------------|
   | `OPENAI_API_KEY` | Your OpenAI API key. |
   | `AUTH_SECRET`    | Generate: `openssl rand -base64 32`. |
   | `AUTH_URL`       | Your production URL, e.g. `https://your-app.vercel.app`. (Vercel often sets this automatically.) |
   | `DATABASE_URL`   | Neon **pooled** connection string (from Neon dashboard). |
   | `DIRECT_URL`     | Neon **direct** connection string (for migrations). |
   | `ESSAY_CORS_ORIGIN` | (Optional) If the archive viewer calls this API from another origin, set it to that origin, e.g. `https://your-archive-site.com`. |

5. Click **Deploy**. Vercel will run `npm install`, `prisma generate` (via postinstall), and `npm run build`.

---

## 4. Database setup (first deploy)

After the first deploy, run Prisma migrations against your **production** DB:

**Option A – Vercel project settings**

- In Vercel: **Settings → Environment Variables** and ensure `DATABASE_URL` and `DIRECT_URL` are set for Production.
- Then run migrations from your machine with production env:

```bash
cd "/Users/minjicupertino/Downloads/Essay Web App"
DATABASE_URL="your_neon_pooled_url" DIRECT_URL="your_neon_direct_url" npx prisma migrate deploy
```

**Option B – Neon SQL editor**

- In Neon dashboard, run the SQL from your migration files under `prisma/migrations/` if you prefer to apply them manually.

---

## 5. After deploy

- Open the Vercel URL (e.g. `https://your-app.vercel.app`).
- Sign up at `/signup` to create an account (stored in Neon).
- If the archive viewer will call the essay API from a different domain, set `ESSAY_CORS_ORIGIN` in Vercel to that domain (e.g. the URL where you host the Instagram archive viewer).

---

## 6. Optional: deploy via Vercel CLI

```bash
npm i -g vercel
cd "/Users/minjicupertino/Downloads/Essay Web App"
vercel
# Follow prompts; add env vars in dashboard or via vercel env add
```

---

## Troubleshooting

- **Build fails on Prisma:** Ensure `DATABASE_URL` (and `DIRECT_URL` if used) are set in Vercel so `prisma generate` can run. Schema is read from `prisma/schema.prisma` and `prisma.config.ts`.
- **Auth redirect issues:** Set `AUTH_URL` to your exact production URL (with `https://`).
- **CORS errors from archive viewer:** Set `ESSAY_CORS_ORIGIN` to the origin of the page that calls `/api/generate` (e.g. `https://your-archive.vercel.app`).
