import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCoral } from "../src/index.js";

const dir = await mkdtemp(join(tmpdir(), "coral-demo-"));
const coral = createCoral({ dir, source: "searchagentsky-demo" });

try {
  const topic = "Trending Stocks";
  const query = "what are the top trending stocks today and why are they moving?";

  const firstRun = await coral.appendRun({
    id: "r_stocks_yesterday",
    query,
    topic,
    started_at: "2026-05-14T14:00:00Z",
    answer_id: "a_stocks_yesterday",
    result_url: "https://searchagentsky.com/r/demo-yesterday",
  });

  await coral.appendCaptures([
    {
      url: "https://finviz.com/screener.ashx?v=340&s=ta_topgainers",
      title: "Finviz Top Gainers",
      text: "Top gainers include NVDA +2.1%, AMD +1.4%, and MU -0.7%. AI chip demand remains the dominant market theme.",
      query,
      topic,
      run_id: firstRun.id,
      answer_id: firstRun.answer_id,
      captured_at: "2026-05-14T14:01:00Z",
      meta: { tool: "ddm", status: 200 },
    },
    {
      url: "https://finance.yahoo.com/quote/NVDA",
      title: "NVIDIA Stock Quote",
      text: "NVIDIA shares rose as investors continued buying AI infrastructure names.",
      query,
      topic,
      run_id: firstRun.id,
      answer_id: firstRun.answer_id,
      captured_at: "2026-05-14T14:03:00Z",
      meta: { tool: "ddm", status: 200 },
    },
  ]);

  const secondRun = await coral.appendRun({
    id: "r_stocks_today",
    query,
    topic,
    started_at: "2026-05-15T14:00:00Z",
    answer_id: "a_stocks_today",
    result_url: "https://searchagentsky.com/r/demo-today",
  });

  await coral.appendCaptures([
    {
      url: "https://finviz.com/screener.ashx?v=340&s=ta_topgainers&utm_source=demo",
      title: "Finviz Top Gainers",
      text: "Top gainers include NVDA +4.4%, Cerebras +68.1%, POET +43.1%, and ONDS +26.5%. AI chip demand and IPO momentum dominate.",
      query,
      topic,
      run_id: secondRun.id,
      answer_id: secondRun.answer_id,
      captured_at: "2026-05-15T14:01:00Z",
      meta: { tool: "ddm", status: 200 },
    },
    {
      url: "https://finance.yahoo.com/quote/NVDA",
      title: "NVIDIA Stock Quote",
      text: "NVIDIA shares rose more than 4% as AI infrastructure demand accelerated.",
      query,
      topic,
      run_id: secondRun.id,
      answer_id: secondRun.answer_id,
      captured_at: "2026-05-15T14:03:00Z",
      meta: { tool: "ddm", status: 200 },
    },
    {
      url: "https://www.nasdaq.com/market-activity/stocks/cbrs",
      title: "Cerebras Market Activity",
      text: "Cerebras surged after its Nasdaq listing drew investor attention to AI chip alternatives.",
      query,
      topic,
      run_id: secondRun.id,
      answer_id: secondRun.answer_id,
      captured_at: "2026-05-15T14:05:00Z",
      meta: { tool: "ddm", status: 200 },
    },
  ]);

  const priorResearch = await coral.search("AI chip stocks", { limit: 5 });
  const captureFeed = await coral.getCaptureFeed({ includeDuplicates: true });
  const topicView = await coral.getTopicView(topic);
  const diff = await coral.compareRuns(firstRun.id, secondRun.id);
  const rows = await coral.shape(priorResearch, {
    columns: ["ticker", "move", "reason", "source"],
    hint: "extract stock movers from captures",
    shaper: async ({ captures }) =>
      captures.flatMap((capture) => {
        if (capture.text.includes("Cerebras")) {
          return [{ ticker: "CBRS", move: "+68.1%", reason: "Nasdaq listing momentum", source: capture.url }];
        }

        if (capture.text.includes("NVDA") || capture.text.includes("NVIDIA")) {
          return [{ ticker: "NVDA", move: "+4.4%", reason: "AI infrastructure demand", source: capture.url }];
        }

        return [];
      }),
  });

  printSection("Coral demo: Search Agent Sky -> Coral");
  printJson({ store: dir, runs_saved: 2, captures_saved: 5 });

  printSection("Answer page card");
  printJson({
    label: "Saved 3 page captures to Coral",
    actions: ["Inspect page captures", "Search saved pages", "Shape later"],
    write_path: "normalize + hash + append one JSON line; no LLM, embeddings, or corpus scan",
  });

  printSection("Prior research before answering");
  printJson(
    priorResearch.map((result) => ({
      score: result.score,
      title: result.capture.title,
      domain: result.capture.domain,
      captured_at: result.capture.captured_at,
      highlight: result.highlight,
    })),
  );

  printSection("Page capture feed");
  printJson({
    capture_count: captureFeed.capture_count,
    total_text_length: captureFeed.total_text_length,
    timeline: captureFeed.timeline,
    domains: captureFeed.domains.map(({ domain, count }) => ({ domain, count })),
    tools: captureFeed.tools,
    recent_captures: captureFeed.recent_captures.map(({ title, url, captured_at }) => ({ title, url, captured_at })),
  });

  printSection("Topic visualization data (read-time view)");
  printJson({
    topic: topicView.topic,
    capture_count: topicView.capture_count,
    run_count: topicView.run_count,
    timeline: topicView.timeline,
    domains: topicView.domains.map(({ domain, count }) => ({ domain, count })),
    top_terms: topicView.top_terms.slice(0, 8),
  });

  printSection("What changed since previous run");
  printJson({
    summary: diff.summary,
    added_sources: diff.added.map((capture) => capture.url),
    changed_sources: diff.changed.map(({ after }) => after.url),
  });

  printSection("Turn into table");
  printJson(rows);
} finally {
  await rm(dir, { recursive: true, force: true });
}

function printSection(title) {
  console.log(`\n## ${title}`);
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}
