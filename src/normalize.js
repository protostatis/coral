import { createHash, randomUUID } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ref",
  "ref_src",
]);

export function randomId(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function sha256(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

export function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toIsoDate(value, fallback = new Date()) {
  if (!value) {
    return fallback.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date.toISOString();
}

export function nowFromClock(clock) {
  const value = typeof clock === "function" ? clock() : new Date();
  return value instanceof Date ? value : new Date(value);
}

export function canonicalizeUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
    parsed.port = "";
  }

  for (const key of [...parsed.searchParams.keys()]) {
    if (key.startsWith("utm_") || TRACKING_PARAMS.has(key)) {
      parsed.searchParams.delete(key);
    }
  }

  parsed.searchParams.sort();

  return parsed.toString();
}

export function domainFromUrl(url) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

export function coalesce(input, ...keys) {
  for (const key of keys) {
    if (input?.[key] !== undefined && input[key] !== null) {
      return input[key];
    }
  }

  return undefined;
}

export function normalizeCapture(input, options = {}) {
  if (!input || typeof input !== "object") {
    throw new Error("Capture input must be an object");
  }

  if (!input.url) {
    throw new Error("Capture input requires url");
  }

  const clockNow = nowFromClock(options.clock);
  const canonicalUrl = coalesce(input, "canonical_url", "canonicalUrl") ?? canonicalizeUrl(input.url);
  const text = normalizeText(coalesce(input, "text", "body", "content") ?? "");
  const compactText = normalizeWhitespace(text).toLowerCase();
  const query = normalizeWhitespace(input.query ?? "");
  const topic = normalizeWhitespace(input.topic ?? query);
  const meta = { ...(input.meta ?? {}) };

  if (input.status !== undefined) {
    meta.status = input.status;
  }

  if (input.content_type !== undefined || input.contentType !== undefined) {
    meta.content_type = input.content_type ?? input.contentType;
  }

  meta.text_length = text.length;

  return {
    id: input.id ?? randomId("c"),
    url: input.url,
    canonical_url: canonicalUrl,
    domain: normalizeWhitespace(input.domain ?? domainFromUrl(canonicalUrl)),
    title: normalizeWhitespace(input.title ?? ""),
    text,
    query,
    topic,
    captured_at: toIsoDate(coalesce(input, "captured_at", "capturedAt"), clockNow),
    run_id: coalesce(input, "run_id", "runId") ?? "",
    session_id: coalesce(input, "session_id", "sessionId") ?? "",
    answer_id: coalesce(input, "answer_id", "answerId") ?? "",
    source: input.source ?? options.source ?? "searchagentsky",
    content_hash: coalesce(input, "content_hash", "contentHash") ?? sha256(`${canonicalUrl}\n${compactText}`),
    text_hash: coalesce(input, "text_hash", "textHash") ?? sha256(compactText),
    duplicate_of: coalesce(input, "duplicate_of", "duplicateOf") ?? "",
    meta,
  };
}

export function normalizeRun(input, options = {}) {
  if (!input || typeof input !== "object") {
    throw new Error("Run input must be an object");
  }

  if (!input.query) {
    throw new Error("Run input requires query");
  }

  const clockNow = nowFromClock(options.clock);
  const query = normalizeWhitespace(input.query);

  return {
    id: input.id ?? randomId("r"),
    query,
    topic: normalizeWhitespace(input.topic ?? query),
    started_at: toIsoDate(coalesce(input, "started_at", "startedAt"), clockNow),
    ended_at: coalesce(input, "ended_at", "endedAt") ? toIsoDate(coalesce(input, "ended_at", "endedAt"), clockNow) : "",
    session_id: coalesce(input, "session_id", "sessionId") ?? "",
    answer_id: coalesce(input, "answer_id", "answerId") ?? "",
    result_url: coalesce(input, "result_url", "resultUrl") ?? "",
    source: input.source ?? options.source ?? "searchagentsky",
    status: input.status ?? "completed",
    meta: { ...(input.meta ?? {}) },
  };
}
