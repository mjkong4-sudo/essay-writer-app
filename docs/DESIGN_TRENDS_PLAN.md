# Plan: Apply Market Design/Style Trends to Essay Web App

This plan maps current app-market design trends to concrete changes in our codebase. Items are ordered by impact and effort (quick wins first).

---

## Current state (brief)

- **Theme:** CSS variables in `src/app/globals.css` (light/dark, primary gold, serif + sans).
- **Layout:** Clean, minimal; max-width containers, sections with numbered steps.
- **Components:** Navbar (desktop + mobile bottom bar), cards with `border border-border bg-card shadow-sm`, `rounded-md` / `rounded-lg`, forms and toasts.
- **Already aligned:** Dark mode (system), transitions on buttons/inputs, some animation (fadeIn, slideIn, shimmer).

---

## Phase 1: Foundation (theme & tokens)

**Trend:** Soft rounded UI, warm minimalism, depth via shadows.

| Task | Where | What to do |
|------|--------|------------|
| **1.1** Increase border radius consistently | `globals.css` + shared patterns | Add theme tokens: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` (e.g. 8px, 12px, 16px, 24px). Use in Tailwind/theme so cards and buttons feel “softer.” |
| **1.2** Warm minimalism tweak (optional) | `globals.css` | Slightly warm light background (e.g. keep current `#FAF8F5` or nudge toward warm gray). Ensure dark mode stays comfortable. |
| **1.3** Subtle depth tokens | `globals.css` | Add `--shadow-card`, `--shadow-hover` (soft, not heavy) and use on cards/nav so surfaces feel layered. |

**Files:** `src/app/globals.css`, optionally Tailwind theme if using `@theme` extensions.

---

## Phase 2: Glassmorphism on key surfaces

**Trend:** Translucent, blurred panels (especially nav and floating surfaces).

| Task | Where | What to do |
|------|--------|------------|
| **2.1** Navbar glass | `src/components/Navbar.tsx` | Strengthen glass: keep `bg-card/80` or use `bg-card/70`, ensure `backdrop-blur-md` (or `backdrop-blur-lg`). Optional: very subtle border (e.g. `border-white/10` light, `border-white/5` dark). |
| **2.2** Mobile bottom bar glass | `src/components/Navbar.tsx` | Same as above for the bottom bar (`bg-card/95` → e.g. `bg-card/80`, `backdrop-blur-lg`). |
| **2.3** Card glass (optional, selective) | Home page essay cards, Dictionary/Highlights cards | On 1–2 key card types: `bg-card/90` + `backdrop-blur-sm` and a light border. Use sparingly to avoid clutter; ensure contrast for readability. |

**Files:** `src/components/Navbar.tsx`, `src/app/page.tsx` (essay cards), `src/app/dictionary/page.tsx`, `src/app/highlights/page.tsx`.

---

## Phase 3: Rounded UI and shadows

**Trend:** Softer corners everywhere; calibrated shadows for depth.

| Task | Where | What to do |
|------|--------|------------|
| **3.1** Cards | All `rounded-lg` cards | Switch to `rounded-xl` (or use new `--radius-lg`). Apply to: Writer step panels, essay cards, Dictionary/Highlights/Archive list cards, Export menu dropdown. |
| **3.2** Buttons & inputs | Buttons, inputs, toasts | Use `rounded-xl` for primary buttons; keep inputs at `rounded-lg` or `rounded-xl`. Toast: already `rounded-md` → consider `rounded-lg`. |
| **3.3** Step badges | Home page “1”, “2”, “3” circles | Already rounded-full; optional: slightly larger or add very soft shadow for depth. |
| **3.4** Consistent shadow | Cards, dropdowns | Replace ad-hoc `shadow-sm` / `shadow-md` with theme tokens. Cards: default `shadow-card`, hover `shadow-hover` where applicable (e.g. list cards on dictionary/highlights). |

**Files:** `src/app/globals.css`, `src/app/page.tsx`, `src/components/Navbar.tsx`, `src/components/Toast.tsx`, `src/components/ExportMenu.tsx`, `src/app/dictionary/page.tsx`, `src/app/highlights/page.tsx`, `src/app/archive/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/admin/migrate-legacy/page.tsx`.

---

## Phase 4: Micro-interactions

**Trend:** Small, purposeful animations for feedback.

| Task | Where | What to do |
|------|--------|------------|
| **4.1** Button hover/active | Global button styles | Ensure all primary/secondary buttons have `transition-colors` or `transition-all` and a distinct hover state (already partial). Add `active:scale-[0.98]` for a light press feel. |
| **4.2** Card hover | Essay cards, Dictionary/Highlights cards | Add `transition-shadow duration-200` and `hover:shadow-md` (or `hover:shadow-hover`) where cards are clickable or interactive. |
| **4.3** Nav link feedback | `Navbar.tsx` | Keep current active state; optional: subtle scale or opacity on hover for desktop links. |
| **4.4** Loading states | EssayGenerator, any loading buttons | Keep or add subtle spinner/skeleton; ensure no layout jump. |

**Files:** `src/app/globals.css` (base button/input transitions already there), `src/components/Navbar.tsx`, `src/app/page.tsx`, `src/app/dictionary/page.tsx`, `src/app/highlights/page.tsx`, `src/components/EssayGenerator.tsx`.

---

## Phase 5: Typography and hierarchy

**Trend:** Clear hierarchy; mix of sans and serif.

| Task | Where | What to do |
|------|--------|------------|
| **5.1** Hero and section titles | Home, login, signup, dictionary, highlights, archive | Ensure one clear H1 per page; section headings (H2) use serif or consistent weight. We already use `font-serif` for “ThinkDraft” and section titles—keep and ensure consistency. |
| **5.2** Body and labels | Everywhere | Keep readable body size; ensure muted labels use `text-muted` and sufficient contrast in dark mode. |

**Files:** `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/dictionary/page.tsx`, `src/app/highlights/page.tsx`, `src/app/archive/page.tsx`.

---

## Phase 6: Accessibility and polish

**Trend:** Accessibility-first; performance.

| Task | Where | What to do |
|------|--------|------------|
| **6.1** Focus rings | All interactive elements | Ensure `focus:ring-2 focus:ring-primary/15` (or similar) on inputs and buttons; no `outline: none` without a ring. |
| **6.2** Contrast | `globals.css`, dark mode | Re-check primary/muted on card and background in both themes; fix any contrast issues. |
| **6.3** Reduced motion | `globals.css` | Add `@media (prefers-reduced-motion: reduce)` to tone down or disable non-essential animations (fadeIn, slideIn, hover scale). |

**Files:** `src/app/globals.css`, form and button components across pages.

---

## Summary checklist

- [ ] **Phase 1:** Radius and shadow tokens in `globals.css`.
- [ ] **Phase 2:** Stronger glass on Navbar (top + bottom bar); optional glass on 1–2 card types.
- [ ] **Phase 3:** `rounded-xl` (or theme radius) on cards and main buttons; consistent shadow usage.
- [ ] **Phase 4:** Button active state; card hover shadow; optional nav hover feedback.
- [ ] **Phase 5:** Confirm typography hierarchy on all main pages.
- [ ] **Phase 6:** Focus rings, contrast check, reduced-motion media query.

---

## Out of scope (for now)

- **Bento grids:** Could apply to a future dashboard or settings; not required for current Writer/History/Dictionary/Highlights/Archive.
- **3D / WebGL:** Not needed for this product.
- **Neo-brutalism:** Doesn’t fit our calm, productivity tone.
- **Neumorphism:** Low contrast; we prefer glass and soft shadows.

---

## Suggested order of implementation

1. **Phase 1** (tokens) so later phases use the same radii and shadows.
2. **Phase 3** (rounded + shadows) for immediate visual alignment with market.
3. **Phase 2** (glass) for nav and optionally cards.
4. **Phase 4** (micro-interactions) for feel.
5. **Phases 5 & 6** (typography, a11y) in parallel or after.

If you want, we can start with Phase 1 + Phase 3 in code next (tokens and one pass of rounded/shadow updates).
