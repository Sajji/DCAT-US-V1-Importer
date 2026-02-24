/**
 * config.js
 * Loads environment variables and the dataLocations config file.
 * Throws early with a clear message if anything required is missing.
 */

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── Collibra credentials ──────────────────────────────────────────────────────

const REQUIRED_ENV = ["COLLIBRA_HOSTNAME", "COLLIBRA_USERNAME", "COLLIBRA_PASSWORD"];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Copy .env.example to .env and fill in your values.`
    );
  }
}

export const collibra = {
  hostname: process.env.COLLIBRA_HOSTNAME,
  username: process.env.COLLIBRA_USERNAME,
  password: process.env.COLLIBRA_PASSWORD,
  apiPath:  "/rest/2.0/import/json-job",
};

// ── Data sources ──────────────────────────────────────────────────────────────

const raw = await readFile(resolve(ROOT, "dataLocations.json"), "utf8");
const locations = JSON.parse(raw);

const defaults = locations.defaults ?? {};

/** @type {Array<{ url: string, name: string, headless: boolean, timeoutMs: number, retries: number }>} */
export const sources = (locations.sources ?? []).map((src) => {
  if (!src.url)  throw new Error(`A source is missing a "url" field.`);
  if (!src.name) throw new Error(`Source "${src.url}" is missing a "name" field.`);

  return {
    url:       src.url,
    name:      src.name,
    headless:  src.headless  ?? defaults.headless  ?? true,
    timeoutMs: src.timeoutMs ?? defaults.timeoutMs ?? 60_000,
    retries:   src.retries   ?? defaults.retries   ?? 2,
  };
});

// ── Paths ─────────────────────────────────────────────────────────────────────

export const paths = {
  downloads: resolve(ROOT, "dataDownloads"),
};
