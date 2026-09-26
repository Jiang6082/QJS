# Pipeline correctness review

The refresh now keeps source observations, confirmed changes, and unresolved absences distinct. A source outage must not manufacture a closure, and a report rebuild must not manufacture a newly posted role.

## Corrections

| Problem | Corrected behavior |
| --- | --- |
| The confirmation pass reused the first pass's known-board CSV. | Both passes run the known-board scanner and the expanded scanner. The committed confirmation manifest records each pass and its baseline. |
| A role seen only in the second pass could be announced as confirmed new. | Additions require presence in both independent passes. |
| Two failed fetches could be interpreted as a closure. | Closure requires successful absence evidence from that posting's own source in both passes. Partial boards, access denials, and parsing failures stay unresolved. |
| Closure records used a previous scan's time even when the posting was already absent. | Last-seen times come from actual saved observations. Legacy dates are repaired from Git history; missing evidence remains unknown. |
| Reopening a URL prevented a later closure from being archived. | The archive records separate closure events and annotates reopening. Rebuilding the same scan is idempotent. |
| Hard-coded job and program links were counted as freshly verified open roles indefinitely. | Job seeds are checked against current official posting data. Generic program pages and unverified search results do not enter the current open-role count. |
| Goldman Sachs used one page and a single keyword. | All campus pages are requested before the internship and domain filters are applied, including campus off-cycle roles. |
| Workday search caps silently lost postings, and redirected hosts generated malformed links or duplicate jobs. | Searches paginate further, incomplete coverage is recorded, redirected links retain the recruiting tenant/site path, and equivalent URLs share a tenant/requisition identity. |
| The base CSV discarded source metadata and could break on embedded newlines. | The expanded scanner reads the structured known-board results and preserves departments and posting-date fields. |
| Posting dates were joined through a global numeric-ID lookup and could leak between unrelated sources. | Dates travel with the specific posting in scan metadata; report generation makes no additional live date lookup. |
| Ashby edit timestamps, date-only timezone shifts, and “30+ days” labels could become exact release dates. | Only employer publication fields and dated relative labels are used. Date-only values retain their day; bounded ages are not exact dates. Relative-date evidence is labeled. |
| The rolling report could reintroduce roles from the older scanner and use the render date. | The quant report uses the current confirmed scan and its calendar date. Date and discovery observations are tracked for other clones. |
| Earlier graduation months in job descriptions could exclude a 2027 internship. | Internship timing is evaluated separately from graduation eligibility. |
| Manual verification could remain “verified today” after a later same-day disappearance. | Every check records its outcome, and missing or unsupported roles lose current verification. |
| Publisher staged every local file and stopped retrying after a successful commit followed by a failed push. | It stages only generated artifacts, refuses unrelated staged files, validates first, retries pushes from a clean worktree, and checks the remote commit. |
| The Windows entry point and single-pass commands could bypass the protected workflow. | Supported entry points delegate to the same refresh. Diagnostic scans cannot publish. |
| A failed or concurrent refresh could mix histories and reports. | A lock prevents concurrent refreshes. A failed child step restores previous generated files. |
| Validation could pass with stale reports or unproven closures and ran before README generation. | Validation now checks final report membership, timestamps, date windows, confirmation hashes, closure evidence, critical sources, cumulative preservation, and README counts. |

## Verification

Regression checks run with `npm test` and in GitHub Actions on Node 18 and 22. They cover timing, URL identity, Workday redirects, confirmation, source outages, reopening, idempotence, stale reports, manual seed verification, and publishing scope.

A controlled interruption of a live source child process verified that the refresh restores the previous generated artifacts and releases its lock. Final scan results are recorded in [workflow validation](../reports/scan_validation.md) and [confirmation evidence](../data/scan_confirmation.json).

## Source semantics and limits

Ashby's `publishedAt` is the last publication timestamp and `isListed=false` identifies a posting excluded from its public board. These are handled according to [Ashby's public API documentation](https://developers.ashbyhq.com/docs/public-job-posting-api). A source publication date can reflect a repost.

The current-role list is an observation of the sources that responded. Unresolved postings remain in the cumulative/stability history and are listed in the missing-but-unconfirmed section. A career page responding successfully is not by itself proof that its jobs were fully enumerated.

Use a normal clone with Git history, Node.js 18 or newer, and `npm run refresh:v2:publish`. Credentials are only required for the Git push. Diagnostic source runs deliberately leave the published reports untouched until the protected refresh is run.
