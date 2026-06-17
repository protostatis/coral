import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { buildCoralGraph, buildCoralReefModel, canonicalizeUrl, createCoral, renderCoralDashboardDocument, renderCoralDocument, renderCoralExplorerDocument, renderCoralReefDocument } from "../src/index.js";

let dir;
let coral;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "coral-test-"));
  coral = createCoral({ dir, clock: () => new Date("2026-05-15T12:00:00Z") });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("coral", () => {
  it("appends normalized captures", async () => {
    const capture = await coral.appendCapture({
      url: "https://Example.com/pricing?utm_source=x&b=2&a=1#frag",
      title: "Example Pricing",
      text: "Pro plan: $29/mo",
      query: "SaaS pricing comparison",
      run_id: "r_1",
    });

    assert.equal(capture.domain, "example.com");
    assert.equal(capture.canonical_url, "https://example.com/pricing?a=1&b=2");
    assert.equal(capture.meta.text_length, 16);
    assert.equal(capture.captured_at, "2026-05-15T12:00:00.000Z");
  });

  it("does not scan existing captures for duplicates by default", async () => {
    const first = await coral.appendCapture({
      url: "https://example.com/a",
      title: "A",
      text: "same text",
      query: "alpha",
    });
    const second = await coral.appendCapture({
      url: "https://example.com/a#section",
      title: "A",
      text: "same text",
      query: "alpha",
    });

    assert.equal(first.duplicate_of, "");
    assert.equal(second.duplicate_of, "");

    const stats = await coral.stats();
    assert.equal(stats.capture_count, 2);
    assert.equal(stats.duplicate_capture_count, 0);
  });

  it("can mark duplicate captures when explicitly enabled", async () => {
    const dedupingCoral = createCoral({ dir, dedupe: true, clock: () => new Date("2026-05-15T12:00:00Z") });
    const first = await dedupingCoral.appendCapture({
      url: "https://example.com/a",
      title: "A",
      text: "same text",
      query: "alpha",
    });
    const second = await dedupingCoral.appendCapture({
      url: "https://example.com/a#section",
      title: "A",
      text: "same text",
      query: "alpha",
    });

    assert.equal(second.duplicate_of, first.id);

    const stats = await dedupingCoral.stats();
    assert.equal(stats.capture_count, 2);
    assert.equal(stats.duplicate_capture_count, 1);
  });

  it("searches by topic text and filters domain", async () => {
    await coral.appendCapture({
      url: "https://finviz.com/screener.ashx?v=340&s=ta_topgainers",
      title: "Top Gainers",
      text: "NVDA and AMD are moving on AI chip demand.",
      query: "top trending stocks today",
      topic: "Trending Stocks",
      captured_at: "2026-05-15T10:00:00Z",
    });
    await coral.appendCapture({
      url: "https://coinmarketcap.com/trending-cryptocurrencies/",
      title: "Trending Crypto",
      text: "Bitcoin and Ethereum are moving.",
      query: "top trending crypto today",
      topic: "Trending Crypto",
      captured_at: "2026-05-15T11:00:00Z",
    });

    const results = await coral.search("AI chip stocks", { domain: "finviz.com" });

    assert.equal(results.length, 1);
    assert.equal(results[0].capture.domain, "finviz.com");
    assert.match(results[0].highlight, /AI chip demand/);
  });

  it("builds topic views for visualization UI", async () => {
    await coral.appendRun({ id: "r_a", query: "top trending stocks", topic: "Trending Stocks" });
    await coral.appendCapture({
      url: "https://finviz.com",
      title: "Finviz",
      text: "NVDA AMD market movers",
      query: "top trending stocks",
      topic: "Trending Stocks",
      run_id: "r_a",
    });
    await coral.appendCapture({
      url: "https://finance.yahoo.com/quote/NVDA",
      title: "NVDA",
      text: "NVIDIA stock rises",
      query: "top trending stocks",
      topic: "Trending Stocks",
      run_id: "r_a",
    });

    const view = await coral.getTopicView("Trending Stocks");

    assert.equal(view.capture_count, 2);
    assert.equal(view.run_count, 1);
    assert.deepEqual(view.timeline.map((entry) => entry.date), ["2026-05-15"]);
    assert.deepEqual(view.domains.map((entry) => entry.domain).sort(), ["finance.yahoo.com", "finviz.com"]);
  });

  it("builds capture feeds as the primary page-level view", async () => {
    await coral.appendCapture({
      url: "https://example.com/a",
      title: "A",
      text: "first extracted page",
      query: "alpha",
      captured_at: "2026-05-14T10:00:00Z",
      meta: { tool: "ddm" },
    });
    await coral.appendCapture({
      url: "https://example.com/b",
      title: "B",
      text: "second extracted page",
      query: "alpha",
      captured_at: "2026-05-15T10:00:00Z",
      meta: { tool: "intel_extract" },
    });

    const feed = await coral.getCaptureFeed({ query: "extracted", includeDuplicates: true });

    assert.equal(feed.capture_count, 2);
    assert.equal(feed.total_text_length, 41);
    assert.deepEqual(feed.timeline.map((entry) => entry.date), ["2026-05-14", "2026-05-15"]);
    assert.deepEqual(feed.tools.map((entry) => entry.tool).sort(), ["ddm", "intel_extract"]);
    assert.equal(feed.recent_captures[0].title, "B");
  });

  it("builds read-time graph views for the explorer", async () => {
    const capture = await coral.appendCapture({
      url: "https://example.com/a",
      title: "Alpha Reef",
      text: "Coral memory stores raw evidence as page captures.",
      query: "coral memory",
      captured_at: "2026-05-15T10:00:00Z",
      meta: { tool: "ddm" },
    });

    const graph = await coral.getGraph({ includeDuplicates: true });

    assert.equal(graph.stats.capture_count, 1);
    assert.ok(graph.nodes.some((node) => node.id === `capture:${capture.id}`));
    assert.ok(graph.nodes.some((node) => node.id === "domain:example.com"));
    assert.ok(graph.edges.some((edge) => edge.type === "domain"));
  });

  it("builds read-time reef colonies from raw captures", async () => {
    await coral.appendCapture({
      url: "https://finviz.com/screener.ashx?v=340&s=ta_topgainers",
      title: "Top Gainers",
      text: "NVDA and AMD stocks are moving on AI chip demand.",
      query: "top trending stocks today",
      topic: "Trending Stocks",
      captured_at: "2026-05-15T10:00:00Z",
      meta: { tool: "ddm" },
    });
    await coral.appendCapture({
      url: "https://reuters.com/technology/example",
      title: "AI chip headline",
      text: "A news report about chip infrastructure demand.",
      query: "ai chip news",
      topic: "AI infrastructure news",
      captured_at: "2026-05-15T11:00:00Z",
      meta: { tool: "get_text" },
    });

    const reef = await coral.getReef({ includeDuplicates: true });

    assert.equal(reef.source, "read-time-coral-reef-model");
    assert.equal(reef.stats.capture_count, 2);
    assert.ok(reef.colonies.some((colony) => colony.id === "stocks" && colony.morphology === "branching"));
    assert.ok(reef.colonies.some((colony) => colony.id === "news" && colony.morphology === "fan"));
    assert.ok(reef.colonies.every((colony) => colony.recent_captures.every((capture) => !Object.hasOwn(capture, "text"))));
    assert.ok(reef.colonies.every((colony) => colony.capture_glyphs.every((glyph) => !Object.hasOwn(glyph, "text"))));
    assert.ok(reef.colonies.some((colony) => colony.capture_glyphs.some((glyph) => glyph.text_length > 0 && glyph.recency_score >= 0)));
    assert.ok(reef.colonies.some((colony) => colony.source_bands.length > 0));
  });

  it("can build fallback reef colonies without write-time classification", () => {
    const reef = buildCoralReefModel({
      captures: [
        {
          id: "c_custom",
          url: "https://example.com/human-problem",
          canonical_url: "https://example.com/human-problem",
          domain: "example.com",
          title: "A human problem people keep researching",
          text: "People repeatedly compare practical tradeoffs before deciding.",
          query: "how people compare practical tradeoffs",
          topic: "Human research trails",
          captured_at: "2026-05-15T10:00:00Z",
          run_id: "",
          session_id: "",
          answer_id: "",
          source: "test",
          content_hash: "h",
          text_hash: "t",
          duplicate_of: "",
          meta: {},
        },
      ],
    });

    assert.equal(reef.stats.colony_count, 1);
    assert.match(reef.ethos, /Human-driven artifacts/);
    assert.equal(reef.colonies[0].captures, 1);
  });

  it("does not over-group entity research into broad fixed colonies", () => {
    const topic = "What is the latest news on Cristiano Ronaldo? — start with https://www.sportsmole.co.uk/football/portugal/world-cup-2026/feature/fading-ronaldos-tournament-drought-meets-desabres-immovable-drc-wall_599352.html and browse beyond it.";
    const captures = [
      {
        id: "ronaldo_1",
        url: "https://www.sportsmole.co.uk/football/portugal/world-cup-2026/preview/portugal-vs-congo-dr-prediction-team-news-lineups_599353.html",
        canonical_url: "https://www.sportsmole.co.uk/football/portugal/world-cup-2026/preview/portugal-vs-congo-dr-prediction-team-news-lineups_599353.html",
        domain: "sportsmole.co.uk",
        title: "Cristiano Ronaldo tournament drought meets DR Congo wall",
        text: "This article mentions comments, posts, market reactions, documentation, reports, and threads, but those page words should not decide the colony.",
        query: topic,
        topic,
        captured_at: "2026-06-17T00:43:24Z",
        meta: { tool: "navigate" },
      },
      {
        id: "ronaldo_2",
        url: "https://www.sportsmole.co.uk/football/portugal/world-cup-2026/feature/fading-ronaldos-tournament-drought-meets-desabres-immovable-drc-wall_599352.html",
        canonical_url: "https://www.sportsmole.co.uk/football/portugal/world-cup-2026/feature/fading-ronaldos-tournament-drought-meets-desabres-immovable-drc-wall_599352.html",
        domain: "sportsmole.co.uk",
        title: "Portugal latest squad context for Cristiano Ronaldo",
        text: "A page can contain social comments, stock-market words, wiki references, and news boilerplate without becoming those broad categories.",
        query: topic,
        topic,
        captured_at: "2026-06-17T00:43:20Z",
        meta: { tool: "navigate" },
      },
      {
        id: "news_1",
        url: "https://www.reuters.com/world/example",
        canonical_url: "https://www.reuters.com/world/example",
        domain: "reuters.com",
        title: "Breaking news headlines from Reuters",
        text: "A trusted news domain should still classify as News.",
        query: "summarize today's top news headlines from multiple sources",
        topic: "summarize today's top news headlines from multiple sources",
        captured_at: "2026-06-17T00:44:00Z",
        meta: { tool: "ddm" },
      },
    ];

    const reef = buildCoralReefModel({ captures });
    const ronaldo = reef.colonies.find((colony) => colony.id.includes("cristiano-ronaldo"));
    const news = reef.colonies.find((colony) => colony.id === "news");

    assert.ok(ronaldo);
    assert.equal(ronaldo.captures, 2);
    assert.equal(news.captures, 1);
    assert.ok(!["news", "social", "stocks", "docs"].includes(ronaldo.id));
    assert.ok(!ronaldo.tags.includes("start"));
    assert.ok(!ronaldo.tags.includes("browse"));
    assert.ok(!ronaldo.tags.includes("beyond"));
    assert.ok(!ronaldo.tags.some((tag) => tag.includes(".")));
  });

  it("compares runs by canonical URL and content hash", async () => {
    await coral.appendCapture({
      url: "https://example.com/a",
      title: "A",
      text: "old",
      query: "q",
      run_id: "r_old",
      captured_at: "2026-05-14T00:00:00Z",
    });
    await coral.appendCapture({
      url: "https://example.com/a",
      title: "A",
      text: "new",
      query: "q",
      run_id: "r_new",
      captured_at: "2026-05-15T00:00:00Z",
    });
    await coral.appendCapture({
      url: "https://example.com/b",
      title: "B",
      text: "new page",
      query: "q",
      run_id: "r_new",
      captured_at: "2026-05-15T00:00:00Z",
    });

    const diff = await coral.compareRuns("r_old", "r_new");

    assert.equal(diff.summary.added_count, 1);
    assert.equal(diff.summary.changed_count, 1);
    assert.equal(diff.added[0].canonical_url, "https://example.com/b");
  });

  it("canonicalizes URLs", () => {
    assert.equal(
      canonicalizeUrl("https://WWW.Example.com:443/path?utm_campaign=x&z=2&a=1#top"),
      "https://www.example.com/path?a=1&z=2",
    );
  });

  it("renders the Coral WebGL reef shell by default", () => {
    const reef = buildCoralReefModel({
      captures: [
        {
          id: "c_webgl",
          url: "https://finviz.com/screener.ashx?v=340&s=ta_topgainers",
          canonical_url: "https://finviz.com/screener.ashx?s=ta_topgainers&v=340",
          domain: "finviz.com",
          title: "Finviz Top Gainers",
          text: "NVDA stock market movers and AI chip demand",
          query: "trending stocks",
          topic: "Stocks",
          captured_at: "2026-05-15T10:00:00Z",
          run_id: "r_1",
          session_id: "",
          answer_id: "",
          source: "test",
          content_hash: "h1",
          text_hash: "h2",
          duplicate_of: "",
          meta: { tool: "ddm" },
        },
      ],
    });
    const html = renderCoralDocument(reef, { title: "Coral WebGL", api: "/custom/coral/reef" });

    assert.match(html, /Coral WebGL/);
    assert.match(html, /id="reef-root"/);
    assert.match(html, /three@0\.160\.0/);
    assert.match(html, /"colonies":/);
    assert.match(html, /overflow-wrap: anywhere/);
    assert.match(html, /touch-action: pan-y/);
    assert.match(html, /padding-top: clamp\(420px, 68dvh, 680px\)/);
    assert.match(html, /body\.dna-lens \.hud/);
    assert.match(html, /Colony DNA · tap a card for evidence/);
    assert.match(html, /scroll-margin-top: 14px/);
    assert.match(html, /\.dna-list \{\n\s+display: grid;/);
    assert.match(html, /scrollMobileIntoView/);
    assert.match(html, /scrollMobileIntoView\(dnaList\)/);
    assert.match(html, /syncMobileCanvasTouchAction/);
    assert.match(html, /\.inspector\.is-collapsed \{ display: none; \}/);
    assert.match(html, /\.pin-button\[aria-pressed="false"\] \{ display: none; \}/);
    assert.match(html, /@media \(max-width: 420px\)/);
    assert.match(html, /params\.get\('api'\) \|\| "\/custom\/coral\/reef"/);
  });

  it("renders the Coral reef document export", () => {
    const html = renderCoralReefDocument({ api: "/api/coral/reef" });

    assert.match(html, /Evidence reef with colony DNA/);
    assert.match(html, /id="coral-reef-data" type="application\/json"><\/script>/);
    assert.match(html, /params\.get\('api'\) \|\| "\/api\/coral\/reef"/);
  });

  it("renders the legacy Coral dashboard shell", () => {
    const html = renderCoralDashboardDocument({
      title: "Coral UI",
      topic: "Trending Stocks",
      topicView: {
        topic: "Trending Stocks",
        capture_count: 1,
        run_count: 1,
        domains: [{ domain: "finviz.com", count: 1 }],
        timeline: [{ date: "2026-05-15", capture_count: 1, run_ids: ["r_1"], domains: ["finviz.com"] }],
        top_terms: [{ term: "nvda", score: 12 }],
        recent_captures: [],
        recent_runs: [],
      },
      captureFeed: {
        capture_count: 1,
        total_text_length: 12,
        tools: [{ tool: "ddm", count: 1 }],
        recent_captures: [],
      },
      rows: [{ ticker: "NVDA", move: "+4.4%" }],
      explorerHref: "/coral/explorer",
    });

    assert.match(html, /Coral UI/);
    assert.match(html, /data-coral-ui/);
    assert.match(html, /data-coral-jump="captures"/);
    assert.match(html, /Open node explorer/);
    assert.match(html, /page captures/);
    assert.match(html, /Trending Stocks/);
    assert.match(html, /NVDA/);
  });

  it("renders the Coral graph explorer shell", () => {
    const graph = buildCoralGraph({
      captures: [
        {
          id: "c_1",
          url: "https://example.com/a",
          canonical_url: "https://example.com/a",
          domain: "example.com",
          title: "Example Capture",
          text: "raw evidence text",
          query: "example query",
          topic: "Example",
          captured_at: "2026-05-15T10:00:00Z",
          run_id: "r_1",
          session_id: "",
          answer_id: "",
          source: "test",
          content_hash: "h1",
          text_hash: "h2",
          duplicate_of: "",
          meta: { tool: "ddm" },
        },
      ],
    });
    const html = renderCoralExplorerDocument({ graph, backHref: "/coral" });

    assert.match(html, /data-coral-explorer/);
    assert.match(html, /coral-graph-data/);
    assert.match(html, /Example Capture/);
    assert.match(html, /Find saved evidence/);
    assert.match(html, /source site reef base/);
  });
});
