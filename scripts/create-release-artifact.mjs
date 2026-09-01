import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { env, stdout } from "node:process";
import { execFileSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const packageMetadata = JSON.parse(
  readFileSync(join(projectRoot, "package.json"), "utf8"),
);
const releaseVersion = packageMetadata.version;
const evidenceUrl = `https://uceevidencelens.com/evidence/v${releaseVersion}`;
const archiveName = `uce-evidence-lens-site-v${releaseVersion}.zip`;
const archiveDirectory = join(projectRoot, "release-artifacts");
const archivePath = join(archiveDirectory, archiveName);

const gitStatus = execFileSync("git", ["status", "--porcelain"], {
  cwd: projectRoot,
  encoding: "utf8",
}).trim();
if (gitStatus) {
  throw new Error(
    "Release artifacts must be created from a clean committed worktree.",
  );
}

execFileSync("npm", ["run", "check"], {
  cwd: projectRoot,
  stdio: "inherit",
});

const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: projectRoot,
  encoding: "utf8",
}).trim();
const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "uce-evidence-lens-release-"),
);
const releaseRootName = `uce-evidence-lens-site-v${releaseVersion}`;
const releaseRoot = join(temporaryDirectory, releaseRootName);
const siteDirectory = join(releaseRoot, "site");

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

try {
  cpSync(join(projectRoot, "dist"), siteDirectory, { recursive: true });
  for (const releaseDocument of ["LICENSE", "NOTICE.md", "TRADEMARKS.md"]) {
    cpSync(
      join(projectRoot, releaseDocument),
      join(releaseRoot, releaseDocument),
    );
  }
  const provenance = {
    name: "UCE Evidence Lens",
    releaseVersion,
    gitCommit: commit,
    sourceRepository: "https://github.com/hedward/uce-evidence-lens",
    buildCommand: "npm ci && npm run build",
    buildRuntime: "Node.js 24",
    deploymentTarget: "Static Cloudflare Pages",
    evidenceUrl,
    scope:
      "Compiled static site files, release provenance, MPL-2.0 license, notice, and separate trademark/authorized-mark terms. Cloudflare account configuration and the external evidence-route redirect are outside the archive.",
  };
  writeFileSync(
    join(releaseRoot, "RELEASE-EVIDENCE.json"),
    `${JSON.stringify(provenance, null, 2)}\n`,
  );

  const checksummedFiles = filesUnder(releaseRoot).sort();
  const checksumLines = checksummedFiles.map(
    (path) => `${sha256(path)}  ${relative(releaseRoot, path)}`,
  );
  writeFileSync(
    join(releaseRoot, "SHA256SUMS"),
    `${checksumLines.join("\n")}\n`,
  );

  const normalizedTime = new Date("1980-01-01T00:00:00.000Z");
  const pathsToNormalize = [releaseRoot, ...filesUnder(releaseRoot)];
  for (const path of pathsToNormalize) {
    if (existsSync(path)) utimesSync(path, normalizedTime, normalizedTime);
  }

  mkdirSync(archiveDirectory, { recursive: true });
  if (existsSync(archivePath)) unlinkSync(archivePath);
  const archiveEntries = filesUnder(releaseRoot)
    .map((path) => relative(temporaryDirectory, path))
    .sort();
  execFileSync("zip", ["-X", "-q", archivePath, "-@"], {
    cwd: temporaryDirectory,
    env: { ...env, TZ: "UTC" },
    input: `${archiveEntries.join("\n")}\n`,
  });

  const archiveSize = statSync(archivePath).size;
  stdout.write(`Created ${basename(archivePath)}\n`);
  stdout.write(`Path: ${archivePath}\n`);
  stdout.write(`Bytes: ${archiveSize}\n`);
  stdout.write(`SHA-256: ${sha256(archivePath)}\n`);
  stdout.write(`Commit: ${commit}\n`);
  stdout.write(`Evidence route: ${evidenceUrl}\n`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
