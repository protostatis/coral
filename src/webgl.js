import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REEF_API = "/api/coral/reef";
const REEF_DATA_TAG = '<script id="coral-reef-data" type="application/json"></script>';
const REEF_TITLE_PATTERN = /<title>.*?<\/title>/;
const REEF_API_PATTERN = /params\.get\('api'\) \|\| \(location\.protocol === 'file:' \? '' : '[^']*'\)/;

let cachedWebglDocument = "";

export function renderCoralReefDocument(input = {}, options = {}) {
  const source = input ?? {};
  const reef = source?.reef?.colonies ? source.reef : source?.colonies ? source : null;
  const api = options.api ?? source.api ?? DEFAULT_REEF_API;
  const title = options.title ?? source.title ?? "Coral Evidence Reef";
  let html = webglDocument();

  html = html.replace(REEF_TITLE_PATTERN, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(REEF_API_PATTERN, `params.get('api') || ${safeScriptString(api || "")}`);

  if (reef) {
    html = html.replace(REEF_DATA_TAG, `<script id="coral-reef-data" type="application/json">${safeJson(reef)}</script>`);
  }

  return html;
}

function webglDocument() {
  if (!cachedWebglDocument) {
    cachedWebglDocument = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../examples/reef-realistic-data-demo.html"), "utf8");
  }

  return cachedWebglDocument;
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("&", "\\u0026");
}

function safeScriptString(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("&", "\\u0026");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
