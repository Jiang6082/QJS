import fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarDate } from "./calendar-date.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(repo, "inputs/manually_verified_roles.json");
const input = JSON.parse(await fs.readFile(inputPath, "utf8"));
const today = calendarDate();

function ashbyReference(value = "") {
  try {
    const url = new URL(value);
    if (url.hostname !== "jobs.ashbyhq.com") return null;
    const [token, id] = url.pathname.split("/").filter(Boolean);
    return token && id ? { token, id } : null;
  } catch {
    return null;
  }
}

const boardTokens = [...new Set((input.roles || [])
  .map((role) => ashbyReference(role.URL)?.token)
  .filter(Boolean))];
const jobsByToken = new Map();

for (const token of boardTokens) {
  const response = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${token}`, {
    headers: { "user-agent": "Mozilla/5.0 QJS manual-role verifier", accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Ashby board ${token} returned HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.jobs)) throw new Error(`Ashby board ${token} returned an invalid payload`);
  jobsByToken.set(token, new Map(payload.jobs.map((job) => [String(job.id), job])));
}

let verified = 0;
let missing = 0;
let unsupported = 0;
for (const role of input.roles || []) {
  const reference = ashbyReference(role.URL);
  if (!reference) {
    unsupported += 1;
    continue;
  }
  const job = jobsByToken.get(reference.token)?.get(reference.id);
  if (!job || job.isListed === false) {
    missing += 1;
    continue;
  }
  role.Title = job.title || role.Title;
  role.Location = job.location || job.locationName || role.Location;
  role.release_date = calendarDate(job.publishedAt) || role.release_date;
  role.verifiedAt = today;
  verified += 1;
}

input.verifiedAt = today;
await fs.writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`, "utf8");
console.log(`manual verification: verified=${verified} missing=${missing} unsupported=${unsupported} date=${today}`);
