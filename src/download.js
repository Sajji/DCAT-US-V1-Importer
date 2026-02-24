/**
 * download.js  —  Step 1
 * Downloads each DCAT-US data.json catalog defined in dataLocations.json
 * and saves it to dataDownloads/<sanitised-name>.json.
 *
 * Run directly:  node src/download.js
 * Or via:        npm run download
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sources, paths } from "./config.js";
import { fetchJson } from "../lib/fetcher.js";

/** Turns a community name into a safe filename, e.g. "CMS Open Data" → "cms-open-data" */
function toFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function downloadAll() {
  await mkdir(paths.downloads, { recursive: true });

  const results = [];

  for (const src of sources) {
    console.log(`\n[Download] ${src.name}`);
    console.log(`  URL: ${src.url}`);

    try {
      const data = await fetchJson(src.url, {
        headless:  src.headless,
        timeoutMs: src.timeoutMs,
        retries:   src.retries,
      });

      const fileName = `${toFileName(src.name)}.json`;
      const outPath  = join(paths.downloads, fileName);

      await writeFile(outPath, JSON.stringify(data, null, 2), "utf8");

      console.log(`  ✓ Saved → ${outPath}`);
      results.push({ src, outPath, ok: true });
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      results.push({ src, ok: false, error: err.message });
    }
  }

  return results;
}

// ── Run as script ─────────────────────────────────────────────────────────────

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const results = await downloadAll();
  const failed  = results.filter((r) => !r.ok);

  console.log(`\n── Download complete: ${results.length - failed.length}/${results.length} succeeded ──`);
  if (failed.length) process.exitCode = 1;
}
