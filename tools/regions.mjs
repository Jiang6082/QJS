export const regionOrder = [
  "North America",
  "Europe",
  "Asia",
  "Oceania",
  "Middle East",
  "South America",
  "Africa",
  "Global / Multiple Regions",
  "Remote / Unspecified",
];

const patterns = {
  "North America": /\b(?:united states|u\.?s\.?a?|americas?|amers|canada|mexico|new york|chicago|boston|miami|greenwich|houston|austin|stamford|san francisco|los angeles|washington|jersey city|philadelphia|montreal|toronto|vancouver|camden|hanover|connecticut|illinois|massachusetts|california|texas|florida|new jersey|pennsylvania|nyc|n\.y\.|ct|il|ma|ca|tx|fl|nj|pa)\b/i,
  "Europe": /\b(?:europe|emea|united kingdom|u\.?k\.?|england|ireland|france|germany|netherlands|switzerland|poland|spain|italy|sweden|norway|denmark|finland|austria|belgium|czech|romania|hungary|slovakia|portugal|london|paris|zurich|dublin|amsterdam|geneva|berlin|munich|frankfurt|warsaw|krakow|prague|madrid|milan|stockholm|oslo|copenhagen|helsinki|vienna|brussels|budapest|bucharest|lisbon|bristol|bratislava)\b/i,
  "Asia": /\b(?:asia|apac|apej|singapore|hong kong|china|japan|india|taiwan|south korea|korea|vietnam|thailand|malaysia|indonesia|philippines|beijing|shanghai|shenzhen|tokyo|seoul|mumbai|bengaluru|bangalore|hyderabad|ho chi minh|hanoi|kuala lumpur)\b/i,
  "Oceania": /\b(?:oceania|australia|new zealand|sydney|melbourne|brisbane|perth|auckland)\b/i,
  "Middle East": /\b(?:middle east|uae|u\.a\.e\.|united arab emirates|dubai|abu dhabi|israel|tel aviv|saudi arabia|qatar|bahrain|kuwait)\b/i,
  "South America": /\b(?:south america|latin america|latam|brazil|argentina|chile|colombia|peru|uruguay|sao paulo|buenos aires|santiago|bogota)\b/i,
  "Africa": /\b(?:africa|south africa|egypt|morocco|nigeria|kenya|johannesburg|cape town|cairo|lagos|nairobi)\b/i,
};

export function regionForLocation(location = "") {
  const value = String(location).replace(/\s+/g, " ").trim();
  const matched = Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(value))
    .map(([region]) => region);
  if (matched.length > 1) return "Global / Multiple Regions";
  if (matched.length === 1) return matched[0];
  return "Remote / Unspecified";
}

export function rowsByRegion(rows) {
  const grouped = new Map(regionOrder.map((region) => [region, []]));
  for (const row of rows) grouped.get(regionForLocation(row.Location)).push(row);
  return grouped;
}

export function roleMarkdown(row) {
  return `- **${row.Company}** - [${row.Title}](${row.URL})${row.Location ? ` - ${row.Location}` : ""} - ${row.Status} (${row.Source})${row.Notes ? `: ${row.Notes}` : ""}`;
}

export function groupedRoleMarkdown(rows, emptyText = "_None._") {
  const grouped = rowsByRegion(rows);
  return regionOrder.flatMap((region) => {
    const regionRows = grouped.get(region);
    return [
      `### ${region} (${regionRows.length})`,
      "",
      regionRows.length ? regionRows.map(roleMarkdown).join("\n") : emptyText,
      "",
    ];
  });
}
