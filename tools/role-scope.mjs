// Employment timing and graduation eligibility are different dates.
export function hasNonTargetInternshipTiming(title = "", notes = "", targetYear = 2027) {
  const titleYears = [...String(title).matchAll(/\b20\d{2}\b/g)].map((match) => Number(match[0]));
  if (titleYears.some((year) => year < targetYear) && /intern|实习|summer analyst|co-?op/i.test(title)) return true;
  if (titleYears.includes(targetYear)) return false;
  const timing = String(notes).match(/(?:^|[|;]\s*)internship timing:\s*([^|;]+)/i)?.[1] || "";
  return [...timing.matchAll(/\b20\d{2}\b/g)].some((match) => Number(match[0]) < targetYear)
    || new RegExp(`20[0-9]{2}\\s*(?:年\\s*)?(?:(?:春|夏|秋|冬)季|暑期)?\\s*实习`, "u").test(title) && titleYears.some((year) => year < targetYear);
}
