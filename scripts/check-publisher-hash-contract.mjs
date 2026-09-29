/**
 * Optional local, read-only comparison. Does not import/start the Meteor app.
 * Executes only the named pure functions from the explicitly supplied checkout.
 * No publisher source is copied into this repository or fixture output.
 */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { argv, stdout } from "node:process";
import vm from "node:vm";
import { URL } from "node:url";
import ts from "typescript";

const publisher = argv[2];
if (!publisher)
  throw new Error(
    "Supply the local CbyUCE checkout path; no network checkout is performed",
  );
const corpus = JSON.parse(
  readFileSync(
    new URL("../tests/fixtures/hash-profiles/vectors.json", import.meta.url),
    "utf8",
  ),
);
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: publisher,
  encoding: "utf8",
}).trim();
assert.equal(
  revision,
  corpus.publisherRevision,
  "Publisher revision drift requires contract review",
);

const selection = {
  "lib/utils/cryptoUtils.js": ["canonicalizeRFC8785", "sha256Hex"],
  "server/methods/manifestMethods.js": [
    "toIsoStringSafe",
    "buildAttestations",
    "buildConnectorSource",
    "buildManifestHashPreimage",
  ],
  "imports/lib/policy/extendedRecord.js": [
    "canonicalRecordJSON",
    "extendedManifestPreimage",
  ],
  "imports/lib/policy/recordDetailsLimits.js": ["isExtendedRecord"],
};
const fragments = [];
const fileDigests = {};
for (const [path, names] of Object.entries(selection)) {
  const source = readFileSync(resolve(publisher, path), "utf8");
  const committed = execFileSync("git", ["show", `${revision}:${path}`], {
    cwd: publisher,
    encoding: "utf8",
    maxBuffer: 2_000_000,
  });
  assert.equal(source, committed, `Uncommitted publisher drift in ${path}`);
  fileDigests[path] = crypto.createHash("sha256").update(source).digest("hex");
  const ast = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  for (const name of names) {
    const nodes = ast.statements.filter(
      (statement) =>
        ts.isFunctionDeclaration(statement) && statement.name?.text === name,
    );
    assert.equal(
      nodes.length,
      1,
      `Expected exactly one pure function: ${name}`,
    );
    fragments.push(nodes[0].getText(ast).replace(/^export\s+/, ""));
  }
}
const brandPath = "imports/api/brandLaunch.js";
const brandSource = readFileSync(resolve(publisher, brandPath), "utf8");
assert.equal(
  brandSource,
  execFileSync("git", ["show", `${revision}:${brandPath}`], {
    cwd: publisher,
    encoding: "utf8",
  }),
);
assert.match(brandSource, /export const BRAND_FLOW_VERSION = '1\.3\.1';/);
fragments.unshift(
  "const BRAND_FLOW_VERSION = '1.3.1'; const EXTENDED_RECORD_FORMAT = 'extended-v1';",
);
const context = vm.createContext({ crypto, Buffer });
vm.runInContext(fragments.join("\n"), context, { timeout: 1000 });

function evaluate(expression, input) {
  context.fixtureJSON = JSON.stringify(input);
  // JSON is parsed INSIDE the context: no shared object or prototype state.
  return vm.runInContext(
    `JSON.stringify((() => { const f = JSON.parse(fixtureJSON); return ${expression}; })())`,
    context,
    { timeout: 1000 },
  );
}

let count = 0;
for (const entry of corpus.records) {
  const extended = ["1.1.0", "2.1.0"].includes(entry.manifest.schemaVersion);
  const projection = extended
    ? "extendedManifestPreimage(f.manifest)"
    : "buildManifestHashPreimage(f.publisherInput.upload, f.publisherInput.fileHash, f.publisherInput.merkleRoot, {schemaVersion:f.publisherInput.schemaVersion, generatedAt:f.publisherInput.generatedAt})";
  const preimage = JSON.parse(evaluate(projection, entry));
  assert.deepEqual(
    preimage,
    entry.expected.preimage,
    `${entry.id}: publisher preimage`,
  );
  const serializer = extended ? "canonicalRecordJSON" : "canonicalizeRFC8785";
  const canonical = JSON.parse(evaluate(`${serializer}(f)`, preimage));
  assert.equal(
    canonical,
    entry.expected.canonical,
    `${entry.id}: canonical bytes`,
  );
  assert.equal(
    crypto.createHash("sha256").update(canonical, "utf8").digest("hex"),
    entry.expected.sha256,
    entry.id,
  );
  assert.equal(
    Buffer.from(canonical, "utf8").toString("hex"),
    entry.expected.canonicalUtf8Hex,
  );
  count++;
}
for (const entry of corpus.serialization) {
  for (const expected of entry.results) {
    const serializer =
      expected.serializer === "standard-ecmascript-v1"
        ? "canonicalizeRFC8785"
        : "canonicalRecordJSON";
    assert.equal(
      JSON.parse(evaluate(`${serializer}(f)`, entry.input)),
      expected.canonical,
      `${entry.id}/${serializer}`,
    );
    count++;
  }
}
const publicManifest = JSON.parse(
  readFileSync(
    new URL("../tests/fixtures/extended-production.json", import.meta.url),
    "utf8",
  ),
);
const publicVector = JSON.parse(
  readFileSync(
    new URL(
      "../tests/fixtures/extended-production-vector.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const publicPreimage = JSON.parse(
  evaluate("extendedManifestPreimage(f)", publicManifest),
);
assert.deepEqual(
  publicPreimage,
  publicVector.preimage,
  "Production Extended preimage",
);
const publicCanonical = JSON.parse(
  evaluate("canonicalRecordJSON(f)", publicPreimage),
);
assert.equal(
  publicCanonical,
  publicVector.canonical,
  "Production canonical bytes",
);
assert.equal(
  crypto.createHash("sha256").update(publicCanonical, "utf8").digest("hex"),
  publicManifest.hashes.manifestHash,
  "Production recorded hash",
);
count++;
stdout.write(
  JSON.stringify(
    {
      status: "passed",
      publisherRevision: revision,
      comparisons: count,
      sourceFileSha256: fileDigests,
      scope:
        "pure preimage builders and serializers; synthetic corpus plus a captured public production Extended record; no Meteor, DB, signatures, issuance or live network tested by this script",
    },
    null,
    2,
  ) + "\n",
);
