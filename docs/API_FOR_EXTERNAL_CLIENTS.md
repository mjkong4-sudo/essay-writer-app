# ThinkDraft Essay API — for external clients

Use this doc when another team (e.g. Instagram archive viewer, other apps) wants to call the ThinkDraft **Generate essay** API from their own origin.

---

## Base URL

- **Production:** `https://essay-writer-app.vercel.app` (or the URL where ThinkDraft is deployed)
- **Endpoint:** `POST /api/generate`

Full URL example: `https://essay-writer-app.vercel.app/api/generate`

---

## CORS (required for browser clients)

The API only accepts cross-origin requests from **allowed origins**. Your origin must be added by the ThinkDraft team.

- **What to send the ThinkDraft team:** the **exact origin(s)** your app runs on, for example:
  - Local: `http://localhost:8000`
  - Deployed: `https://my-archive-viewer.vercel.app`
- **They will set:** `ESSAY_CORS_ORIGIN` in their environment (comma-separated if you have multiple origins).
- If your origin is not allowed, the browser will block the request and you will get no response (CORS error).

---

## Request

- **Method:** `POST`
- **Content-Type:** `multipart/form-data` (use `FormData` in JavaScript)
- **Body fields:**

| Field     | Type              | Required | Description |
|----------|-------------------|----------|-------------|
| `image`  | File (or multiple) | No*      | Image(s) to inspire the essay. Can append multiple with the same key `image`. |
| `text`   | string            | No*      | Caption, notes, or prompt text. |
| `tone`   | string            | No       | Default: `"formal academic style"`. e.g. `"casual"`, `"formal academic style"`. |
| `language` | string          | No       | Default: `"English"`. e.g. `"English"`, `"Spanish"`. |
| `mode`   | string            | No       | Use `"combine"` when sending **multiple images** so one essay is generated from all of them. |

\* At least one of `image` (with non-empty file(s)) or `text` (non-empty) is required.

**Example (browser):**

```js
const formData = new FormData();
formData.append("text", "Sunset at the beach, feeling grateful");
formData.append("tone", "formal academic style");
formData.append("language", "English");
// Optional: formData.append("image", file); formData.append("mode", "combine");

const response = await fetch("https://essay-writer-app.vercel.app/api/generate", {
  method: "POST",
  body: formData,
});
const data = await response.json();
if (!response.ok) {
  console.error(data.error);
} else {
  console.log(data.essay);
}
```

---

## Response

- **Content-Type:** `application/json`

### Success

- **Status:** `200`
- **Body:** `{ "essay": "<full essay text>" }`

Use `data.essay` for the generated essay string.

### Error

- **Status:** `400` (validation) or `500` (server/OpenAI error)
- **Body:** `{ "error": "<user-facing message>" }`

Examples:
- `400` — `"Please provide an image or text to generate an essay from"`
- `500` — `"OpenAI API key is not configured. Add it to your .env file."`
- `500` — `"Generation failed. Please try again."` or other short message

Always show `data.error` to the user when `!response.ok`.

---

## Preflight (OPTIONS)

For cross-origin `POST` from the browser, the client sends an `OPTIONS` request first. The API responds with `200` and CORS headers. No action needed on your side except to ensure your origin is allowed (see CORS above).

---

## Checklist for the integrating team

1. **Get your origin(s) allowlisted** — Send the ThinkDraft team the exact URL(s) your app runs on (e.g. `https://my-app.vercel.app`).
2. **Use the contract above** — `POST` with `FormData`; expect `200` + `{ essay }` or non-2xx + `{ error }`.
3. **Handle errors** — On non-2xx, read `response.json()` and display `error` to the user.
4. **Test** — If the request never completes and the console shows a CORS error, your origin is not yet allowlisted.

---

## Summary to send to the other team

You can copy-paste something like this:

- **Endpoint:** `POST https://essay-writer-app.vercel.app/api/generate` (or our deployed base URL).
- **Body:** `FormData` with optional `image` (file(s)), optional `text`, optional `tone`, `language`, `mode` (use `"combine"` for multiple images). At least one of image or text required.
- **Success:** `200` → `{ "essay": "<string>" }`.
- **Error:** `4xx`/`5xx` → `{ "error": "<string>" }`.
- **CORS:** We must add your app’s origin to our config; send us the exact origin URL(s) (e.g. `https://your-app.vercel.app`).
- **Full doc:** [link to this file or a hosted copy]
