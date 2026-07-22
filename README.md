# QJS

This repo contains the scanner we have been running locally. The goal is that GitHub is the shared source of truth, so different laptops or Codex agents can pull the repo, run the same scan, and see the same latest reports.

It scans known quant and financial-services companies for quant, trading, research, strategy, software, and engineering internships. It refreshes official ATS/career pages and writes CSV/Markdown results plus raw/audit JSON files.

## Requirements

- Node.js 18+

## Run

From the repo folder:

```bash
npm run scan:all
```

You can also run a specific mode:

```bash
npm run scan:v1
npm run scan:v2
npm run scan:broad
npm run scan:swe
```

To run the quant scanner and automatically publish the refreshed reports to GitHub:

```bash
npm run scan:v2:publish
```

To run every scanner and publish:

```bash
npm run scan:all:publish
```

Modes:

- `v1`: known ATS boards only
- `v2`: known ATS boards, then expanded quant-company career-page and web search, including strategy internships
- `broad`: known ATS boards, then broader US financial-services search
- `swe`: 2027 software/technology/engineering internships across the QJS company universe
- `all`: runs the full workflow

## Main Outputs

After a run, look for:

- `LATEST_QUANT_SCAN.md`
- `quant_internship_roles_scan.csv`
- `quant_internship_roles_scan.md`
- `quant_internship_roles_scan_v2.csv`
- `quant_internship_roles_scan_v2.md`
- `us_financial_services_internship_scan.csv`
- `us_financial_services_internship_scan.md`
- `swe_2027_internship_scan.csv`
- `swe_2027_internship_scan.md`
- `*_raw.json`
- `*_audit.json`
- `quant_roster_scan_audit.md` (the 303-entry roster split into confirmed and unverifiable scan states)
- `new_quant_roles_since_last_run.md` (new stable job URLs grouped by region)
- `current_quant_roles_not_in_tracker.md` (current roles absent from the older application tracker, grouped by region)

Generated outputs are intentionally tracked. Each publish run commits the refreshed scanner code, career-page database, dashboard, Markdown reports, CSV files, raw JSON, and audit JSON to GitHub.

## GitHub Publishing Workflow

Use this as the normal workflow on any machine:

```bash
git pull
npm run scan:v2:publish
```

The publish step:

- rebuilds `LATEST_QUANT_SCAN.md`
- commits any changed scanner files and generated reports
- pushes the current branch to `origin`

You can also publish already-generated local changes without scanning:

```bash
npm run publish
```

## GitHub Setup

```powershell
git init
git add .
git commit -m "Add QJS"
git branch -M main
git remote add origin https://github.com/jiang6082/QJS.git
git push -u origin main
```

On the other laptop:

```bash
git clone https://github.com/jiang6082/QJS.git
cd QJS
npm run scan:v2:publish
```

## Notes

- `company_career_pages.json` is the current seeded career-page database.
- `quant_firm_roster.json` preserves the complete 303-entry firm list and its canonical aliases.
- Every `v2` or `all` run rebuilds `quant_roster_scan_audit.json` and `.md`, separating confirmed no-posting/no-match results from companies the scanner could not fully verify.
- The v2 full-list Markdown and CSV include geographic regions; the Markdown is grouped into North America, Europe, Asia, Oceania, Middle East, South America, Africa, multi-region, and remote/unspecified sections.
- `import_quant_roster_career_pages.mjs` reproducibly cleans known false-positive URLs and imports reviewed official career/ATS sources.
- `tools/discover-career-pages.mjs` and `tools/export-discovered-career-pages.mjs` are optional helper scripts from the discovery work.
- `.scan-state/previous_scan_time.txt` is local state for comparing runs; it is ignored by git.
- The committed `quant_internship_roles_scan_v2_raw.json` file is the cross-device baseline for the next comparison. A fresh clone can compare against the last pushed full scan after its first run.
