/**
 * import.js  —  Step 2
 * Reads every .json file from dataDownloads/, transforms it to Collibra format,
 * and POSTs it sequentially to the Collibra import API.
 *
 * Run directly:  node src/import.js
 * Or via:        npm run import
 */

import { readdir, readFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { paths, sources } from "./config.js";
import { transform } from "./transform.js";
import { importJson } from "./collibra.js";

/** Maps a filename back to the source's community name using dataLocations config. */
function communityNameFor(fileName) {
  // Derive the slug the same way download.js does, then match.
  const slug = fileName;
  const match = sources.find((s) => {
    const expected = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return expected === slug;
  });
  // Fall back gracefully to a title-cased version of the filename slug.
  return match?.name ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function importAll() {
  let files;

  try {
    files = await readdir(paths.downloads);
  } catch {
    throw new Error(`dataDownloads directory not found. Run "npm run download" first.`);
  }

  const jsonFiles = files.filter((f) => extname(f) === ".json");

  if (jsonFiles.length === 0) {
    console.warn("No JSON files found in dataDownloads/. Nothing to import.");
    return [];
  }

  const results = [];

  for (const file of jsonFiles) {
    const slug      = basename(file, ".json");
    const community = communityNameFor(slug);

    console.log(`\n[Import] ${community}`);
    console.log(`  File: ${file}`);

    try {
      const raw     = await readFile(join(paths.downloads, file), "utf8");
      const catalog = JSON.parse(raw);
      const payload = transform(catalog, community);

      console.log(`  ↳ ${payload.length - 2} dataset(s) to import…`);

      const response = await importJson(payload, slug);

      console.log(`  ✓ Collibra response:`, JSON.stringify(response).slice(0, 120));
      results.push({ file, community, ok: true, response });
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      results.push({ file, community, ok: false, error: err.message });
    }
  }

  return results;
}

// ── Run as script ─────────────────────────────────────────────────────────────

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const results = await importAll();
  const failed  = results.filter((r) => !r.ok);

  console.log(`\n── Import complete: ${results.length - failed.length}/${results.length} succeeded ──`);
  if (failed.length) process.exitCode = 1;
}
