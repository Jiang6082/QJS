import fs from "node:fs/promises";

const root = new URL("../", import.meta.url);
const db = JSON.parse(await fs.readFile(new URL("inputs/company_career_pages.json", root), "utf8"));
const priorAudit = JSON.parse(await fs.readFile(new URL("data/us_financial_services_internship_scan_audit.json", root), "utf8"));

const knownByCompany = new Map();
for (const row of priorAudit.careerPageScanAudits || []) {
  const current = knownByCompany.get(row.company) || { jobsSeen: 0, boards: new Set() };
  current.jobsSeen = Math.max(current.jobsSeen, row.jobsSeen || 0);
  for (const board of row.boards || []) current.boards.add(board.source);
  knownByCompany.set(row.company, current);
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 QJS-career-source-audit" },
    });
    return { ok: response.ok, status: response.status, url: response.url, text: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, url, text: "", error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function scriptUrls(html, pageUrl) {
  const urls = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => {
      try { return new URL(decodeHtml(match[1]), pageUrl).toString(); } catch { return ""; }
    })
    .filter(Boolean);
  const prioritized = urls.filter((url) => /job|career|greenhouse|lever|ashby|workday|recruit|app|main/i.test(url));
  return [...new Set([...prioritized, ...urls])].slice(0, 20);
}

function addMatches(target, text, regex, indexes = [1]) {
  for (const match of text.matchAll(regex)) {
    for (const index of indexes) if (match[index]) target.add(match[index]);
  }
}

function detectSources(text) {
  const greenhouse = new Set();
  const lever = new Set();
  const ashby = new Set();
  const workday = new Set();
  addMatches(greenhouse, text, /(?:boards-api|api)\.greenhouse\.io\/v1\/boards\/([^/"'\s?]+)\/jobs/gi);
  addMatches(greenhouse, text, /(?:boards|job-boards)\.greenhouse\.io\/embed\/[^?"'\s]*\?[^"'\s]*?\bfor=([^&"'\s\\]+)/gi);
  addMatches(greenhouse, text, /(?:boards|job-boards)\.greenhouse\.io\/([^/"'\s?#]+)/gi);
  addMatches(lever, text, /api\.lever\.co\/v0\/postings\/([^/"'\s?]+)|jobs\.lever\.co\/([^/"'\s?#]+)/gi, [1, 2]);
  addMatches(ashby, text, /api\.ashbyhq\.com\/posting-api\/job-board\/([^/"'\s?]+)|jobs\.ashbyhq\.com\/([^/"'\s?#]+)/gi, [1, 2]);
  for (const match of text.matchAll(/https?:\/\/([^/"'\s]+\.myworkdayjobs\.com)\/([^/"'\s?#]+)/gi)) {
    workday.add(`${match[1]}/${match[2]}`);
  }

  if (/greenhouse\.io\/v1\/boards|greenhouse job board|greenhouse/i.test(text)) {
    addMatches(greenhouse, text, /(?:boardToken|board_token|greenhouseBoard|greenhouse_board)\s*[:=]\s*["']([a-z0-9_-]+)["']/gi);
    addMatches(greenhouse, text, /getJobListing\(\s*["']([a-z0-9_-]+)["']/gi);
  }

  const otherSystems = new Set();
  const systems = {
    icims: /icims\.com/i,
    workable: /workable\.com|apply\.workable\.com/i,
    smartrecruiters: /smartrecruiters\.com/i,
    eightfold: /eightfold\.ai/i,
    oracle: /oraclecloud\.com\/hcmUI|fa\.ocs\.oraclecloud\.com/i,
    phenom: /phenompeople\.com|phenom\.com/i,
    avature: /avature\.net/i,
    brassring: /brassring\.com/i,
    taleo: /taleo\.net/i,
    jobvite: /jobvite\.com/i,
    bamboohr: /bamboohr\.com/i,
    successfactors: /successfactors\.(?:com|eu)/i,
    teamtailor: /teamtailor\.com/i,
    recruitee: /recruitee\.com/i,
    hiringthing: /hiringthing\.com/i,
    paylocity: /paylocity\.com/i,
    adp: /workforcenow\.adp\.com|recruiting\.adp\.com/i,
  };
  for (const [name, pattern] of Object.entries(systems)) if (pattern.test(text)) otherSystems.add(name);

  return {
    greenhouse: [...greenhouse],
    lever: [...lever],
    ashby: [...ashby],
    workday: [...workday],
    otherSystems: [...otherSystems],
  };
}

const genericCompanyTerms = new Set(["capital", "management", "financial", "services", "group", "partners", "investments", "international", "global", "asset"]);
const workdayTenantAliases = {
  "AlphaSimplex": ["virtus"],
  "Castleton Commodities International": ["cci", "osvcci"],
  "Nuveen": ["tiaa"],
};

function isPlausibleWorkdaySource(company, source, pageUrl) {
  const [host] = source.split("/");
  try {
    if (new URL(pageUrl).hostname.toLowerCase() === host.toLowerCase()) return true;
  } catch {}
  const haystack = host.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const tokens = company.toLowerCase().split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !genericCompanyTerms.has(token));
  tokens.push(...(workdayTenantAliases[company] || []));
  return tokens.some((token) => haystack.includes(token.replace(/[^a-z0-9]+/g, "")));
}

async function inspectPage(company, pageUrl) {
  const page = await fetchText(pageUrl);
  let searchable = `${pageUrl}\n${page.url}\n${page.text}`;
  const scripts = [];
  if (page.ok) {
    for (const scriptUrl of scriptUrls(page.text, page.url)) {
      const script = await fetchText(scriptUrl);
      scripts.push({ url: scriptUrl, ok: script.ok, status: script.status });
      if (script.ok) searchable += `\n${script.text}`;
    }
  }
  const title = decodeHtml(page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sources = detectSources(searchable);
  sources.workday = sources.workday.filter((source) => isPlausibleWorkdaySource(company, source, page.url));
  return {
    company,
    pageUrl,
    resolvedUrl: page.url,
    ok: page.ok,
    status: page.status,
    title,
    scripts,
    sources,
  };
}

async function mapLimit(items, limit, fn) {
  const output = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      output[index] = await fn(items[index]);
      if ((index + 1) % 25 === 0) console.error(`audited ${index + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return output;
}

const tasks = [];
for (const [company, entry] of Object.entries(db.companies || {})) {
  for (const pageUrl of entry.careerPages || []) tasks.push({ company, pageUrl });
}

const pages = await mapLimit(tasks, 6, ({ company, pageUrl }) => inspectPage(company, pageUrl));
const companies = Object.keys(db.companies || {}).sort().map((company) => {
  const companyPages = pages.filter((page) => page.company === company);
  const prior = knownByCompany.get(company) || { jobsSeen: 0, boards: new Set() };
  const detected = {
    greenhouse: [...new Set(companyPages.flatMap((page) => page.sources.greenhouse))],
    lever: [...new Set(companyPages.flatMap((page) => page.sources.lever))],
    ashby: [...new Set(companyPages.flatMap((page) => page.sources.ashby))],
    workday: [...new Set(companyPages.flatMap((page) => page.sources.workday))],
    otherSystems: [...new Set(companyPages.flatMap((page) => page.sources.otherSystems))],
  };
  return {
    company,
    priorJobsSeen: prior.jobsSeen,
    priorBoards: [...prior.boards],
    pages: companyPages.length,
    pagesOk: companyPages.filter((page) => page.ok).length,
    detected,
  };
});

const generatedAt = new Date().toISOString();
await fs.writeFile(new URL("data/career-source-audit.json", root), JSON.stringify({ generatedAt, companies, pages }, null, 2));

const unresolved = companies.filter((company) => company.priorJobsSeen === 0);
const lines = [
  "# Career Source Audit",
  "",
  `Generated: ${generatedAt}`,
  `Companies: ${companies.length}`,
  `Previously resolved: ${companies.length - unresolved.length}`,
  `Previously unresolved: ${unresolved.length}`,
  "",
  "## Unresolved Companies",
  "",
];
for (const company of unresolved) {
  const detected = Object.entries(company.detected).filter(([, values]) => values.length).map(([kind, values]) => `${kind}=${values.join(",")}`).join("; ");
  lines.push(`- **${company.company}** - pages ${company.pagesOk}/${company.pages}; ${detected || "no supported or recognized ATS detected"}`);
}
await fs.writeFile(new URL("reports/career-source-audit.md", root), `${lines.join("\n")}\n`);

console.log(JSON.stringify({
  companies: companies.length,
  pages: pages.length,
  unresolved: unresolved.length,
  unresolvedWithSupportedToken: unresolved.filter((company) => company.detected.greenhouse.length || company.detected.lever.length || company.detected.ashby.length || company.detected.workday.length).length,
  unresolvedWithOtherSystem: unresolved.filter((company) => company.detected.otherSystems.length).length,
}, null, 2));
