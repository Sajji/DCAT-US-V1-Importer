/**
 * fetcher.js
 * Fetches a JSON URL using native fetch first (fast), and falls back to a
 * headless Puppeteer browser if the server returns a non-2xx status or an
 * HTML interstitial — common with some government data portals.
 */

import puppeteer from "puppeteer";

// ── Native fetch ──────────────────────────────────────────────────────────────

async function fetchNative(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept:          "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/121.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    if (/<!doctype html>|<html[\s>]/i.test(text)) {
      throw new Error("HTML interstitial received — browser fallback needed.");
    }

    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

// ── Puppeteer fallback ────────────────────────────────────────────────────────

async function fetchViaBrowser(url, { headless, timeoutMs }) {
  const browser = await puppeteer.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/121.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      Accept:          "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Drop images/media/fonts to speed things up.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "media", "font"].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout:   timeoutMs,
    });

    if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);

    // Browsers wrap raw JSON in a <pre> tag.
    const text = await page.evaluate(
      () => document.body.querySelector("pre")?.innerText ?? document.body.innerText
    );

    if (!text?.trim()) throw new Error("Empty response body.");
    if (/<!doctype html>|<html[\s>]/i.test(text)) {
      throw new Error("HTML interstitial received even via browser.");
    }

    return JSON.parse(text);
  } finally {
    await browser.close();
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches and parses JSON from `url`.
 * Tries native fetch first; if that fails, retries with Puppeteer.
 * Respects the `retries` option for the browser fallback.
 *
 * @param {string} url
 * @param {{ headless?: boolean, timeoutMs?: number, retries?: number }} opts
 * @returns {Promise<unknown>} Parsed JSON data
 */
export async function fetchJson(url, opts = {}) {
  const { headless = true, timeoutMs = 60_000, retries = 2 } = opts;

  // 1. Fast path — native fetch.
  try {
    console.log(`  ↳ Trying native fetch…`);
    return await fetchNative(url, timeoutMs);
  } catch (nativeErr) {
    console.warn(`  ↳ Native fetch failed (${nativeErr.message}), switching to browser.`);
  }

  // 2. Slow path — headless browser with retries.
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`  ↳ Browser attempt ${attempt}/${retries + 1}…`);
      return await fetchViaBrowser(url, { headless, timeoutMs });
    } catch (err) {
      lastError = err;
      if (attempt <= retries) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }

  throw new Error(`All fetch attempts failed: ${lastError?.message}`);
}
