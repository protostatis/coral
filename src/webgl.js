import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REEF_API = "/api/coral/reef";
const REEF_DATA_TAG = '<script id="coral-reef-data" type="application/json"></script>';
const REEF_TITLE_PATTERN = /<title>.*?<\/title>/;
const REEF_API_PATTERN = /params\.get\('api'\) \|\| \(location\.protocol === 'file:' \? '' : '[^']*'\)/;
const WEBGL_DOCUMENT = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../examples/reef-realistic-data-demo.html"), "utf8");

export function renderCoralReefDocument(input = {}, options = {}) {
  const source = input ?? {};
  const reef = source?.reef?.colonies ? source.reef : source?.colonies ? source : null;
  const api = options.api ?? source.api ?? DEFAULT_REEF_API;
  const title = options.title ?? source.title ?? "Coral Evidence Reef";
  let html = webglDocument();

  html = replaceRequired(html, REEF_TITLE_PATTERN, `<title>${escapeHtml(title)}</title>`, "WebGL reef title");
  html = replaceRequired(html, REEF_API_PATTERN, `params.get('api') || ${safeScriptString(api || "")}`, "WebGL reef API fallback");

  if (reef) {
    html = replaceRequired(html, REEF_DATA_TAG, `<script id="coral-reef-data" type="application/json">${safeJson(reef)}</script>`, "WebGL reef embedded data");
  }

  return html;
}

function webglDocument() {
  return WEBGL_DOCUMENT;
}

function replaceRequired(html, search, replacement, label) {
  const matched = typeof search === "string" ? html.includes(search) : search.test(html);

  if (!matched) {
    throw new Error(`${label} template marker was not found`);
  }

  return html.replace(search, replacement);
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
