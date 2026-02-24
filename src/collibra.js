/**
 * collibra.js
 * Thin Collibra REST API client.
 * Uses native fetch + FormData (Node 18+) — no extra dependencies needed.
 */

import { collibra } from "./config.js";

const BASE_URL = `https://${collibra.hostname}`;
const AUTH     = "Basic " + Buffer.from(`${collibra.username}:${collibra.password}`).toString("base64");

/**
 * POSTs a Collibra import JSON payload via multipart/form-data.
 *
 * @param {object[]} payload     The transformed Collibra JSON array
 * @param {string}   name        Used as the multipart filename (cosmetic in job logs)
 * @returns {Promise<object>}    Parsed JSON response from Collibra
 */
export async function importJson(payload, name) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const form = new FormData();
  form.append("continueOnError",  "false");
  form.append("deleteFile",       "false");
  form.append("simulation",       "false");
  form.append("relationsAction",  "ADD_OR_IGNORE");
  form.append("sendNotification", "false");
  form.append("saveResult",       "false");
  form.append("batchSize",        "1000");
  form.append("file", blob, `${name}.json`);

  const url = `${BASE_URL}${collibra.apiPath}`;

  const res = await fetch(url, {
    method:  "POST",
    headers: { Authorization: AUTH },
    body:    form,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Collibra API error ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    // Some Collibra versions return plain text on success.
    return { raw: text };
  }
}
