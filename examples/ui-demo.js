import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCoral, renderCoralDocument, renderCoralExplorerDocument } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "coral-ui-demo.html");
const explorerOutFile = join(here, "coral-explorer-demo.html");
const reefFidelityOutFile = join(here, "reef-fidelity-demo.html");
const demoDir = join(here, ".coral-ui-demo");
const coral = createCoral({ dir: demoDir, source: "searchagentsky-ui-demo" });

const topic = "Trending Stocks";
const query = "what are the top trending stocks today and why are they moving?";

await rm(demoDir, { recursive: true, force: true });
await seedDemoData();

const priorResearch = await coral.search("AI chip stocks", { limit: 6, includeDuplicates: true });
const captureFeed = await coral.getCaptureFeed({ includeDuplicates: true });
const topicView = await coral.getTopicView(topic, { includeDuplicates: true });
const graph = await coral.getGraph({ includeDuplicates: true, limit: 500 });
const reef = await coral.getReef({ includeDuplicates: true, limit: 500 });
const diff = await coral.compareRuns("r_stocks_yesterday", "r_stocks_today");
const rows = await coral.shape(priorResearch, {
  columns: ["ticker", "move", "reason", "source"],
  hint: "extract stock movers from captures",
  shaper: async ({ captures }) => dedupeRows(captures.flatMap(extractRows)),
});

await writeFile(
  outFile,
  renderCoralDocument({
    title: "Coral for Search Agent Sky",
    eyebrow: "Per-page capture layer",
    subtitle:
      "Each browser page extraction is appended as raw evidence first. Search, diff, visualization, and table shaping happen later on read.",
    topic,
    captureFeed,
    topicView,
    diff,
    priorResearch,
    rows,
    explorerHref: "./coral-explorer-demo.html",
  }),
  "utf8",
);

await writeFile(
  explorerOutFile,
  renderCoralExplorerDocument({
    title: "Coral Knowledge Explorer",
    eyebrow: "Evidence reef map",
    subtitle: "Source sites are reef bases. Saved pages grow as coral polyps. Topic signals stay hidden until you search or turn them on.",
    backHref: "./coral-ui-demo.html",
    backLabel: "Capture feed",
    graph,
  }),
  "utf8",
);

const reefTemplate = await readFile(join(here, "reef-fidelity-spike.html"), "utf8");
await writeFile(
  reefFidelityOutFile,
  reefTemplate.replace(
    '<script type="module">',
    `<script id="coral-reef-data" type="application/json">${escapeScriptJson(reef)}</script>\n  <script type="module">`,
  ),
  "utf8",
);

console.log(`Wrote ${outFile}`);
console.log(`Wrote ${explorerOutFile}`);
console.log(`Wrote ${reefFidelityOutFile}`);
console.log("Open that file in a browser to view the Coral UI demo.");

async function seedDemoData() {
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

  await coral.appendCaptures([
    {
      url: "https://www.reuters.com/technology/ai-chip-demand-markets-demo",
      title: "AI chip demand lifts semiconductor shares",
      text: "News coverage says AI chip demand is shaping market attention, with investors comparing GPU suppliers and infrastructure bottlenecks.",
      query: "latest ai chip market news",
      topic: "AI infrastructure news",
      run_id: secondRun.id,
      answer_id: secondRun.answer_id,
      captured_at: "2026-05-15T14:08:00Z",
      meta: { tool: "get_text", status: 200 },
    },
    {
      url: "https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners",
      title: "GitHub Actions hosted runner docs",
      text: "Documentation explains hosted runner machine types, limits, usage guidance, and reference details for CI workloads.",
      query: "github actions hosted runner documentation limits",
      topic: "Developer documentation",
      run_id: secondRun.id,
      answer_id: secondRun.answer_id,
      captured_at: "2026-05-15T14:11:00Z",
      meta: { tool: "ddm", status: 200 },
    },
    {
      url: "https://www.sec.gov/Archives/edgar/data/demo/10-k.htm",
      title: "Example annual report filing",
      text: "The annual report filing discusses risk factors, revenue concentration, capital expenditure, and regulatory disclosures.",
      query: "sec 10-k annual report ai infrastructure risk factors",
      topic: "SEC filings",
      run_id: secondRun.id,
      answer_id: secondRun.answer_id,
      captured_at: "2026-05-15T14:14:00Z",
      meta: { tool: "navigate", status: 200 },
    },
    {
      url: "https://www.reddit.com/r/investing/comments/demo_ai_chip_stocks/",
      title: "Investor thread about AI chip stocks",
      text: "A social discussion thread compares NVIDIA, AMD, Cerebras, valuation risk, and practical concerns from retail investors.",
      query: "reddit ai chip stocks investor discussion",
      topic: "Social investing discussion",
      run_id: secondRun.id,
      answer_id: secondRun.answer_id,
      captured_at: "2026-05-15T14:17:00Z",
      meta: { tool: "ddm", status: 200 },
    },
  ]);
}

function extractRows(capture) {
  const rows = [];

  if (capture.text.includes("Cerebras")) {
    rows.push({ ticker: "CBRS", move: "+68.1%", reason: "Nasdaq listing momentum", source: capture.domain });
  }

  if (capture.text.includes("NVDA") || capture.text.includes("NVIDIA")) {
    rows.push({ ticker: "NVDA", move: capture.text.includes("+4.4%") ? "+4.4%" : "+2.1%", reason: "AI infrastructure demand", source: capture.domain });
  }

  if (capture.text.includes("POET")) {
    rows.push({ ticker: "POET", move: "+43.1%", reason: "AI data-center optical interconnect momentum", source: capture.domain });
  }

  return rows;
}

function dedupeRows(rows) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = `${row.ticker}:${row.move}:${row.source}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
