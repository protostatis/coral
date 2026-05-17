# coral

A passive knowledge reef for [searchagentsky.com](https://searchagentsky.com). Every page the browser agent visits becomes a polyp. Over time, a massive reef of web knowledge accumulates — no schema, no semantic extraction, no LLM call at capture time.

Query the reef later to build DataFrames, find patterns, and power analytics.

## Ethos

Coral exists to preserve human-driven artifacts in a world where more information is generated, shaped, and amplified by AI systems, SEO algorithms, and engagement machinery.

The important signal is not just what content exists on the web. The important signal is what people actually cared enough to search for, inspect, compare, revisit, cite, and use while solving real problems. Coral captures those evidence trails as raw artifacts: pages visited, text extracted, sources checked, questions asked, and research paths followed.

Coral should make human interest visible again. Similar artifacts should co-grow into recognizable colonies, revealing shared needs, recurring questions, market curiosity, research pressure, and relatable problems. The reef is valuable because it is grounded in human attention and intent, not because an algorithm predicted what should be important.

The goal is synergy around people's interests: help humans find each other through the problems they are investigating, the evidence they trust, and the questions they keep returning to.

## Status

Coral is now implemented as a zero-dependency Node module for the first Search Agent Sky integration.

- Append-only JSONL page capture store.
- Search Agent Sky producer hook for the page text it already extracts.
- Full-text search with domain, date, topic, run, session, and answer filters.
- O(1) write path relative to corpus size: normalize, hash, append one line.
- Optional duplicate marking only when explicitly enabled because it scans existing captures.
- Capture feeds for page-level inspector UI.
- Topic views and run diffs as read-time conveniences.
- `shape()` adapter that delegates extraction to your existing LLM service.

## Install / Import

Inside Search Agent Sky, install this package from the repo or workspace and import it server-side:

```js
import { createCoral } from "@unchainedsky/coral";

const coral = createCoral({
  dir: process.env.CORAL_DIR ?? ".coral",
  source: "searchagentsky",
});
```

Coral writes two files by default:

```txt
.coral/captures.jsonl
.coral/runs.jsonl
```

No database or background service is required for the first integration.

## Search Agent Sky Integration

Append one capture after each browser page load or text extraction. This is the primary integration point:

```js
await coral.appendCapture({
  url: page.url,
  title: page.title,
  text: ddmText, // already produced by Search Agent Sky tooling
  query: userQuery,
  session_id: sessionId,
  answer_id: answerId,
  meta: {
    status: page.status,
    content_type: page.contentType,
    tool: "ddm",
  },
});
```

Runs are optional metadata for grouping captures back to an answer:

```js
const run = await coral.appendRun({
  query: userQuery,
  topic: inferredTopic ?? userQuery,
  session_id: sessionId,
  answer_id: answerId,
  result_url: `https://searchagentsky.com/r/${answerSlug}`,
});
```

Before generating a new answer, optionally retrieve prior research:

```js
const prior = await coral.search(userQuery, {
  limit: 8,
  after: "2026-01-01",
});
```

For the result page or Coral UI layer, request visualization-ready capture data:

```js
const feed = await coral.getCaptureFeed({ answer_id: answerId });
```

Topic data is available later, after enough page captures accumulate:

```js
const topic = await coral.getTopicView("Trending Stocks");
```

To power "what changed?" between two runs:

```js
const diff = await coral.compareRuns(previousRunId, currentRunId);
```

See `examples/searchagentsky-producer.js` for a small adapter module.

## How it works

```
CAPTURE (silent, automatic)                    QUERY (on demand)
                                               
searchagentsky.com agent                       notebook / agent
visits a page                                  asks a question
        │                                              │
        ▼                                              ▼
  append to reef                               search the reef
  (url, text, timestamp,                       (full-text, by domain,
   source_query, metadata)                      by date range, by query)
        │                                              │
        ▼                                              ▼
  coral.jsonl                                  list of captures
  (append-only, no schema)                     → LLM shapes into DataFrame
```

**Capture is context-free.** No LLM call, no schema, no semantic extraction. The agent doesn't know Coral exists. It just browses. Coral silently records page text that the browser tools already produced.

**Capture is basically free.** The default write path never searches old captures, builds embeddings, summarizes, classifies, refetches, renders, or extracts entities. It normalizes fields, computes cheap hashes, appends one JSON line, and returns.

**Query is context-rich.** The agent reviews stored captures, merges them with its current context, and shapes raw text into whatever the analysis needs.

## Why

A single search on searchagentsky.com gives you a text summary. That's not enough for analytics — you need rows. But rows require visiting many pages about the same topic.

Coral accumulates those pages over time. Run 10 searches about "EV company financials" over a month. Coral now has 150 page captures. Open the notebook:

```python
docs = await coral.search("EV company financials")
# 150 raw captures → LLM extracts structured rows
df = await coral.shape(docs, columns=["company", "revenue", "growth", "source"])
# Now you have a DataFrame for real analysis
```

## The reef metaphor

| Reef | Coral |
|---|---|
| Polyp attaches to surface | Page captured to store |
| No polyp plans the reef | No agent plans the schema |
| Reef grows from many tiny organisms | Knowledge grows from many page visits |
| Reef structure emerges over time | Queryable patterns emerge over time |
| Miners extract value from reef | Notebook extracts DataFrames from captures |

## Capture format

Every capture is one JSON line. No schema — just what the crawler naturally produces:

```json
{
  "id": "c_a1b2c3d4",
  "url": "https://example.com/pricing",
  "domain": "example.com",
  "title": "Example - Pricing",
  "text": "Pro plan: $29/mo. Team plan: $49/mo...",
  "query": "SaaS pricing comparison",
  "captured_at": "2026-04-18T21:30:00Z",
  "session_id": "s_xyz",
  "meta": {
    "status": 200,
    "content_type": "text/html",
    "text_length": 4230
  }
}
```

The implementation adds operational fields while preserving the same principle:

- `canonical_url`, `content_hash`, and `text_hash` for dedupe/diff.
- `duplicate_of` only when duplicate scanning is explicitly enabled or supplied by the caller.
- `run_id`, `session_id`, and `answer_id` to connect captures back to Search Agent Sky.
- `meta` for tool/status/content-type details.

That's it. No `columns`, no `entity_type`, no fixed extraction schema. The structure lives in the text. The LLM finds it at query time.

## Query patterns

### Simple: find captures by topic
```python
docs = await coral.search("GPU prices", limit=50)
# Returns list of capture dicts, ranked by relevance
```

### By domain
```python
docs = await coral.search(domain="amazon.com", limit=100)
```

### By time range
```python
docs = await coral.search("interest rates", after="2026-01-01", before="2026-04-01")
```

### Shape into DataFrame
```python
# LLM reads raw text from captures, extracts structured rows
df = await coral.shape(docs, hint="extract product name, price, and rating")
```

In the Node module, `shape()` accepts a callback so Search Agent Sky can use its existing model provider:

```js
const rows = await coral.shape(docs, {
  columns: ["ticker", "move", "reason", "source"],
  hint: "extract one row per stock mover",
  shaper: async ({ captures, columns, hint }) => callYourLlm({ captures, columns, hint }),
});
```

### Monitor changes
```python
# Same query over time — coral accumulates
old = await coral.search("NVDA competitors", before="2026-01-01")
new = await coral.search("NVDA competitors", after="2026-03-01")
# Compare what changed
```

## Architecture

```
searchagentsky.com ──write──▶ coral store ◀──read── analytics notebook
(browser agent)               (JSONL)                (pyreplab/WASM)
```

**Phase 1: JSONL file**
- Append-only file on disk
- Full-text search via grep/Python
- Good enough for thousands of captures

**Phase 2: SQLite**
- FTS5 full-text search index
- Domain/date indexes
- Still a single file, no server needed

**Phase 3: Graph layer (maybe)**
- Pages link to pages (href edges)
- Queries link to pages (found edges)
- Entities emerge from LLM extraction
- Only build this if the flat store isn't enough

## Integration points

### searchagentsky.com → coral (producer)
After every page visit, the MCP tools (ddm, intel_extract) already produce page text. Coral hooks into this — one `appendCapture()` call after each page load.

### analytics.unchainedsky.com → coral (consumer)
The pyreplab notebook gets `coral.search()` and `coral.shape()` helpers. Users search the reef from the notebook and build DataFrames.

### Agent context (future)
Before answering a question, the agent checks coral: "Have I seen pages about this before?" Uses past captures to give richer answers without re-crawling.

This is supported today with `coral.search(query, { limit })`; the product decision is when to inject prior captures into the answer prompt.

### Visualization layer
Coral now ships a framework-light UI layer for the first product demo and Search Agent Sky embed:

- `renderCoralDocument(model)` returns a complete standalone HTML page.
- `renderCoralDashboard(model)` returns an embeddable dashboard fragment.
- `coralUiCss()` returns the visual system CSS.
- `coralUiScript()` returns the tab interaction script.
- `buildCoralUiModel(input)` normalizes capture-feed/topic/diff/search/table data for rendering.

The UI direction is a page evidence cockpit: compact answer-page card, capture inspector, source coverage, capture timeline, prior research, optional run diff, and shaped table.

Generate the demo page:

```bash
npm run demo:ui
```

Then open `examples/coral-ui-demo.html` in a browser.

Standalone visual research artifacts live in `examples/`:

- `reef-renderer-deck.html` compares renderer directions against the same toy reef model.
- `reef-fidelity-spike.html` tests a Three.js colony-DNA reef wall where similar content grows together.

Search Agent Sky can embed the server-rendered fragment like this:

```js
import { renderCoralDashboard } from "@unchainedsky/coral";

const html = renderCoralDashboard({
  captureFeed: await coral.getCaptureFeed({ answer_id: answerId }),
  topicView: await coral.getTopicView(topic),
  diff: await coral.compareRuns(previousRunId, currentRunId),
  priorResearch: await coral.search(query, { limit: 6 }),
  rows,
});
```

The lower-level data APIs remain available for native React/Next components:

- `getCaptureFeed(filters)` returns page-level timeline, top domains, extraction tools, and recent captures.
- `getTopicView(topic)` returns topic-level timeline, top domains, top terms, recent runs, and recent captures.
- `compareRuns(oldRunId, newRunId)` returns added, removed, changed, and common captures.
- `stats()` returns global capture/run/domain/topic counts.

Search Agent Sky can use these to show:

- `Saved N page captures to Coral` on answer pages.
- `Inspect page captures` for every source the browser visited.
- `Compare with previous runs` for repeated queries.
- `Source coverage` by domain.
- `Topic timeline` for tracked research.
- `Turn into table` via `shape()`.

## Development

```bash
npm run demo
npm run demo:ui
npm test
npm run lint
```

`npm run demo` simulates two Search Agent Sky runs and prints the product surfaces Coral enables: page-capture card, prior research lookup, capture timeline/domain data, run diff, and table shaping.

`npm run demo:ui` writes a browser-ready visualization demo to `examples/coral-ui-demo.html`.

The package intentionally has no runtime dependencies. It targets Node 20+ and uses plain ESM JavaScript with TypeScript declarations.

## Design principles

1. **Capture everything, schema nothing.** The reef doesn't plan its shape. Structure emerges at query time.
2. **No agent at write time.** Capture is a dumb append. No LLM calls, no semantic extraction, no classification.
3. **Intelligence at read time.** The LLM in the notebook shapes raw captures into whatever the user needs.
4. **Append-only.** Never modify or delete captures. The reef only grows.
5. **Minimalistic.** JSONL file → SQLite if needed → graph if needed. Don't build what you don't need yet.
6. **Human artifacts first.** Coral preserves what people actually investigated so read-time views can surface real human interests and problems amid generated noise.
