import { normalizeWhitespace } from "./normalize.js";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "why",
  "with",
]);

export function tokenize(value) {
  const tokens = normalizeWhitespace(value)
    .toLowerCase()
    .split(/[^a-z0-9._-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  return [...new Set(tokens)];
}

export function normalizeSearchArgs(input = {}, options = {}) {
  if (typeof input === "string") {
    return { ...options, query: input };
  }

  return { ...options, ...input };
}

export function matchesCapture(capture, filters = {}) {
  if (!filters.includeDuplicates && capture.duplicate_of) {
    return false;
  }

  if (filters.domain && !matchesDomain(capture.domain, filters.domain)) {
    return false;
  }

  if (filters.topic && !matchesText(capture.topic, filters.topic)) {
    return false;
  }

  if (filters.run_id && capture.run_id !== filters.run_id) {
    return false;
  }

  if (filters.runId && capture.run_id !== filters.runId) {
    return false;
  }

  if (filters.session_id && capture.session_id !== filters.session_id) {
    return false;
  }

  if (filters.sessionId && capture.session_id !== filters.sessionId) {
    return false;
  }

  if (filters.answer_id && capture.answer_id !== filters.answer_id) {
    return false;
  }

  if (filters.answerId && capture.answer_id !== filters.answerId) {
    return false;
  }

  const capturedAt = Date.parse(capture.captured_at);

  if (filters.after && capturedAt < Date.parse(filters.after)) {
    return false;
  }

  if (filters.before && capturedAt > Date.parse(filters.before)) {
    return false;
  }

  return true;
}

export function scoreCapture(capture, query) {
  const tokens = tokenize(query);

  if (!tokens.length) {
    return 1;
  }

  let score = 0;

  for (const token of tokens) {
    score += scoreField(capture.title, token, 8);
    score += scoreField(capture.query, token, 5);
    score += scoreField(capture.topic, token, 5);
    score += scoreField(`${capture.domain} ${capture.url}`, token, 3);
    score += scoreField(capture.text, token, 1);
  }

  const matchedTokens = tokens.filter((token) => containsToken(capture, token)).length;
  score += matchedTokens === tokens.length ? tokens.length * 2 : 0;

  return score;
}

export function makeHighlight(capture, query, radius = 120) {
  const tokens = tokenize(query);

  if (!tokens.length || !capture.text) {
    return "";
  }

  const text = capture.text;
  const lower = text.toLowerCase();
  const token = tokens.find((candidate) => lower.includes(candidate));

  if (!token) {
    return "";
  }

  const index = lower.indexOf(token);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + token.length + radius);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function compareBySearchResult(left, right) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return Date.parse(right.capture.captured_at) - Date.parse(left.capture.captured_at);
}

export function matchesRun(run, filters = {}) {
  if (filters.topic && !matchesText(run.topic, filters.topic)) {
    return false;
  }

  if (filters.query && !matchesText(run.query, filters.query)) {
    return false;
  }

  if (filters.session_id && run.session_id !== filters.session_id) {
    return false;
  }

  if (filters.sessionId && run.session_id !== filters.sessionId) {
    return false;
  }

  if (filters.answer_id && run.answer_id !== filters.answer_id) {
    return false;
  }

  if (filters.answerId && run.answer_id !== filters.answerId) {
    return false;
  }

  const startedAt = Date.parse(run.started_at);

  if (filters.after && startedAt < Date.parse(filters.after)) {
    return false;
  }

  if (filters.before && startedAt > Date.parse(filters.before)) {
    return false;
  }

  return true;
}

function matchesDomain(domain, filter) {
  const filters = Array.isArray(filter) ? filter : [filter];
  const normalizedDomain = String(domain ?? "").toLowerCase().replace(/^www\./, "");

  return filters.some((value) => {
    const normalizedFilter = String(value ?? "").toLowerCase().replace(/^www\./, "");
    return normalizedDomain === normalizedFilter || normalizedDomain.endsWith(`.${normalizedFilter}`);
  });
}

function matchesText(value, filter) {
  const filters = Array.isArray(filter) ? filter : [filter];
  const normalizedValue = normalizeWhitespace(value).toLowerCase();

  return filters.some((candidate) => normalizedValue.includes(normalizeWhitespace(candidate).toLowerCase()));
}

function scoreField(value, token, weight) {
  const lower = String(value ?? "").toLowerCase();

  if (!lower.includes(token)) {
    return 0;
  }

  const exact = new RegExp(`(^|[^a-z0-9._-])${escapeRegExp(token)}($|[^a-z0-9._-])`, "g");
  const matches = lower.match(exact)?.length ?? 0;
  return weight * Math.max(1, Math.min(matches, 12));
}

function containsToken(capture, token) {
  return [capture.title, capture.query, capture.topic, capture.domain, capture.url, capture.text]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(token));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
