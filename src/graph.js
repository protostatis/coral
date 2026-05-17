import { tokenize } from "./search.js";

export function buildCoralGraph(input = {}) {
  const captures = [...(input.captures ?? [])]
    .sort((left, right) => Date.parse(right.captured_at) - Date.parse(left.captured_at))
    .slice(0, input.limit ?? 500);
  const termLimit = input.termLimit ?? 28;
  const nodes = [];
  const edges = [];
  const domains = new Map();
  const termWeights = new Map();
  const termCaptures = new Map();
  let totalTextLength = 0;

  for (const capture of captures) {
    const domain = capture.domain || "unknown";
    const domainEntry = domains.get(domain) ?? {
      id: domainNodeId(domain),
      type: "domain",
      label: domain,
      domain,
      count: 0,
      text_length: 0,
      last_captured_at: "",
    };

    domainEntry.count += 1;
    domainEntry.text_length += capture.text?.length ?? 0;
    domainEntry.last_captured_at = maxDate(domainEntry.last_captured_at, capture.captured_at);
    domains.set(domain, domainEntry);
    totalTextLength += capture.text?.length ?? 0;

    addWeightedTerms(termWeights, termCaptures, capture, capture.title, 5);
    addWeightedTerms(termWeights, termCaptures, capture, capture.query, 4);
    addWeightedTerms(termWeights, termCaptures, capture, capture.topic, 4);
    addWeightedTerms(termWeights, termCaptures, capture, domain, 2);
    addWeightedTerms(termWeights, termCaptures, capture, capture.text?.slice(0, 1800), 1);

    nodes.push({
      id: captureNodeId(capture),
      type: "capture",
      label: capture.title || capture.domain || capture.url || "Untitled capture",
      capture_id: capture.id,
      url: capture.url,
      canonical_url: capture.canonical_url,
      domain,
      title: capture.title,
      query: capture.query,
      topic: capture.topic,
      captured_at: capture.captured_at,
      run_id: capture.run_id,
      session_id: capture.session_id,
      answer_id: capture.answer_id,
      tool: capture.meta?.tool || capture.meta?.extraction_tool || "capture",
      text_length: capture.text?.length ?? 0,
      text_preview: snippet(capture.text, 1300),
      content_hash: capture.content_hash,
      duplicate_of: capture.duplicate_of,
      size: captureSize(capture),
    });

    edges.push({
      id: `edge:${capture.id}:domain:${domain}`,
      source: captureNodeId(capture),
      target: domainNodeId(domain),
      type: "domain",
      weight: 0.74,
    });

    if (capture.duplicate_of) {
      edges.push({
        id: `edge:${capture.id}:duplicate:${capture.duplicate_of}`,
        source: captureNodeId(capture),
        target: `capture:${capture.duplicate_of}`,
        type: "duplicate",
        weight: 0.9,
      });
    }
  }

  const topTerms = [...termWeights.entries()]
    .map(([term, score]) => ({ term, score, captures: termCaptures.get(term) ?? new Set() }))
    .filter((entry) => entry.captures.size > 1)
    .sort((left, right) => right.score - left.score || left.term.localeCompare(right.term))
    .slice(0, termLimit);

  for (const domain of domains.values()) {
    nodes.unshift({
      ...domain,
      size: Math.min(58, 24 + Math.sqrt(domain.count) * 10),
    });
  }

  for (const entry of topTerms) {
    const id = termNodeId(entry.term);
    nodes.push({
      id,
      type: "term",
      label: entry.term,
      term: entry.term,
      count: entry.captures.size,
      score: entry.score,
      size: Math.min(26, 8 + Math.sqrt(entry.score)),
    });

    for (const captureId of [...entry.captures].slice(0, 36)) {
      edges.push({
        id: `edge:${captureId}:term:${entry.term}`,
        source: `capture:${captureId}`,
        target: id,
        type: "term",
        weight: 0.28,
      });
    }
  }

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    query: input.query ?? "",
    stats: {
      capture_count: captures.length,
      domain_count: domains.size,
      term_count: topTerms.length,
      node_count: nodes.length,
      edge_count: edges.length,
      total_text_length: totalTextLength,
    },
    nodes,
    edges: edges.filter((edge) => edge.source && edge.target),
  };
}

function addWeightedTerms(termWeights, termCaptures, capture, value, weight) {
  for (const term of tokenize(value)) {
    if (term.length < 3 || term.includes("http")) {
      continue;
    }

    termWeights.set(term, (termWeights.get(term) ?? 0) + weight);

    const captures = termCaptures.get(term) ?? new Set();
    captures.add(capture.id);
    termCaptures.set(term, captures);
  }
}

function captureNodeId(capture) {
  return `capture:${capture.id}`;
}

function domainNodeId(domain) {
  return `domain:${domain}`;
}

function termNodeId(term) {
  return `term:${term}`;
}

function captureSize(capture) {
  const textLength = capture.text?.length ?? 0;
  return Math.min(24, 7 + Math.log10(Math.max(10, textLength)) * 3.4);
}

function snippet(value, max = 500) {
  const text = String(value ?? "").trim().replace(/\s+\n/g, "\n");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function maxDate(left, right) {
  if (!left) return right || "";
  if (!right) return left;
  return Date.parse(left) > Date.parse(right) ? left : right;
}
