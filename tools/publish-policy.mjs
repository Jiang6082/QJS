export function isScanArtifact(file) {
  return file === "README.md" || /^(?:data|reports)\//.test(file)
    || ["inputs/company_career_pages.json", "inputs/manually_verified_roles.json"].includes(file);
}

export function publishPaths(changed, staged) {
  const unrelated = staged.filter((file) => !isScanArtifact(file));
  if (unrelated.length) throw new Error("Unrelated files are staged: " + unrelated.join(", "));
  return changed.filter(isScanArtifact);
}
