# coral

A passive knowledge reef for [searchagentsky.com](https://searchagentsky.com). Every page the browser agent visits becomes a polyp. Over time, a massive reef of web knowledge accumulates — no schema, no extraction, no agent involvement at capture time.

Query the reef later to build DataFrames, find patterns, and power analytics.

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

**Capture is context-free.** No LLM call, no schema, no extraction. The agent doesn't know coral exists. It just browses. Coral silently records.

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

That's it. No `columns`, no `entity_type`, no `schema_version`. The structure lives in the text. The LLM finds it at query time.

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

## Design principles

1. **Capture everything, schema nothing.** The reef doesn't plan its shape. Structure emerges at query time.
2. **No agent at write time.** Capture is a dumb append. No LLM calls, no extraction, no classification.
3. **Intelligence at read time.** The LLM in the notebook shapes raw captures into whatever the user needs.
4. **Append-only.** Never modify or delete captures. The reef only grows.
5. **Minimalistic.** JSONL file → SQLite if needed → graph if needed. Don't build what you don't need yet.
