import { tokenize } from "./search.js";

const FIXED_COLONIES = [
  {
    id: "stocks",
    label: "Stocks reef head",
    content: "Stocks",
    dna: "branching acropora",
    morphology: "branching",
    color: "#d58b58",
    swatch: "linear-gradient(135deg, #f7e5c7, #d58b58 48%, #6b3c28)",
    position: [-2.8, -0.42, 0.35],
    tags: ["stock", "stocks", "market", "ticker", "finance", "equity", "shares", "nasdaq", "nyse", "earnings"],
    domains: ["finance.yahoo.com", "finviz.com", "nasdaq.com", "marketwatch.com", "sec.gov"],
    copy: "Market artifacts co-grow as branching evidence: ticker pages, movers, filings, and market commentary bud from nearby stalks.",
    similarity: "Ticker, sector, and market-query overlap create neighboring branch clusters at read time.",
    recency: "Fresh market captures become pale growth tips; older evidence thickens the darker skeleton.",
    inspection: "Dive close to inspect recent captures, source domains, and query trails on branch tips.",
  },
  {
    id: "news",
    label: "News fan colony",
    content: "News",
    dna: "soft gorgonian fan",
    morphology: "fan",
    color: "#ff8d79",
    swatch: "linear-gradient(135deg, #ffd27c, #ff8d79 48%, #9b3e6d)",
    position: [0.18, -0.34, -0.08],
    tags: ["news", "article", "press", "headline", "publisher", "report", "journal", "breaking"],
    domains: ["reuters.com", "apnews.com", "bloomberg.com", "cnbc.com", "cnn.com", "nytimes.com", "wsj.com"],
    copy: "News artifacts spread like a fan in current: headlines, publisher trails, and story updates gather into ribs.",
    similarity: "Shared stories, domains, and query language become ribs in the same fan instead of visible graph edges.",
    recency: "Current stories glow along the outer rim where human attention is still moving.",
    inspection: "Dive close to unfold headline captures, timestamps, and source provenance.",
  },
  {
    id: "docs",
    label: "Docs plate shelf",
    content: "Docs",
    dna: "layered plate coral",
    morphology: "plate",
    color: "#f2d9a7",
    swatch: "linear-gradient(135deg, #fff0c8, #d2a967 48%, #886a63)",
    position: [2.64, -0.48, 0.22],
    tags: ["docs", "documentation", "guide", "reference", "manual", "wiki", "api", "tutorial"],
    domains: ["docs.github.com", "developer.mozilla.org", "wikipedia.org", "github.com", "npmjs.com"],
    copy: "Reference artifacts settle into stable shelves: docs, guides, APIs, and wiki pages layer into durable strata.",
    similarity: "Related references accrete as adjacent plates based on query, title, topic, and domain overlap.",
    recency: "New references form light rim growth on top of older shelves.",
    inspection: "Dive close to see page titles, canonical URLs, and source coverage along plate rims.",
  },
  {
    id: "filings",
    label: "Filings brain coral",
    content: "Filings",
    dna: "boulder brain coral",
    morphology: "brain",
    color: "#b798ff",
    swatch: "linear-gradient(135deg, #e6d9ff, #b798ff 48%, #4b3159)",
    position: [-0.88, -0.62, 1.28],
    tags: ["filing", "filings", "sec", "10-k", "10-q", "annual", "quarterly", "regulatory", "prospectus"],
    domains: ["sec.gov", "investor", "annualreports.com"],
    copy: "Regulatory artifacts become slow dense mass: filings, reports, issuer pages, and revisions carve durable grooves.",
    similarity: "Issuer, period, filing type, and source domain carve nearby grooves into the same colony.",
    recency: "New filings brighten a ridge without changing the whole colony quickly.",
    inspection: "Dive close to inspect filing sequences, dates, and source trails.",
  },
  {
    id: "social",
    label: "Social anemone patch",
    content: "Social",
    dna: "anemone polyp field",
    morphology: "anemone",
    color: "#b4f06d",
    swatch: "linear-gradient(135deg, #dfff9b, #76e6a5 48%, #236b55)",
    position: [1.3, -0.76, 1.56],
    tags: ["social", "reddit", "post", "thread", "comment", "forum", "discussion", "hn", "hackernews"],
    domains: ["reddit.com", "news.ycombinator.com", "x.com", "twitter.com", "stackoverflow.com"],
    copy: "Social artifacts pulse as local swarms: threads, comments, posts, and repeated claims form noisy polyp fields.",
    similarity: "Repeated questions and claims become neighboring tentacles; outliers stay near the patch edge.",
    recency: "Recent discussion pulses with warmer light and more motion.",
    inspection: "Dive close to inspect threads, authorship context if captured, timestamps, and URLs.",
  },
];

const FALLBACK_MORPHOLOGIES = ["branching", "fan", "plate", "brain", "anemone"];

export function buildCoralReefModel(input = {}) {
  const captures = [...(input.captures ?? [])]
    .sort((left, right) => Date.parse(right.captured_at) - Date.parse(left.captured_at))
    .slice(0, input.limit ?? 500);
  const buckets = new Map();

  for (const capture of captures) {
    const definition = classifyCapture(capture) ?? fallbackDefinition(capture);
    const bucket = buckets.get(definition.id) ?? { definition, captures: [] };
    bucket.captures.push(capture);
    buckets.set(definition.id, bucket);
  }

  const sortedBuckets = [...buckets.values()]
    .sort((left, right) => right.captures.length - left.captures.length || left.definition.label.localeCompare(right.definition.label))
    .slice(0, input.colonyLimit ?? 8);

  const colonies = sortedBuckets.map((bucket, index) => buildColony(bucket.definition, bucket.captures, index));

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    query: input.query ?? "",
    ethos: "Human-driven artifacts co-grow into colonies so real interests and problems stay visible amid generated noise.",
    source: "read-time-coral-reef-model",
    stats: {
      capture_count: captures.length,
      source_count: uniqueCount(captures.map((capture) => capture.domain).filter(Boolean)),
      run_count: uniqueCount(captures.map((capture) => capture.run_id).filter(Boolean)),
      answer_count: uniqueCount(captures.map((capture) => capture.answer_id).filter(Boolean)),
      colony_count: colonies.length,
    },
    colonies,
  };
}

function classifyCapture(capture) {
  const haystack = captureHaystack(capture);
  const tokenSet = new Set(tokenize(haystack));
  let winner = null;
  let winnerScore = 0;

  for (const definition of FIXED_COLONIES) {
    let score = 0;

    for (const tag of definition.tags) {
      if (matchesTag(haystack, tokenSet, tag)) score += 2;
    }

    for (const domain of definition.domains) {
      if (matchesDomain(capture.domain, domain)) score += 5;
    }

    if (score > winnerScore) {
      winner = definition;
      winnerScore = score;
    }
  }

  return winnerScore > 0 ? winner : null;
}

function matchesTag(haystack, tokenSet, tag) {
  const normalized = String(tag ?? "").toLowerCase();
  if (!normalized) return false;
  if (/^[a-z0-9._-]+$/.test(normalized)) return tokenSet.has(normalized);
  return haystack.includes(normalized);
}

function matchesDomain(domain, expected) {
  const actual = String(domain ?? "").toLowerCase().replace(/^www\./, "");
  const normalizedExpected = String(expected ?? "").toLowerCase().replace(/^www\./, "");
  return actual === normalizedExpected || actual.endsWith(`.${normalizedExpected}`);
}

function fallbackDefinition(capture) {
  const key = capture.topic || capture.query || capture.domain || "human interest";
  const id = `interest-${slug(key) || "general"}`;
  const morphology = FALLBACK_MORPHOLOGIES[hash(id) % FALLBACK_MORPHOLOGIES.length];
  const content = titleize(key).slice(0, 34) || "Human Interest";

  return {
    id,
    label: `${content} colony`,
    content,
    dna: dnaForMorphology(morphology),
    morphology,
    color: colorForMorphology(morphology),
    swatch: swatchForMorphology(morphology),
    tags: tokenize(key),
    domains: [],
    copy: "These artifacts did not match a fixed content family, so Coral groups them by the human query, topic, or source domain that produced them.",
    similarity: "Read-time query, topic, title, and domain overlap decide which artifacts grow together.",
    recency: "Recent artifacts become brighter growth while older captures become substrate.",
    inspection: "Dive close to inspect the raw page captures, not a precomputed schema.",
  };
}

function buildColony(definition, captures, index) {
  const sorted = [...captures].sort((left, right) => Date.parse(right.captured_at) - Date.parse(left.captured_at));
  const terms = topTerms(sorted, 10);
  const domains = groupBy(sorted, (capture) => capture.domain || "unknown", "domain", 5);
  const tools = groupBy(sorted, (capture) => capture.meta?.tool || capture.meta?.extraction_tool || "capture", "tool", 5);
  const topics = groupBy(sorted, (capture) => capture.topic || capture.query || "untitled interest", "topic", 5);
  const recentWindowStart = Date.now() - 1000 * 60 * 60 * 24 * 14;
  const recentCount = sorted.filter((capture) => Date.parse(capture.captured_at) >= recentWindowStart).length;

  return {
    id: definition.id,
    label: definition.label,
    content: definition.content,
    dna: definition.dna,
    morphology: definition.morphology,
    color: definition.color,
    swatch: definition.swatch,
    position: definition.position ?? positionForIndex(index),
    captures: sorted.length,
    sources: domains.length,
    growth: growthLabel(sorted.length, recentCount, definition.id),
    tags: [...new Set([...(definition.tags ?? []), ...terms.map((entry) => entry.term)])].slice(0, 18),
    copy: definition.copy,
    similarity: definition.similarity,
    recency: definition.recency,
    inspection: definition.inspection,
    first_captured_at: sorted.at(-1)?.captured_at ?? "",
    last_captured_at: sorted[0]?.captured_at ?? "",
    recent_ratio: sorted.length ? recentCount / sorted.length : 0,
    top_domains: domains,
    top_terms: terms,
    tool_counts: tools,
    topic_samples: topics,
    source_bands: domains.map((entry, index) => ({
      domain: entry.domain,
      count: entry.count,
      weight: entry.count / sorted.length,
      seed: hash(`${definition.id}:domain:${entry.domain}:${index}`),
    })),
    timeline_bands: groupBy(sorted, (capture) => capture.captured_at.slice(0, 10), "date", 8).map((entry, index) => ({
      date: entry.date,
      count: entry.count,
      weight: entry.count / sorted.length,
      seed: hash(`${definition.id}:date:${entry.date}:${index}`),
    })),
    capture_glyphs: sorted.slice(0, 48).map((capture, index) => buildCaptureGlyph(definition, capture, index, sorted)),
    recent_captures: sorted.slice(0, 8).map((capture) => ({
      id: capture.id,
      title: capture.title || capture.domain || capture.url || "Untitled capture",
      url: capture.url,
      domain: capture.domain,
      captured_at: capture.captured_at,
      query: capture.query,
      topic: capture.topic,
      tool: capture.meta?.tool || capture.meta?.extraction_tool || "capture",
      text_preview: snippet(capture.text, 220),
    })),
  };
}

function buildCaptureGlyph(definition, capture, index, captures) {
  const capturedAt = Date.parse(capture.captured_at);
  const newest = Date.parse(captures[0]?.captured_at ?? capture.captured_at);
  const oldest = Date.parse(captures.at(-1)?.captured_at ?? capture.captured_at);
  const span = Math.max(1, newest - oldest);
  const recency = Number.isFinite(capturedAt) ? 1 - Math.max(0, Math.min(1, (newest - capturedAt) / span)) : 0;
  const seed = hash(`${definition.id}:${capture.id}:${index}`);
  const radius = 0.18 + ((seed >>> 3) % 1000) / 1000 * 0.82;
  const theta = ((seed >>> 13) % 1000) / 1000 * Math.PI * 2;

  return {
    id: capture.id,
    title: capture.title || capture.domain || capture.url || "Untitled capture",
    url: capture.url,
    domain: capture.domain,
    captured_at: capture.captured_at,
    query: capture.query,
    topic: capture.topic,
    tool: capture.meta?.tool || capture.meta?.extraction_tool || "capture",
    run_id: capture.run_id,
    answer_id: capture.answer_id,
    text_length: capture.text?.length ?? 0,
    duplicate_of: capture.duplicate_of,
    recency_score: Number(recency.toFixed(4)),
    seed,
    size: Number((0.028 + Math.min(0.055, Math.log10(Math.max(10, capture.text?.length ?? 10)) * 0.012)).toFixed(4)),
    position: [
      Number((Math.cos(theta) * radius).toFixed(4)),
      Number((0.12 + recency * 1.18 + (index % 7) * 0.018).toFixed(4)),
      Number((Math.sin(theta) * radius * 0.72).toFixed(4)),
    ],
  };
}

function captureHaystack(capture) {
  return [capture.title, capture.query, capture.topic, capture.domain, capture.url, capture.text?.slice(0, 4000)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function topTerms(captures, limit) {
  const scores = new Map();

  for (const capture of captures) {
    addTerms(scores, capture.topic, 5);
    addTerms(scores, capture.query, 4);
    addTerms(scores, capture.title, 3);
    addTerms(scores, capture.domain, 2);
    addTerms(scores, capture.text?.slice(0, 1600), 1);
  }

  return [...scores.entries()]
    .map(([term, score]) => ({ term, score }))
    .sort((left, right) => right.score - left.score || left.term.localeCompare(right.term))
    .slice(0, limit);
}

function addTerms(scores, value, weight) {
  for (const term of tokenize(value)) {
    if (term.length < 3 || term.includes("http")) continue;
    scores.set(term, (scores.get(term) ?? 0) + weight);
  }
}

function groupBy(captures, selector, keyName, limit) {
  const groups = new Map();

  for (const capture of captures) {
    const key = selector(capture);
    const entry = groups.get(key) ?? { [keyName]: key, count: 0, last_captured_at: "" };
    entry.count += 1;
    entry.last_captured_at = maxDate(entry.last_captured_at, capture.captured_at);
    groups.set(key, entry);
  }

  return [...groups.values()]
    .sort((left, right) => right.count - left.count || String(left[keyName]).localeCompare(String(right[keyName])))
    .slice(0, limit);
}

function growthLabel(total, recent, id) {
  if (!total) return "Dormant";
  if (recent / total > 0.5) return "Fresh";
  if (id === "filings") return "Slow";
  if (total > 60) return "Dense";
  if (total > 20) return "Growing";
  return "Sparse";
}

function positionForIndex(index) {
  const positions = [
    [-2.8, -0.42, 0.35],
    [0.18, -0.34, -0.08],
    [2.64, -0.48, 0.22],
    [-0.88, -0.62, 1.28],
    [1.3, -0.76, 1.56],
    [-3.5, -0.7, 1.85],
    [3.4, -0.72, 1.6],
    [0, -0.82, 2.2],
    [-4.15, -0.9, 0.45],
    [4.05, -0.92, 0.55],
    [-2.2, -0.96, 2.55],
    [2.24, -0.96, 2.52],
  ];
  return positions[index % positions.length];
}

function dnaForMorphology(morphology) {
  return {
    branching: "branching acropora",
    fan: "soft gorgonian fan",
    plate: "layered plate coral",
    brain: "boulder brain coral",
    anemone: "anemone polyp field",
  }[morphology] ?? "mixed reef colony";
}

function colorForMorphology(morphology) {
  return {
    branching: "#d58b58",
    fan: "#ff8d79",
    plate: "#f2d9a7",
    brain: "#b798ff",
    anemone: "#b4f06d",
  }[morphology] ?? "#52d9c9";
}

function swatchForMorphology(morphology) {
  return {
    branching: "linear-gradient(135deg, #f7e5c7, #d58b58 48%, #6b3c28)",
    fan: "linear-gradient(135deg, #ffd27c, #ff8d79 48%, #9b3e6d)",
    plate: "linear-gradient(135deg, #fff0c8, #d2a967 48%, #886a63)",
    brain: "linear-gradient(135deg, #e6d9ff, #b798ff 48%, #4b3159)",
    anemone: "linear-gradient(135deg, #dfff9b, #76e6a5 48%, #236b55)",
  }[morphology] ?? "linear-gradient(135deg, #bdf8ef, #52d9c9 48%, #176f69)";
}

function snippet(value, max) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function titleize(value) {
  return String(value ?? "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    result ^= String(value).charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function uniqueCount(values) {
  return new Set(values).size;
}

function maxDate(left, right) {
  if (!left) return right || "";
  if (!right) return left;
  return Date.parse(left) > Date.parse(right) ? left : right;
}
