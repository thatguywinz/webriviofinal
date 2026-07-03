# Webrivio — Repository Context & Technical Reference

> **Purpose of this document.** This is a complete, self-contained description of the
> `webriviofinal` repository — every file, asset, page, style token, script, and
> external dependency — written so an AI agent (or human) can audit the website with
> full knowledge of *how it is actually built and how it behaves*. Attach it to an audit
> prompt as ground-truth context.
>
> It describes **what is present in the code**, not what "works" at runtime. Where it
> says "the form POSTs to X," that means the markup wires it that way — not that
> delivery has been verified end-to-end.

---

## ⚠️ 0. READ FIRST — Audit target & Git state

**The working tree is clean.** Everything described in this document — the WebGL hero,
GSAP/Lenis motion layer, before/after sliders, the Work page, and the unified icon set —
is **committed** and present on `master` as of `48f7091`. There is no divergence between
the working tree and what pushes to Vercel.

The "elevated build" (enhancement layer, WebGL hero, Work page, vendored motion libs)
that once sat uncommitted was folded into `master` by `34f9b81` ("unify brand logo
across all icons + rebuild OG card"), whose commit message notes it *"also ships the
pending working-tree site build (index/work/services/process/contact, app.js,
enhance.css/js, hero.js, vendor libs)."* A follow-up commit (`48f7091`) only widened
`.gitignore` to exclude local QA screenshots and Playwright artifacts.

**How to use this fact:**
- This document describes `HEAD` (`48f7091`) directly — there is no working-tree/commit
  gap to account for.
- Since Vercel builds on `git push`, the live `webrivio.com` should match what's
  described here, assuming the push happened. If auditing the live URL and something
  looks stale, check `git log origin/master` vs. local `master` first, and confirm the
  latest commit actually deployed (Vercel dashboard / deployment log), rather than
  assuming a working-tree gap.

---

## 1. What the site is

**Webrivio** is a marketing website for a (solo/small) **premium website-design studio**
that targets **local service businesses** — roofing, dental, medspa, landscaping, HVAC,
contractors, auto, etc. It is a lead-generation site: every path funnels toward the
contact form ("Start a project" / "Book a demo" / "Get a quote"). There is **no
e-commerce, no login, no CMS, no backend** of its own.

- **Domain:** `https://webrivio.com`
- **Contact email (displayed):** `hello@webrivio.com`
- **Phone:** `(437) 227-7186` → `tel:+14372277186`
- **Positioning:** the "narrow middle" between a cheap template builder and a $40k agency.
- **Tone:** editorial / cinematic / midnight-blue, dark theme only.
- **Business model shown:** custom 5-page builds, ~4-week delivery, client owns the code,
  optional month-to-month hosting/care. Pricing was intentionally removed from the site
  (see git history) and replaced with "request a custom quote" CTAs.

---

## 2. Tech stack & architecture

- **Type:** Hand-authored **static website**. No framework, no bundler, no build step, no
  `package.json`. Plain HTML + CSS + vanilla JS, served as files.
- **Rendering:** Fully static HTML. JS is **progressive enhancement only** — all content,
  copy, and CTAs exist in the static markup and work with JS disabled.
- **Pages:** 6 HTML files (`index`, `services`, `process`, `work`, `contact`, `404`).
- **Styling:** 2 stylesheets (`styles.css` base + `enhance.css` component layer) using CSS
  custom properties. Dark theme only (`color-scheme: dark`).
- **JS layers (3):** `app.js` (baseline, dependency-free) → `enhance.js` (motion layer,
  depends on vendored GSAP + Lenis) → `hero.js` (standalone WebGL aurora).
- **Motion libraries:** GSAP 3.12.5, ScrollTrigger 3.12.5, Lenis 1.1.18 — **vendored**
  locally under `assets/vendor/` (self-hosted, "ownable," no CDN dependency at runtime).
- **Fonts:** Google Fonts (Instrument Serif, Geist, JetBrains Mono) loaded from
  `fonts.googleapis.com`.
- **Forms:** Third-party **FormSubmit.co** (no server needed) via AJAX.
- **Analytics:** Vercel Web Analytics + Vercel Speed Insights (external CDN scripts).
- **Hosting/deploy:** Vercel (`vercel.json` present; `.vercel` gitignored).

**Progressive-enhancement contract (important for auditing):**
Each page's `<head>` runs `document.documentElement.classList.add('js')` as its first
script. CSS uses `html:not(.js)` fallbacks so that with **no JS**, all `.reveal` /
`.reveal-mask` content is shown immediately and the custom cursor / progress bar are
hidden. Everything degrades gracefully: reduced motion, no-WebGL, no-JS, save-data, and
low-power devices are all explicitly handled.

---

## 3. Deployment & hosting (`vercel.json`)

- `cleanUrls: true` → pages are served **without** the `.html` extension (e.g.
  `/contact`). Both `/contact` and `/contact.html` resolve.
- `trailingSlash: false`.
- **Security headers** applied to all routes (`/(.*)`):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - **Note:** there is **no `Content-Security-Policy`** header. The site uses inline
    `<script>`/`<style>` and loads external scripts (Vercel Insights) + Google Fonts —
    relevant for a security/privacy audit.
- **Caching:** `/assets/*` → `public, max-age=31536000, immutable`; `*.html` →
  `max-age=0, must-revalidate`; `sitemap.xml` / `robots.txt` → 1 day.

---

## 4. External / third-party dependencies

Everything the site reaches for beyond its own files (relevant for privacy/security/perf
audits):

| Dependency | How loaded | Endpoint / version | Notes |
|---|---|---|---|
| **Google Fonts** | `<link>` preconnect + stylesheet | `fonts.googleapis.com` / `fonts.gstatic.com` | Instrument Serif (ital 0;1), Geist (300–600), JetBrains Mono (400;500) |
| **FormSubmit** | `fetch()` AJAX from `app.js` | `https://formsubmit.co/ajax/webrivio.co@gmail.com` | Form delivery. **Delivers to `webrivio.co@gmail.com`** (a Gmail address) — *not* the `hello@webrivio.com` shown on the site |
| **Vercel Web Analytics** | `<script defer>` in `<head>` (all pages) | `cdn.vercel-insights.com/v1/script.js` | Pageview analytics |
| **Vercel Speed Insights** | `<script defer>` before `</body>` (all pages) | `cdn.vercel-insights.com/v1/speed-insights/script.js` | Core Web Vitals RUM |
| **GSAP** | vendored `<script>` | `assets/vendor/gsap.min.js` — **3.12.5** | Local, no runtime CDN |
| **ScrollTrigger** | vendored `<script>` | `assets/vendor/ScrollTrigger.min.js` — **3.12.5** | Local |
| **Lenis** | vendored `<script>` | `assets/vendor/lenis.min.js` — **1.1.18** | Smooth scroll, local |

No cookies are set by first-party code; no consent banner is present.

---

## 5. Full repository file map

**Git-tracked: 29 files.** Root screenshot PNGs and `.playwright-mcp/` are local
artifacts (test/QA outputs), gitignored, not part of the site.

### Root
| File | Purpose | Referenced by site? |
|---|---|---|
| `index.html` | Homepage (the flagship page). 769 lines. | — |
| `services.html` | Services & packages (5 services, 3 packages, care plan). 427 lines. | — |
| `process.html` | 4-phase process timeline (Outreach → Demo/Payment → Polish/Setup → Delivery). 296 lines. | — |
| `work.html` | Selected work / portfolio (2 sample builds + before/after). 319 lines. | — |
| `contact.html` | Contact form + FAQ (6 Q&A). 335 lines. | — |
| `404.html` | Not-found page (self-contained inline `<style>`, `noindex`). 117 lines. | — |
| `vercel.json` | Vercel config: clean URLs, security headers, caching. | — |
| `site.webmanifest` | PWA manifest (name, icons, `#050B18` theme, standalone). | Linked by all pages except 404 |
| `sitemap.xml` | Lists `/`, `/services.html`, `/process.html`, `/contact.html`. **Still omits `work.html`.** `lastmod 2026-06-22`. | Search engines |
| `robots.txt` | Allows all + explicitly allow-lists AI crawlers (GPTBot, ChatGPT-User, PerplexityBot, Google-Extended, ClaudeBot, Claude-Web, CCBot, Applebot-Extended). Disallows `/404.html`. Links sitemap. | Crawlers |
| `favicon.ico` | Multi-size favicon. | All pages |
| `.gitignore` | Ignores `.vercel`, `.playwright-mcp/`, and root QA screenshot patterns (`/home-*.png`, `/m-*.png`, `/sec-*.png`). | — |

### `assets/`
| File | Purpose | Used? |
|---|---|---|
| `styles.css` | **Base stylesheet** (1630 lines): tokens, layout, nav, hero, buttons, sections, services, process, portfolio, contact form, footer, full responsive suite. | All pages |
| `enhance.css` | **Enhancement stylesheet** (638 lines): WebGL hero field, work showcase/mockups, before/after slider, money-leak meter, proof gauges, logo strip, testimonials, founder, compare columns, mobile-CTA, process timeline line. | All except `404.html` |
| `app.js` | **Baseline JS** (276 lines), no dependencies. Runs on every page. | All pages |
| `enhance.js` | **Motion layer** (217 lines), needs GSAP + Lenis. | index, work, services, process |
| `hero.js` | **WebGL aurora** hero background (181 lines), standalone. | **index only** |
| `vendor/gsap.min.js` | GSAP 3.12.5. | index, work, services, process |
| `vendor/ScrollTrigger.min.js` | ScrollTrigger 3.12.5. | index, work, services, process |
| `vendor/lenis.min.js` | Lenis 1.1.18. | index, work, services, process |
| `webrivio-logo.png` (~202 KB) | **Canonical brand master.** All icons below are regenerated from this one centered mark (as of `34f9b81`). The old space-named `Webrivio Logo.png` source was deleted in the same commit. | source of truth |
| `logo.png` (~25 KB, 192px) | The **actual nav/footer logo** used in markup (`assets/logo.png`); CSS adds the rounded tile + border. | All pages |
| `favicon.ico` (root) | Multi-size (16/32/48) tab icon; tighter crop for small-size legibility. | All pages |
| `favicon-16.png` (~0.5 KB), `favicon-32.png` (~1.4 KB) | PNG favicons (tighter crop). | All pages |
| `apple-touch-icon.png` (~22 KB, 180×180) | iOS home-screen icon (full-bleed; OS rounds it). | All pages |
| `icon-192.png` (~25 KB), `icon-512.png` (~195 KB) | PWA / manifest icons (`purpose: any`); `icon-512` also = Organization logo in JSON-LD. | manifest / structured data |
| `icon-maskable-512.png` (~120 KB, 512×512) | PWA maskable icon (`purpose: maskable`) — padded so nothing clips under a circular Android mask. | manifest |
| `og-image.png` (~75 KB, 1200×630) | Open Graph / Twitter share image — **rebuilt in `34f9b81`** with the new logo, same path/dimensions (no meta changes needed). | All content pages |

### Local artifacts (NOT part of the website — gitignored, safe to ignore/delete)
- `home-full.png`, `home-hero.png`, `m-hero.png`, `m-reduced.png`, `m-work.png`,
  `sec-compare.png`, `sec-cost.png`, `sec-cta.png`, `sec-proof.png`, `sec-testi.png`,
  `sec-work.png`, `sec-work1.png`, `sec-work2.png` — **QA screenshots** (desktop/mobile
  section captures). Present in the working tree, untracked, and now explicitly
  gitignored (see `.gitignore` above).
- `.playwright-mcp/` — Playwright MCP console logs + page snapshots from testing. Gitignored.
- `.claude/settings.local.json` — enables the Playwright MCP server for this repo. Untracked, excluded via the user's **global** git ignore (`**/.claude/settings.local.json` in `~/.config/git/ignore`), not the repo's `.gitignore`.

---

## 6. Pages — structure & content

All content pages share: fixed pill **nav** + mobile hamburger **drawer**, scroll
**progress bar**, custom **cursor**, **grain overlay** + ambient gradient wash, and a
4-column **footer** with a giant wordmark and dynamic copyright year (`#y` / `#y2` set by
inline JS). Nav links: Work · Services · Process · Contact.

### `index.html` — Homepage
Sections in order:
1. **Hero** — full-viewport. Headline "Websites that *earn* their keep." over the WebGL
   "living field" (`#hero-canvas` + CSS fallback). Availability tag "2 slots remaining —
   July 2026." Trust row ("You own the code", "Live in ~4 weeks", "Replies within 1
   business day"). Two CTAs.
2. **Ticker** — infinite marquee of industries.
3. **(01) Selected work** — 2 `work-feature` articles: a roofing "mockup" (browser +
   floating phone, 3D tilt) and a medspa **before/after slider**. Uses placeholder demo
   sites + a fake "+38%" stat with an asterisk disclaimer.
4. **(02) The unseen cost** — sticky "money-leak" meter with an animated count-up
   ($1,840) + dripping funnel SVG, beside a 4-item bullet list.
5. **(03) What we build** — 12-col `services-grid` of 5 service cards.
6. **(04) The proof** — 4 radial **gauges** (97/100 Lighthouse, 99.9% uptime, `<7` days,
   100% ownership) + industries logo strip + **placeholder testimonials** + founder quote.
7. **(05) Why Webrivio** — 3-column **compare** table (cheap guy / Webrivio / big agency).
8. **Final CTA** block.
- **Structured data:** `Organization` + `WebSite` + `ProfessionalService` (`@graph`).

### `services.html`
- Page header with meta stats. `(01)` five detailed `service-row`s (each with an
  "includes" grid). `(02)` three **packages**: Foundation, **Flagship** (featured / "Most
  popular"), Flagship+ — all CTA to contact, **no prices shown**. `(03)` optional
  month-to-month care plan + stats grid. Final CTA.
- **Structured data:** `BreadcrumbList` + `Service` with an `OfferCatalog`
  (Foundation / Flagship / Flagship+).

### `process.html`
- 4 phases as a scroll-driven **timeline** (`.proc-timeline`, line draws on scroll via
  GSAP on desktop): **01 Outreach → 02 Demo & Payment → 03 Polish & Setup (7 days) → 04
  Delivery** (managed hosting *or* GitHub/source handoff). "What we need from you" split
  section. Final CTA.
- **Structured data:** `BreadcrumbList` + `HowTo` (`totalTime: P7D`, 4 steps).

### `work.html` (new/untracked)
- Page header with meta stats. **Project 01 (Roofing)** — mockup + standalone before/after
  slider, fake "+38%" result. **Project 02 (Medspa)** — before/after inside the stage,
  fake "2.4×" result. Final CTA. Both "Visit live" links are `href="#"` placeholders.
- **Structured data:** `BreadcrumbList` + `CollectionPage`.

### `contact.html`
- Page header. **Two-column layout:** left = the project-inquiry **form panel**; right =
  sticky sidebar with direct-contact card (email, phone, "book a call" placeholder) +
  availability card. Below: **FAQ** accordion (6 `<details>`).
- **Structured data:** `BreadcrumbList` + `ContactPage` + `FAQPage` (6 Q&A).
- Loads **only `app.js`** (plus `styles.css` + `enhance.css`) — no motion libraries.

### `404.html`
- Self-contained: giant gradient "404", copy, two CTAs. Inline `<style>` block; loads
  `styles.css` only (**no `enhance.css`**, no motion libs, `app.js` only). `noindex,
  follow`. Nav omits the Work link and uses a "Book a call" CTA.

---

## 7. Per-page asset-loading matrix

Loading is **not uniform** — this is core to "how it actually works":

| Page | styles.css | enhance.css | app.js | GSAP+ST+Lenis | enhance.js | hero.js | Vercel Analytics | Speed Insights | Sticky mobile-CTA |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `index.html`    | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `work.html`     | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `services.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `process.html`  | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `contact.html`  | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `404.html`      | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

- `hero.js` (WebGL) is **index-only**.
- `contact.html` links `enhance.css` but never loads `enhance.js` or the motion libs — its
  interactivity (form, industry chips) lives entirely in `app.js`.
- All pages load Vercel Analytics (head) + Speed Insights (foot).

---

## 8. Design system

Defined as CSS custom properties in `assets/styles.css:6-42`. **Dark theme only.**

### Color tokens
| Token | Value | Role |
|---|---|---|
| `--bg` | `#050B18` | Page background (also `theme-color`, manifest bg) |
| `--bg-soft` | `#0A1426` | Raised background |
| `--surface` / `--surface-2` | `#0E1B33` / `#132444` | Cards / raised cards |
| `--border` / `--border-strong` | `rgba(123,164,255,.14)` / `.32` | Hairlines |
| `--ink` / `--ink-soft` | `#EEF3FC` / `#C2CEE4` | Primary / soft text |
| `--mute` / `--mute-2` | `#7E8EA9` / `#56658A` | Muted / faint text |
| `--accent` | `#4D7EFF` | Primary blue |
| `--accent-glow` | `#7BA4FF` | Lighter accent (highlights, italics) |
| `--accent-deep` | `#1E3F99` | Deep blue |
| `--cyan` | `#7FE3FF` | Cyan highlight / gradients |

### Typography
- `--serif`: **Instrument Serif** (Cormorant Garamond, Georgia fallback) — display
  headings, italic accents.
- `--sans`: **Geist** (Inter Tight, system-ui fallback) — body/UI.
- `--mono`: **JetBrains Mono** (Geist Mono, ui-monospace fallback) — eyebrows, labels,
  meta.
- Display headings use `clamp()` fluid sizing throughout; italic (`.it`) accents in
  accent-glow are a recurring motif.

### Other tokens
- Radii: `--r-sm 6px`, `--r-md 14px`, `--r-lg 22px`, `--r-xl 32px` (buttons/chips use
  `999px` pills).
- Easing: `--ease cubic-bezier(.2,.7,.2,1)`, `--ease-out cubic-bezier(.16,1,.3,1)`.
- Layout: `--container 1440px`, `--gutter clamp(20px,4vw,56px)`, plus
  `env(safe-area-inset-*)` for notch/home-indicator safety.

### Responsive breakpoints
`1024px` (grids collapse to 1-col), `860px` (nav → hamburger drawer; mobile-CTA shows),
`768px` (lighter blurs/orbs), `640px` (small-phone tuning), `max-height:560px` (landscape
— drop forced min-heights), `380px` (very small phones). Tablet tuning `641–1024px`;
process timeline line only `≥1025px`. Full `prefers-reduced-motion` and `print`
stylesheets included.

### Component inventory (where to look)
- Nav pill + hamburger + fullscreen drawer — `styles.css:208-363`
- Progress bar / custom cursor / grain + ambient wash — `styles.css:88-111,366-388`
- Reveal utilities (`.reveal`, `.reveal-mask`, no-JS fallback) — `styles.css:419-456`
- Hero (home) + orb — `styles.css:458-521`; WebGL field + scrim — `enhance.css:14-55`
- Ticker marquee — `styles.css:523-552`
- Buttons (primary/ghost) + magnetic glow — `styles.css:173-206`, `enhance.css:76-90`
- Services grid / cards — `styles.css:587-655`
- Compare columns ("You are here") — `enhance.css:542-577`
- Work showcase: `work-feature`, `mockup`, floating phone, demo-site palettes —
  `enhance.css:160-323`
- Before/after slider — `enhance.css:325-382`
- Money-leak meter + funnel + drips — `enhance.css:387-430`
- Proof gauges (SVG radial) — `enhance.css:435-467` (+ shared `#gaugeGrad` in `index.html`)
- Logo strip / testimonials / founder — `enhance.css:469-537`
- Contact form panel / fields / chips / sidebar / avail card — `styles.css:1176-1467`
- Process phases + sticky number + timeline — `styles.css:1119-1174`, `enhance.css:579-602`
- Footer — `styles.css:946-995`
- Sticky mobile CTA — `enhance.css:92-137`

---

## 9. JavaScript behavior

### `assets/app.js` — baseline (all pages, no dependencies)
Single IIFE, reads `prefers-reduced-motion` once. Provides:
- **Scroll progress bar** width (`.progress`).
- **Custom cursor** with lerp follow — only when `pointer: fine` and motion allowed;
  grows on hover over interactive elements; otherwise `display:none`.
- **Reveal-on-intersect** via `IntersectionObserver` (`.reveal`, `.reveal-mask` word
  masks). Under reduced motion, everything is shown immediately. `[data-stagger]` adds
  incremental delays; `[data-split-words]` splits text into masked words.
- **Mobile nav drawer**: open/close, `aria-expanded`/`aria-hidden` toggling, body-scroll
  lock, focus first link on open, **Escape** to close, close on link click.
- **Marquee duplication**: clones `.ticker-track` / `.logo-track` content for seamless
  loop (disabled under reduced motion).
- **Chip toggles** (industry selector): single/multi (`data-multi`), mirrors selection
  into an adjacent hidden `<input name="industry">`, keyboard-accessible (role=button,
  tabindex, Enter/Space).
- **Contact form** (see §10).
- **Parallax** for `[data-parallax]` (rAF, disabled under reduced motion).
- **Active nav link** highlighting by pathname; **footer year** injection.

### `assets/enhance.js` — motion layer (index, work, services, process)
Loads after Lenis + GSAP; feature-detects both and no-ops if missing or reduced motion.
- **Lenis smooth scroll** wired into GSAP ticker + ScrollTrigger; smooth anchor scrolling
  with `-90px` offset. `window.lenis` exposed for debugging.
- **Count-up numbers** (`[data-count-to]`, with `data-count-dec/dur/comma/prefix/suffix`),
  triggered in view; jumps to final value under reduced motion.
- **Radial gauges** (`.gauge[data-gauge]`) animate `stroke-dashoffset` in view.
- **Before/after sliders** (`.ba`): pointer drag + native range input (keyboard),
  `--pos` clip.
- **Money-leak drips** spawned via WAAPI into the funnel while in view.
- **Magnetic buttons** (`[data-magnetic]`) and **3D mockup tilt** (`.work-stage`) — fine
  pointer + motion only.
- **GSAP ScrollTrigger choreography**: work-stage parallax, phone float, process
  timeline-line draw.
- **Sticky mobile-CTA** reveal on scroll (hidden near page bottom).
- `ScrollTrigger.refresh()` after `document.fonts.ready` (serif metrics shift layout).

### `assets/hero.js` — WebGL "living field" (index only)
Dependency-free WebGL fragment shader painting a slow **aurora/nebula** in the brand
palette behind the hero headline.
- **Self-skips** on: `prefers-reduced-motion`, `navigator.connection.saveData`, no WebGL
  context, or shader compile/link failure. A CSS mesh-gradient fallback
  (`.hero-field::before`) is **always painted** underneath regardless.
- **Performance:** caps DPR (1.0 on low-mem/low-CPU, else 1.5), renders at 0.85 internal
  scale, ~40 fps cap, and **pauses** when the hero scrolls off-screen or the tab is
  hidden. Cursor gently warps the flow. Fades in via `#hero-canvas.on`.

---

## 10. Contact form flow (wiring)

Markup: `contact.html:155-214`. Handler: `assets/app.js:177-247`.

- **Endpoint:** `<form action="https://formsubmit.co/webrivio.co@gmail.com" method="POST">`.
  `app.js` rewrites this to the **AJAX** endpoint (`/ajax/…`) and `fetch()`es it with
  `Accept: application/json`, so there is no page redirect on success.
- **Fields:** `name*`, `email*`, `business*` (required); `phone` (optional); `industry`
  (hidden input populated by the chip selector); `message` (textarea). `novalidate` on the
  form; validation done via `form.checkValidity()` + `reportValidity()`.
- **FormSubmit config (hidden inputs):** `_subject`, `_template=table`, `_captcha=false`,
  `_next=https://webrivio.com/contact.html?sent=1`.
- **Honeypot:** hidden `_honey` field; if filled, the handler silently "succeeds" (bot
  trap).
- **UX:** button shows "Sending…" → success/`ok` or error/`err` messages in a
  `role="status" aria-live="polite"` region; resets the form and clears active chips on
  success; re-enables after ~3.8 s. On network failure it tells the user to email
  `hello@webrivio.com`.
- **Fallback:** if a non-AJAX submit ever redirects back with `?sent=1`, `app.js` shows
  the success message and cleans the URL.
- ⚠️ **Delivery address is `webrivio.co@gmail.com`**, which differs from the
  `hello@webrivio.com` shown throughout the UI and structured data.

---

## 11. Accessibility features present

- Skip-link to `#main`; visible-focus styling (`:focus-visible`) with accent outline.
- Semantic landmarks: `<nav aria-label>`, `<main id="main">`, `<footer role="contentinfo">`,
  sections with `aria-labelledby`.
- Nav drawer: `role="dialog"`, `aria-modal`, `aria-hidden` toggled, focus management,
  Escape-to-close.
- Form: labels for every field, `aria-live` status region, required markers, `inputmode`
  hints, autocomplete tokens.
- Industry chips: `role`/`tabindex`/keyboard added in JS; before/after has a real
  keyboard-operable `<input type="range">`.
- Decorative elements marked `aria-hidden`; icons `focusable="false"`/`aria-hidden`.
- **Full `prefers-reduced-motion` support**: reveals shown instantly, marquees/WebGL/tilt
  disabled, transitions near-zeroed globally.
- Minor observations (not errors, for the auditor): `contact.html` nav-brand uses
  `alt="Webrivio"` *and* the link has `aria-label` (double-labeling), whereas
  `index.html`/`work.html` use `alt=""` (correct, since the link is already labeled).

---

## 12. SEO & structured data

- Every content page: unique `<title>`, `<meta description>`, `keywords`, self-referential
  `canonical`, full Open Graph + Twitter Card tags (shared `og-image.png`), theme-color,
  manifest link, favicons/apple-touch icon.
- **JSON-LD per page:** Organization/WebSite/ProfessionalService (index), Service +
  OfferCatalog (services), HowTo (process), CollectionPage (work), ContactPage + FAQPage
  (contact), Breadcrumbs on subpages. `404` is `noindex, follow`.
- `sitemap.xml` + `robots.txt` (AI-crawler-friendly) present.
- Note: `canonical` and `sitemap.xml` reference `.html` URLs while `cleanUrls` serves
  extensionless — both resolve, but they point at the `.html` variant.

---

## 13. Current state, placeholders & intentional gaps

**These are intentional and by design — an auditor should NOT flag them as bugs/deception.**
The site is built as a template ready to receive real content, and it labels its own
placeholders honestly.

- **"Demo sites" are pure CSS mockups**, not real websites. The browser/phone frames in
  Selected Work and the before/after panes are styled `<div>`s (`.demo-site`,
  `.demo-roof`, `.demo-medspa`, `.demo-old`, …), marked with visible **`Sample build ·
  SWAP`** / **`Before / after · SWAP`** tags and `data-placeholder`.
- **Result figures are placeholders with disclaimers.** "+38% quote requests", "2.4×
  consults", the "$1,840" leak, and the "97 / 99.9% / <7 / 100%" gauges are illustrative;
  the page prints "*Result figures are placeholders — replace with your own verified
  numbers.*" and "Illustrative — the monthly leak."
- **Testimonials are empty placeholder slots** (dashed borders, "Your name / Your business
  · City", `tnote`: "Real client words go here — yours could be the first").
- **Founder photo/name are placeholders** ("Photo · SWAP", "— The founder, Webrivio").
- **Dead/placeholder links (`href="#"`):** footer social links (Instagram/LinkedIn/
  Dribbble), the "Book directly / 15-min fit call" link on contact, and "Visit live" links
  on `work.html`. `sameAs: []` in Organization schema is empty.
- HTML comments throughout mark every spot to replace (search the codebase for **`SWAP`**,
  **`EDIT:`**, `data-placeholder`).

---

## 14. Observed content/config inconsistencies

*Observational, factual, and **not exhaustive** — surfaced here so the auditor understands
the current state, not as a complete defect list. Verify against intent before acting.*

1. **Availability dates are inconsistent across pages.** `index`, `services`, `process`,
   `work` say **"July 2026"** (footer "Booking July 2026"; hero "2 slots remaining — July
   2026"). But `contact.html` says **"May 2026 discovery slots," "Two build slots
   remaining for Q2," "June projects booking now,"** and footer **"Booking May 2026."**
   (Today is 2026-07-03, so contact's dates are already in the past.)
2. **Form delivery address ≠ displayed email.** Form → `webrivio.co@gmail.com`; site shows
   `hello@webrivio.com` (see §10/§4).
3. **`contact.html`'s mobile nav-drawer and footer sitemap omit the "Work" link**, even
   though its desktop nav includes it. The drawer lists Services/Process/Contact only
   (CTA reads "Book a call"); every other page's drawer includes Work. The footer
   "Sitemap" column lists Home/Services/Process/Contact — no Work.
4. **`sitemap.xml` omits `work.html`** entirely and lists only `.html` URLs.
5. **`canonical` tags and `sitemap.xml` use `.html`** while Vercel `cleanUrls` serves
   extensionless URLs.
6. **`404.html` nav differs** (omits Work, uses "Book a call" CTA, no `enhance.css`).
7. **Brand icons consolidated:** all icons/favicons are regenerated from one centered
   master (`assets/webrivio-logo.png`); the old space-named `Webrivio Logo.png` source
   was removed in `34f9b81`.

---

## 15. Git state

- **Branch:** `master`, clean working tree, up to date with `origin/master`. A stale
  remote branch `vercel/install-vercel-web-analytics-h8t2ni` still exists (already
  merged via PR #2, `72cc8bc`) but nothing local depends on it.
- **`HEAD`:** `48f7091`.
- **Latest commits (newest first):**
  - `48f7091` chore: ignore local QA screenshots and .playwright-mcp artifacts
  - `34f9b81` feat: unify brand logo across all icons + rebuild OG card — **this is the
    commit that also shipped the previously-uncommitted enhancement layer** (work.html,
    enhance.css/js, hero.js, vendor libs); see its message for the explicit note
  - `d1bb4a7` feat: replace brand logo with new Webrivio mark + optimize icons/SEO
  - `6b65b92` fix: update phone number to (437) 227-7186
  - `8026503` feat: remove pricing from site, replace with inquiry CTA
  - `0d9f128` ci: trigger redeploy
  - `5b14ef2` fix: replace em dash with hyphen in all page title tags
  - `5bf7041` fix: hero sections fit viewport on mobile; update delivery & revisions stats
  - `6cf4be4` fix: optimize mobile layout and responsiveness across all pages
  - `5dd9022` fix: use CDN URL for Vercel Speed Insights on static HTML site
  - `3192f6f` Merge branch 'master' of .../webriviofinal · `89a63ca` sync ·
    `72cc8bc` Merge PR #2 (Vercel Web Analytics) · `a706496` Install Vercel Web Analytics ·
    `99cf3c4` Update process flow copy · `f79a735` Remove portfolio case studies ·
    `69480d8` Revert to original SVG logo, drop new PNG brand assets ·
    `9b828cd` Update brand to new W mark, wire live contact form, add Speed Insights ·
    `34cbee1` Simplify hero section for better clarity · `6333bef` Initial commit
- **Evolution:** pricing was removed, portfolio case studies were removed then
  re-introduced as `work.html`, analytics were added, the brand mark was swapped and
  then unified across every icon/OG asset, and the whole motion/WebGL/enhancement layer
  (once sitting uncommitted) landed in `34f9b81`.
- **Only untracked file in the repo right now:** this document (`Repository info.md`).

---

*Document reflects `HEAD` (`48f7091`) as of 2026-07-03 — a clean working tree, no
outstanding divergence. Regenerate if new commits land or the working tree picks up
uncommitted changes again.*
