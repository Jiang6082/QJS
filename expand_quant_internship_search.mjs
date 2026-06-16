import fs from "node:fs/promises";

const baseCsvPath = "quant_internship_roles_scan.csv";
const careerPageDbPath = "company_career_pages.json";

const expandedCompanies = [
  "AQR Capital Management",
  "Acadian Asset Management",
  "AllianceBernstein",
  "Allianz Global Investors",
  "Ares Management",
  "Aspect Capital",
  "Baillie Gifford",
  "BlackRock",
  "BlueCove",
  "BNP Paribas",
  "BMO Capital Markets",
  "Barclays",
  "Berenberg",
  "Bridgewater Associates",
  "Capital Group",
  "Citi",
  "Connor Clark & Lunn",
  "Deutsche Bank",
  "Dimensional Fund Advisors",
  "Fidelity Investments",
  "Goldman Sachs",
  "HSBC",
  "Invesco",
  "J.P. Morgan",
  "Janus Henderson",
  "Lazard Asset Management",
  "Macquarie",
  "Morgan Stanley",
  "Neuberger Berman",
  "Northern Trust Asset Management",
  "PGIM",
  "PIMCO",
  "Putnam Investments",
  "Research Affiliates",
  "Robeco",
  "Russell Investments",
  "Schroders",
  "State Street Global Advisors",
  "T. Rowe Price",
  "UBS",
  "Vanguard",
  "Wellington Management",
  "William Blair",
];

const originalCompanies = [
  "Jane Street", "Citadel", "Citadel Securities", "DRW", "Point72", "Cubist", "Hudson River Trading",
  "Five Rings", "Arrowstreet", "3Red Partners", "A Priori", "Akuna Capital", "AlphaGrep", "AlphaSimplex",
  "Alyeska Investment Group", "Aquatic Capital", "AXQ Capital", "Balyasny Asset Management",
  "Belvedere Trading", "Bluefin Capital Management", "Brevan Howard", "Bridgewater Associates",
  "Capital Fund Management", "Capstone", "Capula", "Caxton Associates", "Centiva Capital",
  "Chicago Trading Company", "D. E. Shaw", "DV Trading", "Engineers Gate", "Ergoteles",
  "ExodusPoint", "Flow Traders", "G-Research", "Garda Capital Partners", "Gelber Group",
  "Geneva Trading", "Geode Capital Management", "Graham Capital Management", "Graviton Research Capital",
  "Group One Trading", "GSA Capital", "Headlands Technologies", "IMC Trading", "Jump Trading",
  "Kepos Capital", "Laurion Capital Management", "Man Group", "Marshall Wace", "Maven Securities",
  "Millennium", "Old Mission Capital", "Optiver", "PanAgora", "PDT Partners", "Peak6",
  "Qube Research & Technologies", "Radix Trading", "Renaissance Technologies", "Schonfeld",
  "Squarepoint Capital", "Stevens Capital Management", "Susquehanna International Group",
  "Systematica Investments", "Teza Technologies", "Tower Research Capital", "Trexquant",
  "Two Sigma", "Valkyrie Trading", "Vatic Investments", "Verition Fund Management", "Virtu Financial",
  "Voleon Group", "Voloridge", "Walleye Capital", "Winton Capital", "Wintermute", "Wolverine Trading",
  "WorldQuant", "XTX Markets", "Trillium", "TransMarket Group",
  "Weiss Asset Management", "Musket", "BP", "Castleton Commodities International", "Equinor", "Gunvor", "Shell", "Talos",
];

const companies = [...new Set([...originalCompanies, ...expandedCompanies])];

const officialDomains = {
  "AQR Capital Management": ["aqr.com", "careers.aqr.com"],
  "Acadian Asset Management": ["acadian-asset.com"],
  AllianceBernstein: ["alliancebernstein.com"],
  BlackRock: ["blackrock.com", "blackrock.tal.net"],
  BlueCove: ["bluecove.com"],
  "BNP Paribas": ["group.bnpparibas", "bnpparibas.com"],
  Barclays: ["search.jobs.barclays", "barclays.com"],
  "Bridgewater Associates": ["bridgewater.com"],
  Citi: ["jobs.citi.com"],
  "D. E. Shaw": ["deshaw.com", "campus.deshaw.com"],
  "DE Shaw": ["deshaw.com", "campus.deshaw.com"],
  "Dimensional Fund Advisors": ["dimensional.com"],
  "Fidelity Investments": ["fidelity.com", "jobs.fidelity.com"],
  "Goldman Sachs": ["goldmansachs.com", "higher.gs.com"],
  "Hudson River Trading": ["hudsonrivertrading.com"],
  "J.P. Morgan": ["jpmorgan.com", "careers.jpmorgan.com"],
  "Morgan Stanley": ["morganstanley.com"],
  Optiver: ["optiver.com"],
  PGIM: ["pgim.com"],
  PIMCO: ["pimco.com"],
  Robeco: ["robeco.com"],
  "State Street Global Advisors": ["statestreet.com"],
  "Susquehanna International Group": ["sig.com", "careers.sig.com"],
  "Teza Technologies": ["teza.com"],
  UBS: ["ubs.com"],
  Vanguard: ["vanguardjobs.com", "vanguard.com"],
  "Walleye Capital": ["walleyecapital.com", "job-boards.greenhouse.io"],
  "Wellington Management": ["wellington.com"],
  Voloridge: ["voloridge.com", "voloridge-investment-management.hiringthing.com"],
  Point72: ["point72.com", "careers.point72.com", "boards.greenhouse.io", "job-boards.greenhouse.io"],
  "Weiss Asset Management": ["weissasset.com", "boards.greenhouse.io"],
  Musket: ["jobs.loves.com", "loves.com"],
  BP: ["bp.com", "jobs.bp.com", "jobs-bp.icims.com", "bpglobal.com"],
  "Castleton Commodities International": ["cci.com"],
  Equinor: ["equinor.com", "equinor.wd3.myworkdayjobs.com", "equinor.wd5.myworkdayjobs.com"],
  Gunvor: ["gunvorgroup.com"],
  "Qube Research & Technologies": ["qube-rt.com", "job-boards.greenhouse.io"],
  Shell: ["shell.com", "shell.wd3.myworkdayjobs.com", "shell.wd5.myworkdayjobs.com"],
  Talos: ["talos.com"],
};

const seedCareerPages = {
  "Qube Research & Technologies": ["https://www.qube-rt.com/careers/"],
  "TransMarket Group": ["https://job-boards.greenhouse.io/transmarketgroup"],
  "Teza Technologies": ["https://www.teza.com/careers/"],
  "Walleye Capital": ["https://job-boards.greenhouse.io/walleyecapital-external-students"],
};

const aggregatorDomains = [
  "efinancialcareers.com",
  "openquant.co",
  "simplify.jobs",
  "tealhq.com",
  "builtin.com",
  "levels.fyi",
  "prosple.com",
  "jobright.ai",
  "linkedin.com/jobs",
  "indeed.com",
  "glassdoor.com",
  "wayup.com",
  "handshake",
  "revopscareers.com",
  "jobs.ashbyhq.com",
  "job-boards.greenhouse.io",
  "boards.greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "icims.com",
];

const roleSignal = /\b(quant|quantitative|systematic|alpha|research|portfolio|trading|trader|strat|strategy|developer|software|engineer|machine learning|data science|risk|implementation|model|analytics)\b/i;
const internSignal = /\b(intern|internship|summer analyst|summer associate|co-?op|industrial placement)\b/i;
const yearSignal = /\b(2026|2027|summer)\b/i;
const negativeSignal = /\b(new grad|new graduate|graduate programme|graduate program|full[- ]time|experienced|senior|principal|director|vp|vice president|phd intern|ph\.d\. intern|doctoral|postdoc|mba)\b/i;
const veryBroadFinance = /\b(investment banking|wealth management|audit|accounting|tax|human resources|marketing|sales intern|business development|compliance)\b/i;

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;|&#8211;/g, "-")
    .replace(/&mdash;|&#8212;/g, "-")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value = "") {
  return decodeHtml(decodeHtml(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function timingMetadata(title = "", content = "") {
  const plain = stripHtml(content);
  const timing = title.match(/\b(spring|summer|fall|winter)\s+20\d{2}\b/i)?.[0]
    || title.match(/\b20\d{2}\s+(spring|summer|fall|winter)\b/i)?.[0]
    || title.match(/\b(spring|summer|fall|winter)\b/i)?.[0]
    || "";
  const graduationText = plain
    .split(/(?<=[.!?;])\s+/)
    .filter((sentence) => /\b(graduat(?:e|ing|ion)?|class of|degree completion)\b/i.test(sentence))
    .join(" ");
  const graduationYears = [...new Set([...graduationText.matchAll(/\b20\d{2}\b/g)].map((match) => match[0]))];
  return [
    timing ? `internship timing: ${timing}` : "internship timing not stated in title",
    graduationYears.length ? `graduation eligibility mentions: ${graduationYears.join(", ")}` : "",
  ].filter(Boolean).join("; ");
}

function decodeBingUrl(url) {
  try {
    const parsed = new URL(url);
    const encoded = parsed.searchParams.get("u");
    if (encoded?.startsWith("a1")) {
      const b64 = encoded.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(b64, "base64").toString("utf8");
    }
  } catch {}
  return url;
}

function firstJsonLd(html = "") {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

async function normalizeOpenQuantHit(hitUrl) {
  const res = await fetchText(hitUrl);
  if (!res.ok) return null;
  const jsonLd = firstJsonLd(res.text);
  const applyHref = [...res.text.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: stripHtml(m[2]) }))
    .find((link) => /\bapply\b/i.test(link.text))?.href || "";
  const canonicalUrl = decodeHtml(applyHref) || res.url;
  const datePosted = typeof jsonLd?.datePosted === "string" ? jsonLd.datePosted.slice(0, 10) : "";
  const locality = jsonLd?.jobLocation?.address?.addressLocality || "";
  const region = jsonLd?.jobLocation?.address?.addressRegion || "";
  const location = [locality, region].filter(Boolean).join(", ");
  const title = jsonLd?.title || "";
  return { canonicalUrl, datePosted, location, title, openQuantUrl: res.url };
}

function classifySource(company, url) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch {}
  const official = (officialDomains[company] || []).some((d) => host.endsWith(d));
  const aggregator = aggregatorDomains.some((d) => host.includes(d));
  if (official) return "Official posting/page";
  if (aggregator) return "Web-discovered posting/lead";
  return "Web-discovered lead";
}

function isRelevantResult(title, snippet, url) {
  const text = `${title} ${snippet} ${url}`;
  if (!internSignal.test(text) || !roleSignal.test(text)) return false;
  if (negativeSignal.test(text) && !/\bBS\/MS|Bachelor|undergrad|undergraduate|master/i.test(text)) return false;
  if (veryBroadFinance.test(text) && !/\bquant|systematic|research|portfolio implementation|trading|risk|strat|analytics|model|developer|software|machine learning/i.test(text)) return false;
  if (/reddit\.com|wikipedia\.org|pdf$|youtube\.com|facebook\.com|wallstreetoasis\.com|thewallstreetquants\.com/i.test(url)) return false;
  if (/\binterview\b/i.test(title) || /\bjobs$/i.test(title) || /search job openings/i.test(text) || /hedge funds hiring graduates and interns/i.test(title)) return false;
  return true;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 internship-research",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return { ok: res.ok, status: res.status, text: await res.text(), url: res.url };
  } catch (error) {
    return { ok: false, status: 0, text: "", url, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function searchBing(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const res = await fetchText(url);
  if (!res.ok) return [];
  const blocks = res.text.split('<li class="b_algo"').slice(1, 10);
  const hits = [];
  for (const block of blocks) {
    const h2 = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!h2) continue;
    let resultUrl = decodeHtml(h2[1]);
    if (resultUrl.includes("/ck/a?")) resultUrl = decodeBingUrl(resultUrl);
    const title = stripHtml(h2[2]);
    const snippet = stripHtml(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "");
    hits.push({ title, url: resultUrl, snippet });
  }
  return hits;
}

function isAggregatorUrl(url = "") {
  return aggregatorDomains.some((domain) => url.toLowerCase().includes(domain));
}

const trustedCareerHosts = [
  "job-boards.greenhouse.io",
  "boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
  "myworkdayjobs.com",
  "icims.com",
  "hiringthing.com",
];

function isTrustedCareerPageUrl(company, url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return (officialDomains[company] || []).some((domain) => host.endsWith(domain))
      || trustedCareerHosts.some((domain) => host.endsWith(domain));
  } catch {
    return false;
  }
}

function isLikelyCareerPage(hit, company) {
  const text = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
  if (!/\b(career|careers|jobs|join us|opportunities)\b/.test(text)) return false;
  if (/linkedin|indeed|glassdoor|ziprecruiter|levels\.fyi|builtin|simplify|tealhq|openquant|efinancialcareers/i.test(hit.url)) return false;
  return isTrustedCareerPageUrl(company, hit.url);
}

function careerPageQueries(company) {
  const quoted = `"${company}"`;
  return [
    `${quoted} careers jobs`,
    `${quoted} internships careers`,
  ];
}

async function discoverCareerPages(company) {
  const pages = new Set(seedCareerPages[company] || []);
  for (const query of careerPageQueries(company)) {
    const hits = await searchBing(query);
    for (const hit of hits) {
      if (isLikelyCareerPage(hit, company)) pages.add(hit.url.split("#")[0]);
      if (pages.size >= 3) break;
    }
  }
  return [...pages];
}

async function loadCareerPageDb() {
  try {
    return JSON.parse(await fs.readFile(careerPageDbPath, "utf8"));
  } catch {
    return { generatedAt: "", companies: {} };
  }
}

async function ensureCareerPageDb() {
  const db = await loadCareerPageDb();
  db.companies ||= {};
  const discoveredAt = new Date().toISOString();

  // Refresh discovery every run. Some career pages, especially student ATS boards,
  // are easy to miss if we only trust a previously saved empty result.
  const discovered = await mapLimit(companies, 6, async (company) => ({
    company,
    careerPages: await discoverCareerPages(company),
  }), "career-pages");

  for (const company of companies) {
    const existing = (db.companies[company]?.careerPages || []).filter((url) => isTrustedCareerPageUrl(company, url));
    const seeded = seedCareerPages[company] || [];
    const found = discovered.find((entry) => entry.company === company)?.careerPages || [];
    db.companies[company] = {
      careerPages: [...new Set([...existing, ...seeded, ...found])],
      updatedAt: discoveredAt,
    };
  }

  db.generatedAt = discoveredAt;
  await fs.writeFile(careerPageDbPath, JSON.stringify(db, null, 2), "utf8");
  return db;
}

function extractScriptUrls(html, pageUrl) {
  return [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => new URL(decodeHtml(match[1]), pageUrl).toString())
    .filter((url) => {
      try {
        const scriptHost = new URL(url).hostname.replace(/^www\./, "");
        const pageHost = new URL(pageUrl).hostname.replace(/^www\./, "");
        return scriptHost === pageHost;
      } catch {
        return false;
      }
    })
    .slice(0, 8);
}

function extractAtsTokens(text) {
  const greenhouse = new Set();
  const lever = new Set();
  const ashby = new Set();
  for (const match of text.matchAll(/boards-api\.greenhouse\.io\/v1\/boards\/([^/"'\s?]+)\/jobs/gi)) greenhouse.add(match[1]);
  for (const match of text.matchAll(/(?:boards|job-boards)\.greenhouse\.io\/([^/"'\s?#]+)/gi)) greenhouse.add(match[1]);
  for (const match of text.matchAll(/api\.lever\.co\/v0\/postings\/([^/"'\s?]+)|jobs\.lever\.co\/([^/"'\s?#]+)/gi)) lever.add(match[1] || match[2]);
  for (const match of text.matchAll(/api\.ashbyhq\.com\/posting-api\/job-board\/([^/"'\s?]+)|jobs\.ashbyhq\.com\/([^/"'\s?#]+)/gi)) ashby.add(match[1] || match[2]);
  return { greenhouse: [...greenhouse], lever: [...lever], ashby: [...ashby] };
}

async function getGreenhouseBoard(company, token, careerPageUrl = "") {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  const jobs = (json.jobs || []).map((job) => ({
    Company: company,
    Title: job.title || "",
    Department: (job.departments || []).map((department) => department.name).filter(Boolean).join(", "),
    Location: job.location?.name || "",
    URL: job.absolute_url || `https://job-boards.greenhouse.io/${token}/jobs/${job.id}`,
    Source: `Career page Greenhouse:${token}`,
    Status: "Confirmed official posting",
    Notes: [
      careerPageUrl ? `career_page=${careerPageUrl}` : "",
      careerPageUrl ? `company_wrapper=${new URL(`job?gh_jid=${job.id}`, careerPageUrl).toString()}` : "",
      timingMetadata(job.title || "", job.content || ""),
      stripHtml(job.content || ""),
    ].filter(Boolean).join(" | "),
  }));
  return { source: `Greenhouse:${token}`, jobs };
}

async function getLeverBoard(company, token, careerPageUrl = "") {
  const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  if (!Array.isArray(json)) return null;
  const jobs = json.map((job) => ({
    Company: company,
    Title: job.text || "",
    Department: job.categories?.team || job.categories?.department || "",
    Location: job.categories?.location || "",
    URL: job.hostedUrl || job.applyUrl || "",
    Source: `Career page Lever:${token}`,
    Status: "Confirmed official posting",
    Notes: [careerPageUrl ? `career_page=${careerPageUrl}` : "", timingMetadata(job.text || "", `${job.descriptionPlain || ""} ${job.lists?.map((list) => `${list.text} ${list.content}`).join(" ") || ""}`), stripHtml(`${job.descriptionPlain || ""} ${job.lists?.map((list) => `${list.text} ${list.content}`).join(" ") || ""}`)].filter(Boolean).join(" | "),
  }));
  return { source: `Lever:${token}`, jobs };
}

async function getAshbyBoard(company, token, careerPageUrl = "") {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${token}`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  if (!Array.isArray(json.jobs)) return null;
  const jobs = json.jobs.map((job) => ({
    Company: company,
    Title: job.title || "",
    Department: job.department || "",
    Location: (job.locationName || job.location || "").toString(),
    URL: job.jobUrl || `https://jobs.ashbyhq.com/${token}/${job.id}`,
    Source: `Career page Ashby:${token}`,
    Status: "Confirmed official posting",
    Notes: [careerPageUrl ? `career_page=${careerPageUrl}` : "", timingMetadata(job.title || "", job.descriptionHtml || ""), stripHtml(`${job.descriptionHtml || ""} ${job.department || ""} ${job.employmentType || ""}`)].filter(Boolean).join(" | "),
  }));
  return { source: `Ashby:${token}`, jobs };
}

function relevantCareerJob(row) {
  const text = `${row.Title} ${row.Location} ${row.Notes}`.toLowerCase();
  const title = row.Title.toLowerCase();
  const roleText = `${row.Title} ${row.Department || ""}`.toLowerCase();
  const isIntern = /\b(intern|internship|summer analyst|summer associate|co-?op|industrial placement)\b/.test(title);
  const hasDomain = /\b(quant|quantitative|systematic|alpha|research|portfolio|trading|trader|strat|strategy|developer|software|engineer|technology|devops|site reliability|sre|infrastructure|data science|machine learning|risk|implementation|model|analytics|fpga)\b/.test(roleText) || /c\+\+/i.test(roleText);
  const blockedEducation = /\b(phd|ph\.d|doctoral|doctorate|postdoc|postdoctoral|mba)\b/.test(title) && !/\b(bs|bachelor|undergrad|undergraduate|master|ms)\b/.test(text);
  const blockedFullTime = /\b(new grad|new graduate|graduate programme|graduate program|full[- ]time|experienced|senior|principal|director|vp|vice president|recruiter|recruitment)\b/.test(title) || (/\bgraduate\b/.test(title) && !/\bintern/.test(title));
  return isIntern && hasDomain && !blockedEducation && !blockedFullTime;
}

async function scanCareerPage(company, pageUrl) {
  const page = await fetchText(pageUrl);
  let searchable = `${pageUrl}\n${page.url}\n${page.text}`;
  if (page.ok) {
    for (const scriptUrl of extractScriptUrls(page.text, page.url)) {
      const script = await fetchText(scriptUrl);
      if (script.ok) searchable += `\n${script.text}`;
    }
  }
  const tokens = extractAtsTokens(searchable);
  const boards = [
    ...(await Promise.all(tokens.greenhouse.map((token) => getGreenhouseBoard(company, token, page.url)))),
    ...(await Promise.all(tokens.lever.map((token) => getLeverBoard(company, token, page.url)))),
    ...(await Promise.all(tokens.ashby.map((token) => getAshbyBoard(company, token, page.url)))),
  ].filter(Boolean);
  const allJobs = boards.flatMap((board) => board.jobs);
  const rows = allJobs.filter(relevantCareerJob);
  return {
    rows,
    audit: {
      company,
      pageUrl,
      resolvedUrl: page.url,
      pageOk: page.ok,
      pageStatus: page.status,
      atsTokens: tokens,
      boards: boards.map((board) => ({
        source: board.source,
        jobsSeen: board.jobs.length,
        relevantInternships: board.jobs.filter(relevantCareerJob).length,
      })),
      jobsSeen: allJobs.length,
      relevantInternships: rows.length,
    },
  };
}

async function scanCareerPages(db) {
  const tasks = [];
  for (const company of companies) {
    for (const pageUrl of db.companies[company]?.careerPages || []) {
      tasks.push({ company, pageUrl });
    }
  }
  const results = await mapLimit(tasks, 6, async ({ company, pageUrl }) => scanCareerPage(company, pageUrl), "career-page-scan");
  return { rows: results.flatMap((result) => result.rows), tasks, audits: results.map((result) => result.audit) };
}

function companyQueries(company) {
  const quoted = `"${company}"`;
  return [
    `${quoted} 2027 internship quantitative research summer analyst`,
    `${quoted} 2027 summer analyst quant portfolio trading research`,
    `${quoted} 2026 2027 software developer intern trading quantitative`,
    `${quoted} careers intern quantitative research portfolio implementation`,
  ];
}

async function mapLimit(items, limit, fn, label = "searched") {
  const out = [];
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if ((i + 1) % 20 === 0) console.error(`${label} ${i + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quote = !quote;
    } else if (ch === "," && !quote) {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function readBaseCsv() {
  try {
    const text = await fs.readFile(baseCsvPath, "utf8");
    const [headerLine, ...lines] = text.trim().split(/\r?\n/);
    const headers = parseCsvLine(headerLine);
    return lines.filter(Boolean).map((line) => {
      const cells = parseCsvLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] || ""]));
    });
  } catch {
    return [];
  }
}

const baseRows = (await readBaseCsv()).map((row) => ({
  Company: row.Company,
  Title: row.Title,
  Location: row.Location,
  URL: row.URL,
  Source: row.Source || "Official ATS/careers page",
  Status: "Confirmed official posting",
  Notes: row.Notes || "",
}));

const searchedAt = new Date().toISOString();
const careerPageDb = await ensureCareerPageDb();
const careerPageScan = await scanCareerPages(careerPageDb);
const careerPageRows = careerPageScan.rows;
const discoveredNested = await mapLimit(companies, 8, async (company) => {
  const companyHits = [];
  const seen = new Set();
  for (const query of companyQueries(company)) {
    const hits = await searchBing(query);
    for (const hit of hits) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      if (!isRelevantResult(hit.title, hit.snippet, hit.url)) continue;
      let url = hit.url;
      let title = hit.title;
      let location = "";
      let notes = hit.snippet;

      if (/^https?:\/\/openquant\.co\/job\//i.test(hit.url)) {
        const normalized = await normalizeOpenQuantHit(hit.url);
        if (normalized?.canonicalUrl) {
          url = normalized.canonicalUrl;
          title = normalized.title || title;
          location = normalized.location || location;
          const posted = normalized.datePosted ? `openquant_datePosted=${normalized.datePosted}` : "openquant_datePosted=unknown";
          notes = [`openquant_url=${normalized.openQuantUrl}`, posted, notes].filter(Boolean).join(" | ");
        }
      }

      const sourceType = classifySource(company, url);
      const confidence = sourceType === "Official posting/page" ? "Likely official; verify application form" : "Aggregator/web lead; verify on official site";
      companyHits.push({
        Company: company,
        Title: title,
        Location: location,
        URL: url,
        Source: sourceType,
        Status: confidence,
        Notes: notes,
      });
    }
  }
  return companyHits;
}, "search");

const manualLeads = [
  {
    Company: "AQR Capital Management",
    Title: "AQR internship program page",
    Location: "Greenwich / other AQR offices",
    URL: "https://www.aqr.com/about-us/our-internship-program",
    Source: "Official internship page",
    Status: "Official program page; roles/application timing should be checked on careers.aqr.com",
    Notes: "AQR says internship applications for the coming summer are live on its careers page beginning June 30 to mid-August; summer interns frequently join Research and Portfolio Management plus Portfolio Implementation, Trading, and Portfolio Finance.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Research Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.efinancialcareers.com/jobs-USA-CT-Greenwich-2027_Research_Summer_Analyst.id24267297",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "eFinancialCareers listing says AQR is looking for undergraduates to join as Summer Research Analysts.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Research Product Specialist Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.efinancialcareers.com/jobs-United_States-Greenwich-2027_Research_Product_Specialist_Summer_Analyst.id24267379",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "Separate from AQR's Research internship; still research/product/quant-adjacent.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Portfolio Implementation, Trading and Portfolio Finance Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.efinancialcareers.com/jobs-United_States-Greenwich-2027_Portfolio_Implementation_Trading_and_Portfolio_Finance_Summer_Analyst.id24267490",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "AQR team owns construction, optimization, management, trade execution, and financing of systematic portfolios; listing says summer analyst role includes portfolio construction, implementation research, model research, and analytics.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Risk Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.efinancialcareers.com/jobs-United_States-Greenwich-2027_Risk_Summer_Analyst.id24267213",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "Quant/risk-adjacent summer analyst role; listing mentions research/development of risk methodologies and quantitative investigations.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Engineering Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.dice.com/job-detail/11fc0876-bd30-4755-add9-f93c4c21522f",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "AQR enterprise engineering summer analyst lead; verify on AQR careers for the exact team and application form.",
  },
  {
    Company: "BlackRock",
    Title: "2027 Summer Internship Program - AMERS",
    Location: "Multiple Americas offices",
    URL: "https://careers.blackrock.com/job/new-york/2027-summer-internship-program-amers/45831/90628276544",
    Source: "Official careers page",
    Status: "Official broad program; select quant-relevant functions in application",
    Notes: "Official page says applications are open and candidates can apply to functions such as Investment Research and Analytics & Modeling.",
  },
  {
    Company: "Goldman Sachs",
    Title: "2027 | Americas | New York City Area | Wealth Management, Quantitative Finance | Summer Analyst",
    Location: "New York",
    URL: "https://higher.gs.com/roles/155800",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Goldman Sachs Higher role page; Summer Analyst program for bachelor's/graduate degree students.",
  },
  {
    Company: "Goldman Sachs",
    Title: "2027 | APEJ | Singapore | FICC and Equities (Sales and Trading) Quantitative Strats | Summer Analyst",
    Location: "Singapore",
    URL: "https://higher.gs.com/roles/170600",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Goldman Sachs Higher role page; quantitative strategists construct quantitative models for global markets.",
  },
  {
    Company: "J.P. Morgan",
    Title: "Markets Summer Analyst Program",
    Location: "Varies by open location",
    URL: "https://careers.jpmorgan.com/us/en/students/programs/markets-summer-analyst",
    Source: "Official program page",
    Status: "Official broad program; check currently open locations",
    Notes: "JPM page describes work on market strategies, complex mathematical models, machine learning techniques, and trading simulations.",
  },
  {
    Company: "J.P. Morgan",
    Title: "Asset Management Summer Analyst Program",
    Location: "Varies by open location",
    URL: "https://careers.jpmorgan.com/US/en/students/programs/asset-management-summer-analyst",
    Source: "Official program page",
    Status: "Official broad program; check currently open locations",
    Notes: "JPM page says interns research, analyze, and develop investment strategies and models; useful for quant asset-management track.",
  },
];

const rowsByUrl = new Map();
for (const row of [...careerPageRows, ...baseRows, ...discoveredNested.flat(), ...manualLeads]) {
  if (!row.URL || rowsByUrl.has(row.URL)) continue;
  if (row.Company !== "AQR Capital Management" && /\bAQR\b|AQR Capital/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  if (row.Company !== "IMC Financial Markets" && /IMC Trading|www\.imc\.com/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  if (row.Company !== "J.P. Morgan" && /jpmorgan|jpmorganchase/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  row.Title = row.Title.replace(/\s+null$/i, "").trim();
  if (row.Notes?.length > 900) row.Notes = `${row.Notes.slice(0, 900)}...`;
  rowsByUrl.set(row.URL, row);
}

const rows = [...rowsByUrl.values()].sort((a, b) => a.Company.localeCompare(b.Company) || a.Title.localeCompare(b.Title));
const companiesWithoutRows = companies.filter((company) => !rows.some((row) => row.Company === company)).sort();
const csv = [
  ["Company", "Title", "Location", "URL", "Source", "Status", "Notes"].map(csvEscape).join(","),
  ...rows.map((row) => ["Company", "Title", "Location", "URL", "Source", "Status", "Notes"].map((key) => csvEscape(row[key])).join(",")),
].join("\n");

const md = [
  "# Quant Internship Open Roles Scan v2",
  "",
  `Scanned: ${searchedAt}`,
  `Companies searched: ${companies.length}`,
  `Rows/leads retained: ${rows.length}`,
  "",
  "Scope: original quant company list plus adjacent systematic/quant asset managers, large asset managers, and bank strats/quant-style programs. The scan checks saved company career pages first, then official ATS findings from v1, then broader web-discovered postings.",
  "",
  "Status guide:",
  "- Confirmed official posting: direct role from official ATS/careers page.",
  "- Likely official; verify application form: search result appears to be on an official company domain.",
  "- Aggregator/web lead; verify on official site: posting surfaced on a job board or aggregator and needs confirmation before applying.",
  "- Official program page: useful application timing/team information, not necessarily a specific open role.",
  "",
  "## Roles And Leads",
  "",
  rows.map((row) => `- **${row.Company}** — [${row.Title}](${row.URL})${row.Location ? ` — ${row.Location}` : ""} — ${row.Status} (${row.Source})${row.Notes ? `: ${row.Notes}` : ""}`).join("\n"),
  "",
  "## Searched With No Retained Lead",
  "",
  companiesWithoutRows.map((company) => `- ${company}`).join("\n"),
  "",
].join("\n");

await fs.writeFile("quant_internship_roles_scan_v2.csv", csv, "utf8");
await fs.writeFile("quant_internship_roles_scan_v2.md", md, "utf8");
await fs.writeFile("quant_internship_roles_scan_v2_raw.json", JSON.stringify({ searchedAt, companies, careerPageDb, careerPageScanTasks: careerPageScan.tasks, careerPageScanAudits: careerPageScan.audits, careerPageRows, rows, companiesWithoutRows }, null, 2), "utf8");
await fs.writeFile("quant_internship_roles_scan_v2_audit.json", JSON.stringify({
  searchedAt,
  companies,
  companiesWithoutKnownCareerPage: companies.filter((company) => !(careerPageDb.companies[company]?.careerPages || []).length),
  careerPageScanAudits: careerPageScan.audits,
}, null, 2), "utf8");

console.log(`companies=${companies.length} careerPages=${careerPageScan.tasks.length} careerPageRows=${careerPageRows.length} rows=${rows.length}`);
console.log("wrote quant_internship_roles_scan_v2.csv, quant_internship_roles_scan_v2.md, quant_internship_roles_scan_v2_raw.json, quant_internship_roles_scan_v2_audit.json");
