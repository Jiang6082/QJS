import fs from "node:fs/promises";

const rawCompanies = `
Jane Street
Citadel
DRW
Point 72/Cubist
HRT
Five Rings
Arrowstreet
3red Partners
A Priori
Akuna
Albatross Labs
AlphaGrep
AlphaSimplex
Alphataraxia Management
Alyeska Investment Group
Ansatz Capital
Aquatic Capital
Aspect Capital
AXQ Capital
Balyasny Asset Management
Banyan Alpha Investment
Belvedere Trading
BlackEdge Capital
Bluefin Capital Management
Blueshift Asset Management
Boerboel Trading
Boulder Hill Capital Management
Brevan Howard
Bridgewater Associates
Cantor Fitzgerald
Capital Fund Management
Capital Markets Trading
Capstone
Capula
Caxton Associates
Centiva Capital
Chicago Trading Company
Citadel
Consolidated Trading
CQS
Dark Forest
DE Shaw
Dolat Capital
DRW
Duality Group
DV Trading
Edgehog Trading
Edgestream Partners
Eisler Capital
Elk Capital Markets
Elequin Capital
Emergent Trading
Engineers Gate
Eqvilent
Ergoteles Capital
Eschaton Trading
Evergreen Statistical Trading
ExodusPoint
Five Rings
Florin Court Capital
Flow Traders
Freestone Grove Partners
G-Research
GAM Systematic
Garda Capital Partners
Gelber Group
Geneva Trading
Geode Capital Management
Graham Capital Management
Graviton Research Capital
Group One Trading
GSA Capital Partners
GTS
HAP Capital
Headlands Technologies
Hudson Bay Capital
Hudson River Trading
IMC Financial Markets
Jacobs Levy Equity Management
Jain Global
Jane Street
Jocassee Quantitative
Jump Trading
Kepos Capital
Kore Trading
Kula Investments
Laurion Capital Management
Lord Abbett
Lynx Asset Management
Mako
Man Group
Mana Partners
Marquette Partners
Marshall Wace
Maven Securities
Millburn
Monoceros
Nebula Research & Development
Old Mission Capital
Optiver
Paloma Partners
PanAgora
Parallax Volatility Advisers
PDT Partners
Peak6
PGIM Quant Solutions
Prime Trading
QMS Capital Management
Qsemble Capital Management
Quadeye
Quadrature
Quantbot Technologies
Quantbox Research
Quantitative Investment Management
Quantlab Financial
Quantumrock Capital
Qube Research & Technologies
QVR Advisors
Radix Trading
Renaissance Technologies
Rokos Capital Management
Rosetta Analytics
RSJ
Schonfeld Strategic Advisors
Segantii Capital Management
Sensato Investors
Seven Eight Capital
Spark Investment Management
Squarepoint Capital
Stevens Capital Management
Summit Securities Group
Sumo
Sunrise Futures
Susquehanna International Group
Systematica Investments
Tanius Technology
Teza Technologies
TGS Management Company
Tower Research Capital
Tradebot
Tradelink Holdings
TransMarket Group
Trexquant Investment
Two Sigma
Valkyrie Trading
Vatic Investments
Vector Trading
Verition Fund Management
Virtu Financial
Volant Trading
Voleon Group
Voloridge Investment Management
Weiss Asset Management
Musket
BP
Castleton Commodities International
Equinor
Gunvor
Shell
Talos
Volterra Technologies
Walleye Capital
WH Trading
Wincent
Winton Capital Management
Wintermute
Wolverine Trading
WorldQuant
Xantium
XR Trading
XTX Markets
Wizard Quant
Trillium
`;

const companies = [...new Set(rawCompanies.split(/\n+/).map((s) => s.trim()).filter(Boolean))];

const customTokens = {
  "3red Partners": ["3redpartners", "threeredpartners"],
  "A Priori": ["apriori", "a-priori"],
  Akuna: ["akunacapital", "akuna"],
  AlphaGrep: ["alphagrep", "alpha-grep"],
  "Balyasny Asset Management": ["balyasny", "bamfunds", "balyasnyassetmanagement"],
  "Belvedere Trading": ["belvederetrading", "belvedere-trading"],
  "Brevan Howard": ["brevanhoward", "brevan-howard"],
  "Bridgewater Associates": ["bridgewater89", "bridgewater", "bridgewaterassociates"],
  "Chicago Trading Company": ["chicagotrading", "ctc", "chicagotradingcompany"],
  Citadel: ["citadel", "citadelsecurities", "citadel-securities"],
  "DE Shaw": ["deshaw", "d-e-shaw", "d.e.shaw", "thedeshawgroup"],
  DRW: ["drw", "drwtrading"],
  "Five Rings": ["fiveringsllc", "fiverings", "five-rings"],
  "Flow Traders": ["flowtraders", "flow-traders"],
  "G-Research": ["gresearch", "g-research"],
  "Geneva Trading": ["genevatrading", "geneva-trading"],
  "Group One Trading": ["group-one-trading", "groupone", "grouponetrading"],
  GTS: ["gts", "gtsx"],
  "Headlands Technologies": ["headlandstechnologies", "headlands"],
  HRT: ["hrt", "hudsonrivertrading"],
  "Hudson River Trading": ["hrt", "hudsonrivertrading"],
  "IMC Financial Markets": ["imc", "imcfinancialmarkets"],
  "Jane Street": ["janestreet", "jane-street"],
  "Jump Trading": ["jumptrading", "jump-trading"],
  Mako: ["mako", "mako-trading", "makotrading"],
  "Man Group": ["mangroup", "man-group"],
  "Maven Securities": ["mavensecurities", "maven-securities"],
  "Old Mission Capital": ["oldmissioncapital", "old-mission"],
  Optiver: ["optiverus", "optiver"],
  "PDT Partners": ["pdtpartners", "pdt"],
  Peak6: ["peak6", "peak6insiders"],
  "Point 72/Cubist": ["point72", "point72cubist", "cubist"],
  "Qube Research & Technologies": ["qube-rt", "quberesearchandtechnologies", "quberesearch"],
  "Radix Trading": ["radixtrading", "radix-trading"],
  "Schonfeld Strategic Advisors": ["schonfeld", "schonfeldstrategicadvisors"],
  "Squarepoint Capital": ["squarepointcapital", "squarepoint"],
  "Susquehanna International Group": ["sig", "susquehanna", "sigtrading"],
  "Tower Research Capital": ["tower-research", "towerresearch", "towerresearchcapital"],
  "TransMarket Group": ["transmarketgroup", "tmg"],
  "Trexquant Investment": ["trexquant", "trexquantinvestment"],
  "Two Sigma": ["twosigma", "two-sigma"],
  "Valkyrie Trading": ["valkyrietrading", "valkyrie-trading"],
  "Virtu Financial": ["virtu", "virtufinancial"],
  "Voleon Group": ["voleon", "voleongroup"],
  "Walleye Capital": ["walleyecapital", "walleye"],
  "Wolverine Trading": ["wolverinetrading", "wolverine"],
  WorldQuant: ["worldquant"],
  "XR Trading": ["xrtrading", "xr-trading"],
  "XTX Markets": ["xtxmarkets", "xtx-markets"],
};

const hiringThingBoards = {
  "Voloridge Investment Management": "voloridge-investment-management",
};

function generatedTokens(name) {
  const base = name.toLowerCase().replace(/&/g, "and");
  const words = base.replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const joined = words.join("");
  const hyphen = words.join("-");
  const variants = new Set([
    joined,
    hyphen,
    words[0],
    joined.replace(/capitalmanagement$/, ""),
    joined.replace(/capitalpartners$/, ""),
    joined.replace(/management$/, ""),
    joined.replace(/trading$/, ""),
    joined.replace(/financialmarkets$/, ""),
    joined.replace(/internationalgroup$/, ""),
    joined.replace(/technologies$/, ""),
    joined.replace(/researchcapital$/, ""),
    joined.replace(/partners$/, ""),
    joined.replace(/group$/, ""),
  ]);
  return [...variants].filter(Boolean);
}

function stripHtml(s = "") {
  return s.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function relevant(job) {
  const title = job.title || "";
  const text = `${title} ${job.department || ""} ${job.location || ""} ${job.content || ""}`.toLowerCase();
  const titleLower = title.toLowerCase();
  const roleText = `${title} ${job.department || ""}`.toLowerCase();

  const isInternTitle = /\b(intern|internship|co-?op|summer analyst)\b/.test(titleLower);
  const hasDomain = /\b(quant|quantitative|trading|trader|research|software|developer|development|engineer|technology|devops|site reliability|sre|infrastructure|data science|machine learning|strat|fpga)\b/.test(roleText) || /c\+\+/i.test(roleText);
  const isUndergradBlocked =
    (/\b(phd|ph\.d|doctoral|doctorate|mba)\b/.test(titleLower) && !/\b(bs|bachelor|undergraduate|master|ms)\b/.test(text)) ||
    /must be working towards a phd|phd candidates|postdocs|postdoctoral/.test(text);
  const isFullTimeOnly = /\b(new grad|new graduate|graduate|full[- ]time|experienced|senior|recruiter|recruitment|payroll|operations analyst)\b/.test(titleLower);
  const internshipGraduateCombo = /\binternship\/graduate\b/.test(titleLower);

  return isInternTitle && hasDomain && !isUndergradBlocked && (!isFullTimeOnly || internshipGraduateCombo);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 internship-research" },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, url: res.url };
  } catch (error) {
    return { ok: false, status: 0, text: "", error: error.message, url };
  } finally {
    clearTimeout(timeout);
  }
}

async function getHiringThing(company, token) {
  const indexUrl = `https://${token}.hiringthing.com/`;
  const indexRes = await fetchText(indexUrl);
  if (!indexRes.ok) return null;

  const paths = [...new Set([...indexRes.text.matchAll(/href="(\/job\/\d+\/[^"]+)"/g)].map((m) => m[1]))].slice(0, 40);
  const jobs = [];

  for (const path of paths) {
    const jobUrl = new URL(path, indexUrl).toString();
    const res = await fetchText(jobUrl);
    if (!res.ok) continue;
    const jsonLd = res.text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1];
    if (!jsonLd) continue;
    let data;
    try { data = JSON.parse(jsonLd); } catch { continue; }
    const loc = data?.jobLocation?.address;
    const location = [loc?.addressLocality, loc?.addressRegion].filter(Boolean).join(", ");
    jobs.push({
      company,
      source: `HiringThing:${token}`,
      title: data.title || "",
      location,
      url: res.url,
      content: stripHtml(data.description || ""),
    });
  }

  return { source: `HiringThing:${token}`, count: jobs.length, jobs };
}

async function getGreenhouse(company, token) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  const jobs = (json.jobs || []).map((j) => ({
    company,
    source: `Greenhouse:${token}`,
    title: j.title,
    department: (j.departments || []).map((department) => department.name).filter(Boolean).join(", "),
    location: j.location?.name || "",
    url: j.absolute_url,
    content: stripHtml(j.content || ""),
  }));
  return { source: `Greenhouse:${token}`, count: jobs.length, jobs };
}

async function getLever(company, token) {
  const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  if (!Array.isArray(json)) return null;
  const jobs = json.map((j) => ({
    company,
    source: `Lever:${token}`,
    title: j.text,
    department: j.categories?.team || j.categories?.department || "",
    location: j.categories?.location || "",
    url: j.hostedUrl || j.applyUrl,
    content: stripHtml(`${j.descriptionPlain || ""} ${j.lists?.map((l) => `${l.text} ${l.content}`).join(" ") || ""}`),
  }));
  return { source: `Lever:${token}`, count: jobs.length, jobs };
}

async function getAshby(company, token) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${token}`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  if (!Array.isArray(json.jobs)) return null;
  const jobs = json.jobs.map((j) => ({
    company,
    source: `Ashby:${token}`,
    title: j.title,
    department: j.department || "",
    location: (j.locationName || j.location || "").toString(),
    url: j.jobUrl || `https://jobs.ashbyhq.com/${token}/${j.id}`,
    content: stripHtml(`${j.descriptionHtml || ""} ${j.department || ""} ${j.employmentType || ""}`),
  }));
  return { source: `Ashby:${token}`, count: jobs.length, jobs };
}

async function scanCompany(company) {
  const tokens = [...new Set([...(customTokens[company] || []), ...generatedTokens(company)])].slice(0, 12);
  const checks = [];
  for (const token of tokens) {
    checks.push(getGreenhouse(company, token), getLever(company, token), getAshby(company, token));
  }
  if (hiringThingBoards[company]) checks.push(getHiringThing(company, hiringThingBoards[company]));
  const boards = (await Promise.all(checks)).filter(Boolean);
  const seenUrl = new Set();
  const matches = [];
  for (const board of boards) {
    for (const job of board.jobs) {
      if (relevant(job) && !seenUrl.has(job.url)) {
        seenUrl.add(job.url);
        matches.push(job);
      }
    }
  }
  return { company, boards: boards.map(({ source, count }) => ({ source, count })), matches };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if ((i + 1) % 15 === 0) console.error(`scanned ${i + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function summarize(job) {
  const title = job.title || "";
  const content = stripHtml(job.content || "");
  const bits = [];
  const timing = title.match(/\b(spring|summer|fall|winter)\s+20\d{2}\b/i)?.[0]
    || title.match(/\b20\d{2}\s+(spring|summer|fall|winter)\b/i)?.[0]
    || title.match(/\b(spring|summer|fall|winter)\b/i)?.[0]
    || "";
  const graduationText = content
    .split(/(?<=[.!?;])\s+/)
    .filter((sentence) => /\b(graduat(?:e|ing|ion)?|class of|degree completion)\b/i.test(sentence))
    .join(" ");
  const graduationYears = [...new Set([...graduationText.matchAll(/\b20\d{2}\b/g)].map((match) => match[0]))];
  bits.push(timing ? `internship timing: ${timing}` : "internship timing not stated in title");
  if (graduationYears.length) bits.push(`graduation eligibility mentions: ${graduationYears.join(", ")}`);
  if (/\bundergraduate|bachelor|bs\/ms|bs|ms\b/i.test(content)) bits.push("undergrad/BS/MS language found");
  return bits.join("; ");
}

const scannedAt = new Date().toISOString();
const results = await mapLimit(companies, 10, scanCompany);
const manualMatches = [
  {
    company: "Citadel",
    title: "Software Engineer - Intern (Australia)",
    location: "Brisbane",
    url: "https://www.citadel.com/careers/details/software-engineer-intern-australia/",
    source: "Official careers page",
    content: "Summer internship program. Bachelor's, master's or PhD in computer science, computer engineering or related fields.",
  },
  {
    company: "Citadel",
    title: "Software Engineer - Intern (Europe)",
    location: "London",
    url: "https://www.citadel.com/careers/details/software-engineer-intern-europe/",
    source: "Official careers page",
    content: "Summer internship program. Degree in Computer Science, Computer Engineering or related fields.",
  },
  {
    company: "Citadel",
    title: "Software Engineer - Intern (Asia)",
    location: "Singapore",
    url: "https://www.citadel.com/careers/details/software-engineer-intern-asia/",
    source: "Official careers page",
    content: "Summer internship program. Bachelor's, master's or PhD in computer science, computer engineering or related fields.",
  },
  {
    company: "Citadel",
    title: "Quantitative Research Analyst Intern - BS/MS (US)",
    location: "Greenwich, Miami, New York",
    url: "https://www.citadel.com/careers/details/quantitative-research-analyst-intern-bs-ms-us/",
    source: "Official careers page",
    content: "11 week internship; signature program takes place June through August. Bachelor's or master's degree in a highly quantitative field.",
  },
  {
    company: "Citadel",
    title: "Quantitative Research Analyst Intern - BS/MS (Europe)",
    location: "London, Paris, Zurich",
    url: "https://www.citadel.com/careers/details/quantitative-research-analyst-intern-bs-ms-europe/",
    source: "Official careers page",
    content: "11 week internship; signature program takes place June through August. Bachelor's or master's degree in a highly quantitative field.",
  },
  {
    company: "Citadel",
    title: "Quantitative Research Analyst Intern - BS/MS (Asia)",
    location: "Hong Kong, Singapore",
    url: "https://www.citadel.com/careers/details/quantitative-research-analyst-intern-bs-ms-asia/",
    source: "Official careers page",
    content: "11 week internship; signature program takes place June through August. Bachelor's or master's degree in a highly quantitative field.",
  },
  {
    company: "Citadel Securities",
    title: "Software Engineer - Intern (Europe)",
    location: "London",
    url: "https://www.citadelsecurities.com/careers/details/software-engineer-intern-europe/",
    source: "Official careers page",
    content: "11 week internship. Bachelor's, master's or PhD in computer science, computer engineering or related fields.",
  },
  {
    company: "Citadel Securities",
    title: "Software Engineer - Intern (Australia)",
    location: "Sydney",
    url: "https://www.citadelsecurities.com/careers/details/software-engineer-intern-australia/",
    source: "Official careers page",
    content: "11 week internship. Bachelor's, master's or PhD in computer science, computer engineering or related fields.",
  },
  {
    company: "Citadel Securities",
    title: "Software Engineer - Intern (Asia)",
    location: "Hong Kong, Singapore",
    url: "https://www.citadelsecurities.com/careers/details/software-engineer-intern-asia/",
    source: "Official careers page",
    content: "11 week internship. Bachelor's, master's or PhD in computer science, computer engineering or related fields.",
  },
  {
    company: "Citadel Securities",
    title: "Quantitative Trading - Intern (Australia)",
    location: "Sydney",
    url: "https://www.citadelsecurities.com/careers/details/quantitative-trading-intern-australia/",
    source: "Official careers page",
    content: "Internship trading role.",
  },
  {
    company: "Citadel Securities",
    title: "Quantitative Research Analyst Intern - BS/MS (US)",
    location: "Miami, New York",
    url: "https://www.citadelsecurities.com/careers/details/quantitative-research-analyst-intern-bs-ms-us/",
    source: "Official careers page",
    content: "11 week internship. Bachelor's or master's degree in a highly quantitative field.",
  },
  {
    company: "Citadel Securities",
    title: "Quantitative Research Analyst Intern - BS/MS (Europe)",
    location: "London, Paris, Zurich",
    url: "https://www.citadelsecurities.com/careers/details/quantitative-research-analyst-intern-bs-ms-europe/",
    source: "Official careers page",
    content: "11 week internship. Bachelor's or master's degree in a highly quantitative field.",
  },
  {
    company: "Citadel Securities",
    title: "Quantitative Research Analyst Intern - BS/MS (Asia)",
    location: "Hong Kong, Singapore",
    url: "https://www.citadelsecurities.com/careers/details/quantitative-research-analyst-intern-bs-ms-asia/",
    source: "Official careers page",
    content: "11 week internship. Bachelor's or master's degree in a highly quantitative field.",
  },
  {
    company: "Citadel Securities",
    title: "Quantitative Research Analyst Intern - BS/MS (Australia)",
    location: "Sydney",
    url: "https://www.citadelsecurities.com/careers/details/quantitative-research-analyst-intern-bs-ms-australia/",
    source: "Official careers page",
    content: "11 week internship. Bachelor's or master's degree in a highly quantitative field.",
  },
  {
    company: "Citadel Securities",
    title: "FPGA Engineer - Intern (Australia)",
    location: "Sydney",
    url: "https://www.citadelsecurities.com/careers/details/fpga-engineer-intern-australia/",
    source: "Official careers page",
    content: "11 week internship. Pursuing a Bachelor's, Master's or PhD in Electrical Engineering, Computer Engineering or related fields.",
  },
  {
    company: "DE Shaw",
    title: "Proprietary Trading Intern (New York) - Summer 2027",
    location: "New York",
    url: "https://www.deshaw.com/careers/Proprietary-Trading-Intern-New-York-Summer-2027-5731",
    source: "Official careers page",
    content: "Ten-week program expected to run from June to August 2027. Students usually approaching final year of full-time study.",
  },
  {
    company: "Susquehanna International Group",
    title: "Quantitative Trader Internship: Summer 2027",
    location: "Bala Cynwyd (Philadelphia Area), Pennsylvania",
    url: "https://careers.sig.com/jobs/10717?lang=en-us",
    source: "Official careers page",
    content: "June 2027 start. Quantitative Trading + Strategy.",
  },
  {
    company: "Susquehanna International Group",
    title: "Quantitative Strategy Developer Internship: Summer 2027",
    location: "Bala Cynwyd (Philadelphia Area), Pennsylvania",
    url: "https://careers.sig.com/global-campus/jobs/10838?lang=en-us",
    source: "Official careers page",
    content: "June 2027 start. Technology - Software Engineering.",
  },
  {
    company: "Susquehanna International Group",
    title: "Trading System Engineering Internship: Summer 2027",
    location: "Bala Cynwyd (Philadelphia Area), Pennsylvania",
    url: "https://careers.sig.com/technology-software-engineering/jobs/10837?lang=en-us",
    source: "Official careers page",
    content: "June 2027 start. Technology - Software Engineering.",
  },
];
const dedupe = new Map();
for (const match of [...results.flatMap((r) => r.matches), ...manualMatches]) {
  dedupe.set(match.url, { ...match, notes: summarize(match) });
}
const matches = [...dedupe.values()];
matches.sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title));

const csv = [
  ["Company", "Title", "Location", "URL", "Source", "Notes"].map(csvEscape).join(","),
  ...matches.map((m) => [m.company, m.title, m.location, m.url, m.source, m.notes].map(csvEscape).join(",")),
].join("\n");

const zeroOrNotFound = results
  .filter((r) => !matches.some((m) => m.company === r.company || (r.company === "Citadel" && m.company === "Citadel Securities") || (r.company === "Susquehanna International Group" && m.company === "SIG")))
  .map((r) => ({
    company: r.company,
    checkedBoards: r.boards.map((b) => `${b.source} (${b.count})`).join("; "),
  }));

const md = [
  `# Quant Internship Open Roles Scan`,
  ``,
  `Scanned: ${scannedAt}`,
  `Companies deduplicated: ${companies.length}`,
  `Open relevant roles found: ${matches.length}`,
  ``,
  `Criteria used: open ATS posting, internship/co-op wording, quant/trading/software/developer/research/engineering domain, excluding obvious new-grad/full-time/PhD-only roles. Graduation years are eligibility metadata, not internship timing.`,
  ``,
  `## Open Relevant Roles`,
  ``,
  matches.length
    ? matches.map((m) => `- **${m.company}** — [${m.title}](${m.url}) — ${m.location || "Location not listed"} (${m.source}${m.notes ? `; ${m.notes}` : ""})`).join("\n")
    : `_No matches found by the automated official-board scan._`,
  ``,
  `## Companies With No Matching Internship Found In Checked ATS Boards`,
  ``,
  zeroOrNotFound.map((r) => `- **${r.company}**${r.checkedBoards ? ` — checked ${r.checkedBoards}` : " — no public Greenhouse/Lever/Ashby board discovered by slug scan"}`).join("\n"),
  ``,
].join("\n");

await fs.writeFile("quant_internship_roles_scan.csv", csv, "utf8");
await fs.writeFile("quant_internship_roles_scan.md", md, "utf8");
await fs.writeFile("quant_internship_scan_raw.json", JSON.stringify({ scannedAt, results }, null, 2), "utf8");
await fs.writeFile("quant_internship_scan_audit.json", JSON.stringify({
  scannedAt,
  companies,
  companyAudits: results.map((result) => ({
    company: result.company,
    resolvedBoards: result.boards,
    jobsSeen: result.boards.reduce((count, board) => count + board.count, 0),
    relevantInternships: result.matches.length,
  })),
}, null, 2), "utf8");

console.log(`companies=${companies.length} matches=${matches.length}`);
console.log(`wrote quant_internship_roles_scan.csv, quant_internship_roles_scan.md, quant_internship_scan_raw.json, quant_internship_scan_audit.json`);
