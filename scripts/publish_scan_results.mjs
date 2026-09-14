import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarDate } from "./calendar-date.mjs";
import { publishPaths } from "../tools/publish-policy.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function run(command, args) {
  const result = spawnSync(command, args, { cwd: repo, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout.trim();
}
const branch = run("git", ["branch", "--show-current"]);
if (!branch) throw new Error("Cannot publish a detached HEAD. Check out the intended branch.");
const split = (text) => text.split(/\r?\n/).filter(Boolean);
const paths = publishPaths([...split(run("git", ["diff", "HEAD", "--name-only"])), ...split(run("git", ["ls-files", "--others", "--exclude-standard"]))], split(run("git", ["diff", "--cached", "--name-only"])));
if (paths.length) {
  run(process.execPath, [resolve(repo, "scripts/validate-quant-workflow.mjs"), "--check"]);
  run("git", ["diff", "--check"]);
  run("git", ["add", "--", ...paths]);
  run("git", ["commit", "-m", `Update scan results ${calendarDate()}`]);
}
// Always retry the push even if an earlier attempt committed successfully.
run("git", ["push", "-u", "origin", branch]);
const sha = run("git", ["rev-parse", "HEAD"]);
const remote = run("git", ["ls-remote", "origin", `refs/heads/${branch}`]).split(/\s+/)[0];
if (remote !== sha) throw new Error("Remote branch does not match the published commit.");
console.log(`publish: verified ${branch} at ${sha}`);
