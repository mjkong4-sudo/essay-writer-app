# Deploy to Vercel

This app uses **Neon Postgres** (required for Vercel's serverless environment).

## 1. Create a Neon database

1. Go to [neon.tech](https://neon.tech) and sign up (free).
2. Create a new project.
3. In the dashboard, copy both connection strings:
   - **Connection string** (pooled) → use as `DATABASE_URL`
   - **Direct connection** → use as `DIRECT_URL`

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project** and import your repo.
3. In **Environment Variables**, add:
   - `DATABASE_URL` = Neon pooled connection string
   - `DIRECT_URL` = Neon direct connection string
   - `OPENAI_API_KEY` = your OpenAI API key
4. Click **Deploy**.

## 4. Create database tables

After the first deploy, run this locally (with your Neon URLs in `.env`):

```bash
npx prisma db push
```

This creates the tables in your Neon database. Your app will then work.

## Local development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your Neon `DATABASE_URL` and `DIRECT_URL` to `.env`.
3. Add your `OPENAI_API_KEY`.
4. Run `npx prisma db push` if you haven't.
5. Run `npm run dev`.
