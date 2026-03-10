# Deploying Essay Web App

This app is a **Next.js 16** project with **Prisma**, **Neon Postgres**, and **Auth.js**. The recommended way to deploy is **Vercel** (same team as Next.js).

---

## Deploy from your machine (quick)

1. **One-time:** Accept Xcode license (Mac) if Git is blocked:  
   `sudo xcodebuild -license`  
   Then log in to Vercel:  
   `npx vercel login`

2. **One-time:** Create a Neon database at [console.neon.tech](https://console.neon.tech) and copy `DATABASE_URL` and `DIRECT_URL`. In Vercel: your project → **Settings** → **Environment Variables** → add `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `OPENAI_API_KEY`.

3. **Deploy:**  
   `./scripts/deploy-vercel.sh`  
   or:  
   `npx vercel --prod`

---

## Prerequisites

1. **GitHub** – Code pushed to a GitHub repository.
2. **Neon** – A Postgres database at [console.neon.tech](https://console.neon.tech).
3. **Vercel** – Account at [vercel.com](https://vercel.com).

---

## Step 1: Push to GitHub

If you haven’t already:

```bash
git add .
git commit -m "Prepare for deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2: Neon database

1. Go to [console.neon.tech](https://console.neon.tech) and create a project (or use an existing one).
2. In the project dashboard, open **Connection details**.
3. Copy:
   - **Pooled connection** → use as `DATABASE_URL`
   - **Direct connection** → use as `DIRECT_URL`
4. (Optional) Run migrations locally against this DB to create tables:
   - In `.env`: set `DATABASE_URL` and `DIRECT_URL` to the Neon values.
   - Run: `npx prisma db push`
   - Or from Neon’s SQL editor, you can run the SQL from `prisma migrate` if you use migrations.

---

## Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub is easiest).
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repo (e.g. `essay-writer-app`).
4. **Configure:**
   - **Framework Preset:** Next.js (auto-detected).
   - **Build Command:** `prisma generate && next build` (or leave default if your `package.json` `"build"` already has this).
   - **Output Directory:** leave default.
5. **Environment variables** – add these (required):

   | Name            | Value                    | Notes                          |
   |-----------------|--------------------------|--------------------------------|
   | `DATABASE_URL`  | Neon pooled connection   | From Neon dashboard            |
   | `DIRECT_URL`    | Neon direct connection   | From Neon dashboard            |
   | `AUTH_SECRET`   | Random secret            | e.g. `openssl rand -base64 32` |
   | `OPENAI_API_KEY`| Your OpenAI API key      | For essay generation/translate  |

   Optional:

   | Name                    | Value              | Notes                    |
   |-------------------------|--------------------|--------------------------|
   | `AUTH_URL`              | Your production URL| e.g. `https://yourapp.vercel.app` (Vercel often sets this automatically) |
   | `LEGACY_MIGRATION_EMAIL`| Admin email        | For `/admin/migrate-legacy` only |

6. Click **Deploy**. Vercel will build and deploy.

---

## Step 4: Set production URL for Auth (if needed)

Auth.js (NextAuth v5) needs the correct app URL in production:

- Vercel usually sets **Vercel URL** and **Production URL**; many setups use that and don’t need `AUTH_URL`.
- If sign-in redirects or callbacks are wrong, set **AUTH_URL** in Vercel to your live URL, e.g. `https://your-project.vercel.app`.

---

## Step 5: Run migrations in production (if you use `prisma migrate`)

If you use `prisma migrate deploy`:

- In Vercel project **Settings → General**, set **Build Command** to:
  `prisma generate && prisma migrate deploy && next build`
- Or run migrations once from your machine with production `DATABASE_URL`:
  `DATABASE_URL="your-neon-pooled-url" npx prisma migrate deploy`

If you only use `prisma db push` (no migrations), run that once against the production `DATABASE_URL` from your machine, or use Neon’s SQL editor to create tables.

---

## Checklist

- [ ] Code on GitHub.
- [ ] Neon project created; `DATABASE_URL` and `DIRECT_URL` copied.
- [ ] Tables created in Neon (`prisma db push` or `prisma migrate deploy`).
- [ ] Vercel project created and repo connected.
- [ ] Env vars set on Vercel: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`.
- [ ] Deploy succeeded; production URL works and sign-in redirects are correct.

---

## Build issues

- **Turbopack / permission errors:** If the build fails with a Turbopack error, in Vercel set **Build Command** to:
  `prisma generate && next build --webpack`
- **Prisma client:** The app uses a custom Prisma output (`src/generated/prisma`). The build runs `prisma generate` first, so the client is generated during the Vercel build.

---

## Other platforms

- **Netlify:** Use the Next.js runtime and set the same env vars; build command: `prisma generate && next build`.
- **Railway / Render / Fly.io:** Run `next build` and `next start`; set `PORT` if required and point the process to your Neon `DATABASE_URL` and the rest of the env vars above.
