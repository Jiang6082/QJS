# Custom-ATS daily watch

Some firms host careers on anti-bot SPAs or dead origins that the main scanner
(`scan_quant_internships.mjs` / `expand_us_financial_services_search.mjs`) can't
fetch from Node. Instead of brittle private-API reversing, an agent renders each
site in a browser once a day and diffs the visible roles.

## What runs daily

For each entry in `watchlist.json`:

1. Open `url` in the browser (renders JS, bypasses basic anti-bot).
2. Read role text from every element matching `selector`
   (title + location, e.g. `"Software Engineer – Intern (Europe) London"`).
3. Diff against `snapshots/<key>.json`.
4. Report any **new** roles (present now, absent in the snapshot) and any
   **removed** roles, then overwrite the snapshot with the current set.

If a site is unreachable that day (e.g. DV Trading's 526), skip it and leave its
snapshot untouched — do not blank it.

## Why these are here (not in the main scanner)

- **Citadel / Citadel Securities** — Cloudflare 403 to Node; roles render
  client-side via a WordPress AJAX action. Browser reads them fine.
- **DV Trading** — origin returns `526 Invalid SSL` even in-browser; kept on the
  list so the daily check picks it up if/when it recovers.

Firms that turned out to be scriptable were moved into the main scanner instead
(e.g. Maven Securities → Greenhouse `mavensecuritiesholdingltd`, DL Trading →
Greenhouse `confidentialsportstradingfirm`).

## Scope note

`emeaRelevant: true` marks London/EMEA-heavy boards to prioritise (relevant for
LSE-based recruiting).
