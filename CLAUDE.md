# Webrivio — project rules

Static site. No build step. `git push` to `master` deploys to Vercel automatically.

**Before you finish any change to this repo, run:**

```bash
python tools/seo-check.py     # exits 1 if something is broken — do not deploy on a failure
```

**After the change is deployed:**

```bash
python tools/indexnow.py      # re-pings Bing/Yandex. Google is separate (Search Console).
```

---

## The facts. Do not contradict these, do not invent beyond them.

- **Webrivio** is a web design studio in **Toronto, Ontario**. Service-area business — **no public street address**. Serves Toronto + the GTA (North York, Scarborough, Etobicoke, Mississauga, Brampton, Markham, Vaughan, Richmond Hill).
- **Price: from $499 CAD.** Never print any other price as ours. Never $449 or $649.
- **Delivery: live in 48 hours — *once the client provides their content and payment*.** That condition is what makes the claim honest. **Never state 48 hours unconditionally**, including in schema.
- **Phone:** `+1-437-494-1295` (display `(437) 494-1295`) · **Email:** `hello@webrivio.com`
- **Founders:** Rudra Garg (Founder & Designer) · Ayzah Ashraf (Co-founder, Client Relations & Outreach)
- **Credential:** backed by a $3,000 Summer Company grant, Province of Ontario. It is a startup grant, **not** a government endorsement of the work.

## Hard prohibitions

- **Client status (owner-confirmed 2026-08-11): two real engagements** — Mane Obsession (delivered, live at maneobsessionsalon.ca) and Milestone Roofing (rebuild nearing launch). The site may describe them as client builds but **still never names them** — names go on the site only **with the owner's written permission**. Everything else stands: no testimonials, no logos, no "trusted by N", no client counts, nothing invented.
- **Never add `AggregateRating` or `Review` schema.** Google disallows self-serving review markup on `LocalBusiness`/`Organization`; it risks a manual action. **Reviews live on the Google Business Profile**, where stars appear in the map pack with no markup at all.
- **Never invent a statistic, percentage, result, award, or certification.** The on-page figures (97/100 Lighthouse, 99.9% uptime, $1,840/mo) are **targets and illustrative estimates** and already carry those qualifiers — keep them.
- **Northline Roofing** (a fictional brand) is the one remaining **concept build**, shown on the home page and the roofing guide. Never imply it was commissioned. Never put a real company's name on it — the original carried a real Toronto roofer's identity and had to be scrubbed. **Luxe Tea was removed from the site entirely (Aug 2026)** — do not bring it back.
- `/case-studies` (added Aug 2026) shows **client builds** (the Muskoka roofing rebuild, the BC salon) and **demo builds**, screenshotted from `Documents/Webrivio/client-sites`. The rule there: real business names may appear **inside screenshots only** — never in copy, alt text, meta, schema, or asset filenames (filenames are industry-neutral: `cafe-*`, `noodlestall-*`, `salon-*`, `roofing-muskoka-*`, `lawfirm-*`). URL-bar chrome uses fake `*.demo` domains or plain status text. Never use the `avivar2` demo (that is the scrubbed roofer), and never re-add Stush Foods or 22K Nails (owner removed them).

---

## Changing the VISUALS (safe — go wild)

Layout, colours, spacing, type, animation, imagery, a full redesign — **none of it affects SEO.** Google does not rank aesthetics. You may freely edit:

- `assets/styles.css`, `assets/enhance.css`, `assets/about.css`, `assets/guide.css`, `assets/legal.css`
- any page-local `<style>` block
- `assets/app.js`, `enhance.js`, `hero.js`, `atmosphere.js`

**The two things that would actually break something:**

1. **Never hide content behind JavaScript.** `.reveal` starts at `opacity: 0` and only `app.js` adds `.in`. The rescue is `html:not(.js) .reveal { opacity: 1 !important }` in `styles.css` — that is what keeps 100% of the copy visible to crawlers that don't run JS. **Do not remove it**, and do not invent a new JS-gated hiding mechanism.
2. **Do not re-gate the hero.** The `<h1>` on `index.html` deliberately has **no** `.reveal`/`.reveal-mask` class — it is the LCP element and must paint on the first frame, without JS. Its entrance is pure CSS.

Design system tokens live in `:root` in `styles.css` (`--bg`, `--ink`, `--accent`, `--serif`, `--sans`, `--mono`, …). Use them; don't hardcode hex.

## Changing the COPY (careful — one real trap)

Editing wording is fine. **But several strings exist in TWO places** — the visible page *and* the JSON-LD. Change one without the other and the structured data contradicts the page, which is a violation:

| If you edit… | You must also update… |
|---|---|
| an FAQ answer (`<details>`/`<summary>`) | the matching `FAQPage` `acceptedAnswer` in that page's JSON-LD, **verbatim** |
| the price | `priceSpecification` / `Offer` in `index.html` + `services.html` |
| the 48-hour wording | the `HowTo` on `process.html` and the Organization `description` on `index.html` |
| the phone or email | every `tel:`/`mailto:` **and** the schema **and** the Google Business Profile (NAP must match exactly) |

`tools/seo-check.py` catches all of these. Run it.

## Copy register (locked in, Aug 2026 humanization pass)

- **No em dashes in any rendered string.** That means visible copy, `<title>`s, meta/OG/alt attributes, JSON-LD, `llms.txt`, `site.webmanifest`, and the user-facing strings in `app.js`/`contact.js`. Use a period, comma, colon, or `·`. HTML/CSS/JS *comments* are exempt.
- **Titles:** one clean line, ≤60 chars, no em dash (Google was wrapping the old ones). **Descriptions:** 120–155 chars, written as the business speaking (we/you), never "Webrivio is a…".
- **Price language:** "from $499" or "$499", never "flat $499" or "flat, scope-dependent" (they contradict). The formula: *from $499, a fixed number agreed before we start.*
- **The funnel promise, identical everywhere:** form reply within one business day → free 15-20 minute fit call → price in writing at the call. Never "demo" for the first call, never a price promised in the email reply.
- **en-CA:** inquiry (not enquiry), postal codes (not postcodes); colour/neighbourhood/centre stay Canadian.

## Never do these

- **Change a page's URL/slug.** It destroys the indexing that was earned. If you truly must, add a 301 in `vercel.json`.
- Delete a page, remove an `<h1>`, or ship a page with more than one.
- Skip heading levels (`h2` → `h4`). The footer columns are `<h2>` for exactly this reason.
- Ship an `<img>` without `alt`.
- Add `<meta name="keywords">` (obsolete; hands competitors your target list).
- **Overwrite an `/assets` image in place.** Images ship with a 1-year `immutable` cache (`vercel.json`) — returning visitors would keep the stale file for up to a year. To replace one (e.g. swapping a case-studies screenshot after a client site launches), save it under a new name (`…-v2.jpg`) and update the references.
- **Commit anything internal to the deploy.** `Repository info.md` was once publicly served at `webrivio.com/Repository%20info.md` — 30KB of internal notes, indexable. `.vercelignore` now keeps `tools/`, `*.md`, and the audit dir out of the deployment. Keep it that way.

---

## Files

- `index.html` **owns the canonical schema graph** — `Organization`, `ProfessionalService`, `WebSite`, and both `Person` nodes. Every other page references them by `@id`. **Never re-declare them elsewhere.**
- `llms.txt` — the map for AI crawlers (`robots.txt` explicitly invites GPTBot, ClaudeBot, PerplexityBot et al). Update it when pages change.
- `sitemap.xml` — must list exactly the 9 live pages. `seo-check.py` enforces this.
- `tools/` — never deployed. `seo-check.py` (pre-deploy guard) and `indexnow.py` (post-deploy ping).
- `tools/gbp-photos/` — Google Business Profile upload pack at Google's exact dimensions.

## The honest strategic picture

The code is in good shape. **What limits ranking now is off-site: zero reviews and zero backlinks.** No schema, keyword, or code change moves that. Real reviews on the Google Business Profile and real clients are the whole game. Don't let anyone (including an AI) tell you a code change will fix it.
