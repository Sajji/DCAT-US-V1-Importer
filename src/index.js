/**
 * index.js  —  Full pipeline
 * Runs Step 1 (download) then Step 2 (import) end-to-end.
 *
 * Run via:  npm start
 */

import { downloadAll } from "./download.js";
import { importAll }   from "./import.js";

console.log("═══════════════════════════════════════");
console.log("  DCAT-US → Collibra Importer");
console.log("═══════════════════════════════════════");

// ── Step 1 ────────────────────────────────────────────────────────────────────

console.log("\n▶  Step 1: Downloading catalogs…\n");
const downloadResults = await downloadAll();
const downloadFailed  = downloadResults.filter((r) => !r.ok);

console.log(
  `\n  Download summary: ${downloadResults.length - downloadFailed.length}/${downloadResults.length} succeeded`
);

if (downloadFailed.length === downloadResults.length) {
  console.error("\n  All downloads failed — aborting import step.");
  process.exitCode = 1;
  process.exit();
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

console.log("\n▶  Step 2: Importing into Collibra…\n");
const importResults = await importAll();
const importFailed  = importResults.filter((r) => !r.ok);

console.log(
  `\n  Import summary: ${importResults.length - importFailed.length}/${importResults.length} succeeded`
);

// ── Final status ──────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════");

if (downloadFailed.length || importFailed.length) {
  console.log("  Pipeline finished with errors — see above for details.");
  process.exitCode = 1;
} else {
  console.log("  Pipeline complete. ✓");
}

console.log("═══════════════════════════════════════\n");
