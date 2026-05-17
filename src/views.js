import { tokenize } from "./search.js";

export function buildTopicView({ topic = "", captures = [], runs = [], limit = 25 } = {}) {
  const sortedCaptures = [...captures].sort((left, right) => Date.parse(right.captured_at) - Date.parse(left.captured_at));

  return {
    topic,
    capture_count: sortedCaptures.length,
    run_count: runs.length,
    first_captured_at: sortedCaptures.at(-1)?.captured_at ?? "",
    last_captured_at: sortedCaptures[0]?.captured_at ?? "",
    domains: groupDomains(sortedCaptures),
    timeline: groupTimeline(sortedCaptures),
    top_terms: topTerms(sortedCaptures),
    recent_captures: sortedCaptures.slice(0, limit),
    recent_runs: [...runs]
      .sort((left, right) => Date.parse(right.started_at) - Date.parse(left.started_at))
      .slice(0, limit),
  };
}

export function buildCaptureFeed({ captures = [], limit = 50 } = {}) {
  const sortedCaptures = [...captures].sort((left, right) => Date.parse(right.captured_at) - Date.parse(left.captured_at));

  return {
    capture_count: sortedCaptures.length,
    first_captured_at: sortedCaptures.at(-1)?.captured_at ?? "",
    last_captured_at: sortedCaptures[0]?.captured_at ?? "",
    total_text_length: sortedCaptures.reduce((total, capture) => total + (capture.text?.length ?? 0), 0),
    domains: groupDomains(sortedCaptures),
    tools: groupTools(sortedCaptures),
    timeline: groupTimeline(sortedCaptures),
    recent_captures: sortedCaptures.slice(0, limit),
  };
}

export function compareCaptureSets(leftCaptures = [], rightCaptures = []) {
  const leftByUrl = uniqueByCanonicalUrl(leftCaptures);
  const rightByUrl = uniqueByCanonicalUrl(rightCaptures);
  const added = [];
  const removed = [];
  const changed = [];
  const common = [];

  for (const [url, right] of rightByUrl) {
    const left = leftByUrl.get(url);

    if (!left) {
      added.push(right);
      continue;
    }

    common.push(right);

    if (left.content_hash !== right.content_hash) {
      changed.push({ before: left, after: right });
    }
  }

  for (const [url, left] of leftByUrl) {
    if (!rightByUrl.has(url)) {
      removed.push(left);
    }
  }

  return {
    added,
    removed,
    changed,
    common,
    summary: {
      added_count: added.length,
      removed_count: removed.length,
      changed_count: changed.length,
      common_count: common.length,
      domains_added: setDifference(domainsOf(added), domainsOf(leftCaptures)),
      domains_removed: setDifference(domainsOf(removed), domainsOf(rightCaptures)),
      terms_added: termDifference(rightCaptures, leftCaptures),
      terms_removed: termDifference(leftCaptures, rightCaptures),
    },
  };
}

function groupDomains(captures) {
  const domains = new Map();

  for (const capture of captures) {
    const entry = domains.get(capture.domain) ?? {
      domain: capture.domain,
      count: 0,
      last_captured_at: "",
      titles: [],
    };

    entry.count += 1;
    entry.last_captured_at = maxDate(entry.last_captured_at, capture.captured_at);

    if (capture.title && entry.titles.length < 3) {
      entry.titles.push(capture.title);
    }

    domains.set(capture.domain, entry);
  }

  return [...domains.values()].sort((left, right) => right.count - left.count);
}

function groupTools(captures) {
  const tools = new Map();

  for (const capture of captures) {
    const tool = capture.meta?.tool || capture.meta?.extraction_tool || "unknown";
    tools.set(tool, (tools.get(tool) ?? 0) + 1);
  }

  return [...tools.entries()]
    .map(([tool, count]) => ({ tool, count }))
    .sort((left, right) => right.count - left.count || String(left.tool).localeCompare(String(right.tool)));
}

function groupTimeline(captures) {
  const days = new Map();

  for (const capture of captures) {
    const date = capture.captured_at.slice(0, 10);
    const entry = days.get(date) ?? {
      date,
      capture_count: 0,
      run_ids: new Set(),
      domains: new Set(),
    };

    entry.capture_count += 1;

    if (capture.run_id) {
      entry.run_ids.add(capture.run_id);
    }

    if (capture.domain) {
      entry.domains.add(capture.domain);
    }

    days.set(date, entry);
  }

  return [...days.values()]
    .map((entry) => ({
      date: entry.date,
      capture_count: entry.capture_count,
      run_ids: [...entry.run_ids],
      domains: [...entry.domains],
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function topTerms(captures, limit = 20) {
  const weights = new Map();

  for (const capture of captures) {
    addWeightedTokens(weights, capture.query, 4);
    addWeightedTokens(weights, capture.topic, 4);
    addWeightedTokens(weights, capture.title, 3);
    addWeightedTokens(weights, capture.domain, 2);
    addWeightedTokens(weights, capture.text.slice(0, 2000), 1);
  }

  return [...weights.entries()]
    .map(([term, score]) => ({ term, score }))
    .sort((left, right) => right.score - left.score || left.term.localeCompare(right.term))
    .slice(0, limit);
}

function addWeightedTokens(weights, value, weight) {
  for (const token of tokenize(value)) {
    weights.set(token, (weights.get(token) ?? 0) + weight);
  }
}

function uniqueByCanonicalUrl(captures) {
  const entries = new Map();

  for (const capture of captures) {
    const key = capture.canonical_url || capture.url;
    const previous = entries.get(key);

    if (!previous || Date.parse(capture.captured_at) > Date.parse(previous.captured_at)) {
      entries.set(key, capture);
    }
  }

  return entries;
}

function domainsOf(captures) {
  return new Set(captures.map((capture) => capture.domain).filter(Boolean));
}

function setDifference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

function termDifference(leftCaptures, rightCaptures) {
  const left = new Set(topTerms(leftCaptures, 30).map((entry) => entry.term));
  const right = new Set(topTerms(rightCaptures, 30).map((entry) => entry.term));
  return setDifference(left, right).slice(0, 10);
}

function maxDate(left, right) {
  if (!left) {
    return right;
  }

  return Date.parse(left) > Date.parse(right) ? left : right;
}
