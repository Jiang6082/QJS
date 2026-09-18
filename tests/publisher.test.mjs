import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

test("publisher retries a failed push from a clean checkout and rejects unrelated staged work", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "qjs-publisher-test-"));
  const work = path.join(temp, "work");
  const remote = path.join(temp, "remote.git");
  fs.mkdirSync(work);
  const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const git = (args, cwd = work) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  try {
    git(["init", "--initial-branch=main"]);
    git(["config", "user.name", "QJS Regression"]);
    git(["config", "user.email", "qjs-test@example.invalid"]);
    for (const file of ["scripts/publish_scan_results.mjs", "scripts/calendar-date.mjs", "tools/publish-policy.mjs"]) {
      const target = path.join(work, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(source, file), target);
    }
    git(["add", "."]);
    git(["commit", "-m", "Fixture"]);
    git(["remote", "add", "origin", path.join(temp, "not-created.git")]);
    const publish = () => spawnSync(process.execPath, [path.join(work, "scripts/publish_scan_results.mjs")], { cwd: temp, encoding: "utf8" });
    assert.notEqual(publish().status, 0);
    assert.equal(git(["status", "--porcelain"]), "");
    git(["init", "--bare", remote], temp);
    git(["remote", "set-url", "origin", remote]);
    const retry = publish();
    assert.equal(retry.status, 0, retry.stderr);
    assert.equal(git(["ls-remote", "origin", "refs/heads/main"]).split(/\s+/)[0], git(["rev-parse", "HEAD"]));
    fs.writeFileSync(path.join(work, "personal-note.txt"), "unrelated fixture data");
    git(["add", "personal-note.txt"]);
    const blocked = publish();
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /Unrelated files are staged/);
    assert.equal(git(["diff", "--cached", "--name-only"]), "personal-note.txt");
  } finally {
    const resolved = fs.realpathSync(temp);
    const tempRoot = fs.realpathSync(os.tmpdir()) + path.sep;
    if (!resolved.startsWith(tempRoot) || !path.basename(resolved).startsWith("qjs-publisher-test-")) throw new Error("Unexpected test cleanup path");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
