# Integration feedback: external client (Instagram archive viewer)

**For:** Essay Generator app (ThinkDraft) team  
**From:** User integrating ThinkDraft API with an Instagram archive viewer  
**Goal:** Make “Generate essay” from the archive viewer reliable so generated essays show up correctly.

---

## 1. How we use the API

A separate **Instagram archive viewer** (static site) lets users open a post and click **“Generate essay”**. The viewer then:

- Sends **POST** to `https://essay-writer-app.vercel.app/api/generate` (or your configured base URL).
- **Body:** `FormData` with:
  - `image` (optional, one or more `File`s)
  - `text` (optional string, caption + notes)
  - `tone` (e.g. `"formal academic style"`)
  - `language` (e.g. `"English"`)
  - `mode` (optional, `"combine"` when multiple images)
- Expects **JSON**:
  - Success: `{ "essay": "<string>" }`
  - Error: `{ "error": "<string>" }` with status 400/500.

So the **contract** we rely on is: success = `200` + `{ essay: string }`, failure = `4xx/5xx` + `{ error: string }`.

---

## 2. Issue we’re seeing

- User clicks **“Generate essay”** in the archive viewer.
- **“Generating…”** appears, then disappears.
- The **generated essay often doesn’t appear** (or is hard to find).

We’ve fixed the **viewer side** (e.g. no longer hiding the essay when loading finishes). To make the integration reliable end‑to‑end, we need the **Essay Generator app** to ensure the following.

---

## 3. What we need from the Essay Generator app

### 3.1 CORS (critical for deployed viewer)

- The viewer runs on **another origin** (e.g. `http://localhost:8000` or a deployed archive URL).
- So **`POST /api/generate`** and **`OPTIONS /api/generate`** must allow that origin.
- **Ask:** Can you support multiple origins (e.g. via `ESSAY_CORS_ORIGIN`)?
- **Check:** In production (e.g. Vercel), is **`ESSAY_CORS_ORIGIN`** set to include the archive viewer origin(s)?
  - Example: `http://localhost:8000` for local testing.
  - If the archive is deployed: add that URL (e.g. `https://my-archive.vercel.app`).
  - Multiple origins could be comma‑separated if your app supports it.

If CORS isn’t set for our origin, the browser blocks the request and we never get a response, so the essay never shows.

### 3.2 Response format

- **Success:** Respond with **`200`** and **`{ "essay": "<full essay text>" }`**.
- **Error:** Respond with **4xx/5xx** and **`{ "error": "<user-facing message>" }`**.
- We can also accept **`content`** as a fallback for the essay (e.g. `data.essay || data.content`), but **`essay`** is preferred so we don’t depend on non‑documented fields.

### 3.3 Error messages

- When something fails (no key, OpenAI error, validation, etc.), returning **`{ "error": "Clear message" }`** helps us show a useful message in the viewer (e.g. “OpenAI API key is not configured” or “Generation failed: …”).

### 3.4 OPTIONS (preflight)

- Browsers send **OPTIONS** before **POST** when the request is cross‑origin.
- **`OPTIONS /api/generate`** should return **200** with the same **CORS headers** as the POST (e.g. `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).
- If OPTIONS fails or lacks CORS, the browser blocks the POST and we never see the essay.

### 3.5 Environment / config in production

- **`OPENAI_API_KEY`** (or equivalent) must be set in the environment where the API runs (e.g. Vercel).
- If it’s missing, we’ll get 500 and an error body; having a clear **`error`** message helps us show it in the UI.

---

## 4. Checklist for your team

- [ ] **CORS:** `ESSAY_CORS_ORIGIN` (or equivalent) includes the archive viewer origin(s) in production.
- [ ] **OPTIONS:** `OPTIONS /api/generate` returns 200 with CORS headers.
- [ ] **Success response:** `POST` returns `200` and `{ "essay": "..." }`.
- [ ] **Error response:** On failure, return `{ "error": "..." }` with appropriate status.
- [ ] **Env:** `OPENAI_API_KEY` (and any other required keys) are set in production.

---

## 5. How to test from our side

- We call:  
  `POST https://essay-writer-app.vercel.app/api/generate`  
  with `FormData` (and optionally `text` only if no images).
- If CORS is correct, we get either a JSON success/error response and can show the essay or your error message.
- If CORS is wrong, the browser shows a CORS error and we get no response (so “Generating…” disappears and nothing shows).

---

Thank you for maintaining the API; we’re happy to adjust our client if you document any change in contract or CORS requirements.
