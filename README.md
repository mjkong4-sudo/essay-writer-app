# ThinkDraft

An AI-powered web application that generates polished essays from images. Upload an image, let GPT-4o read and extract text (Korean + English), then craft a well-structured essay with tone controls, translation, and export features.

## Features

- **AI Image Reading** -- Upload images and extract Korean/English text using OpenAI GPT-4o Vision (drag-and-drop or click-to-upload, handles handwriting, documents, photos)
- **AI Essay Generation** -- GPT-4o powered essay writing with 6 tone presets (Academic, Casual, Business, Creative, Persuasive, Journalistic)
- **Korean/English Translation** -- Full-text and word-level translation via OpenAI (double-click any word to translate)
- **Archive System** -- Save essays to a local SQLite database with search, favorites, and management
- **Multi-Format Export** -- Export to PDF, TXT, or DOCX
- **Modern UI** -- Clean, responsive design with toast notifications, loading states, and keyboard shortcuts

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Prisma + SQLite
- OpenAI GPT-4o (essay generation, image reading, translation)
- jsPDF + html-to-docx (export)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL="file:./dev.db"
```

### 3. Set up database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Upload** an image containing text (or paste text directly)
2. **Choose** a writing style and output language
3. **Generate** an essay with GPT-4
4. **Edit** the result, translate words by double-clicking, or translate the full text
5. **Save** to archive or **export** as PDF/TXT/DOCX

## Keyboard Shortcuts

- `Ctrl+Enter` / `Cmd+Enter` -- Generate essay

## Switching to PostgreSQL

To use PostgreSQL instead of SQLite, update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
}
```

Install the PostgreSQL adapter, update the DATABASE_URL in `.env`, and re-run migrations.
