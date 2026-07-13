# QJS

This repo contains the scanner we have been running locally.

It scans known quant and financial-services companies, refreshes official ATS/career pages, and writes CSV/Markdown results plus raw/audit JSON files.

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

Modes:

- `v1`: known ATS boards only
- `v2`: known ATS boards, then expanded quant-company career-page search
- `broad`: known ATS boards, then broader US financial-services search
- `swe`: 2027 software/technology/engineering internships across the QJS company universe
- `all`: runs the full workflow

## Main Outputs

After a run, look for:

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

Generated outputs are intentionally ignored by git so the repo stays clean. If you want to preserve a specific day's results, copy those output files somewhere else or commit them deliberately after editing `.gitignore`.

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
npm run scan:all
```

## Notes

- `company_career_pages.json` is the current seeded career-page database.
- `tools/discover-career-pages.mjs` and `tools/export-discovered-career-pages.mjs` are optional helper scripts from the discovery work.
- `.scan-state/previous_scan_time.txt` is local state for comparing runs; it is ignored by git.
