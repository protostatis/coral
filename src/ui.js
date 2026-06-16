import { renderCoralReefDocument } from "./webgl.js";

const DEFAULT_TITLE = "Coral Evidence Reef";

export function buildCoralUiModel(input = {}) {
  const topicView = input.topicView ?? {};
  const captureFeed = input.captureFeed ?? {};
  const diff = input.diff ?? emptyDiff();
  const priorResearch = input.priorResearch ?? [];
  const rows = input.rows ?? [];
  const stats = input.stats ?? {};
  const captures = input.captures ?? captureFeed.recent_captures ?? topicView.recent_captures ?? [];
  const domains = captureFeed.domains ?? topicView.domains ?? [];
  const tools = captureFeed.tools ?? [];
  const timeline = captureFeed.timeline ?? topicView.timeline ?? [];

  return {
    title: input.title ?? DEFAULT_TITLE,
    eyebrow: input.eyebrow ?? "Search Agent Sky passive memory",
    subtitle:
      input.subtitle ??
      "A page-level evidence reef: every browser extraction is appended as raw source text first, then mined later.",
    topic: input.topic ?? topicView.topic ?? "All page captures",
    actions: input.actions ?? ["Inspect raw captures", "Search the reef", "Shape later"],
    explorerHref: input.explorerHref ?? "",
    stats: {
      captures: input.captureCount ?? captureFeed.capture_count ?? topicView.capture_count ?? stats.capture_count ?? captures.length,
      runs: input.runCount ?? topicView.run_count ?? stats.run_count ?? 0,
      domains: input.domainCount ?? domains.length ?? stats.domains?.length ?? 0,
      tools: input.toolCount ?? tools.length ?? 0,
      changes: input.changeCount ?? diff.summary?.changed_count ?? 0,
      text: input.textLength ?? captureFeed.total_text_length ?? 0,
    },
    captureFeed: {
      ...captureFeed,
      timeline,
      domains,
      tools,
      recent_captures: captures,
    },
    topicView: {
      ...topicView,
      timeline: topicView.timeline ?? [],
      domains: topicView.domains ?? [],
      top_terms: topicView.top_terms ?? [],
      recent_captures: captures,
      recent_runs: topicView.recent_runs ?? [],
    },
    diff,
    priorResearch: priorResearch.map(normalizeSearchResult),
    rows,
  };
}

export function renderCoralDocument(input = {}, options = {}) {
  return renderCoralReefDocument(input, options);
}

export function renderCoralDashboardDocument(input = {}, options = {}) {
  const model = buildCoralUiModel(input);
  const title = escapeHtml(options.title ?? model.title);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${coralUiCss()}</style>
</head>
<body>
  ${renderCoralDashboard(model)}
  <script>${coralUiScript()}</script>
</body>
</html>
`;
}

export function renderCoralDashboard(input = {}) {
  const model = buildCoralUiModel(input);
  const timelineMax = Math.max(1, ...model.captureFeed.timeline.map((entry) => entry.capture_count));
  const domainMax = Math.max(1, ...model.captureFeed.domains.map((entry) => entry.count));
  const captures = model.captureFeed.recent_captures;
  const primaryCapture = captures[0];
  const actionTargets = ["captures", "mine", "shape"];

  return `<main class="coral-shell" data-coral-ui>
  <div class="coral-depth-ruler" aria-hidden="true">
    <span>surface</span>
    <span>capture layer</span>
    <span>jsonl bedrock</span>
  </div>
  <section class="coral-hero" aria-labelledby="coral-title">
    <div class="coral-hero-copy">
      <p class="coral-eyebrow">${escapeHtml(model.eyebrow)}</p>
      <div class="coral-manifest" aria-label="Coral capture constraints">
        <span>passive</span>
        <span>O(1) write</span>
        <span>raw text first</span>
      </div>
      <h1 id="coral-title">${escapeHtml(model.title)}</h1>
      <p class="coral-subtitle">${escapeHtml(model.subtitle)}</p>
      <div class="coral-write-path" aria-label="Capture write path">
        <span>browser visits page</span>
        <span>existing text extraction</span>
        <span>append JSONL polyp</span>
      </div>
      <div class="coral-actions" aria-label="Coral actions">
        ${model.actions
          .map((action, index) => {
            const modifier = index === 0 ? " coral-action--primary" : "";
            const target = actionTargets[index] ?? "reef";
            return `<button class="coral-action${modifier}" type="button" data-coral-jump="${target}">${escapeHtml(action)}</button>`;
          })
          .join("")}
      </div>
      ${model.explorerHref ? `<a class="coral-explorer-entry" href="${escapeHtml(model.explorerHref)}"><strong>Open node explorer</strong><span>Explore every capture as a living reef graph</span></a>` : ""}
    </div>
    <aside class="coral-reef-card" aria-label="Evidence reef overview">
      <div class="coral-reef-card-head">
        <span class="coral-live-dot" aria-hidden="true"></span>
        <span>append-only reef</span>
        <span class="coral-reef-code">coral://capture-feed</span>
      </div>
      <div class="coral-reef-map" aria-hidden="true">
        ${renderReefDots(captures)}
      </div>
      <div class="coral-cost-grid">
        ${costMetric("Write compute", "near zero")}
        ${costMetric("LLM at capture", "0")}
        ${costMetric("Embeddings", "0")}
        ${costMetric("Corpus scan", "off")}
      </div>
    </aside>
  </section>

  <section class="coral-command-strip" aria-label="Capture metrics">
    <div class="coral-topic-cell">
      <span>evidence view</span>
      <strong>${escapeHtml(model.topic)}</strong>
    </div>
    ${metric("polyps", model.stats.captures)}
    ${metric("domains", model.stats.domains)}
    ${metric("tools", model.stats.tools)}
    ${metric("raw chars", model.stats.text)}
    ${metric("runs", model.stats.runs)}
  </section>

  <nav class="coral-tabs" aria-label="Coral workspace sections">
    <span class="coral-tabs-label">reef console</span>
    <button class="coral-tab is-active" type="button" data-coral-tab="reef">Reef</button>
    <button class="coral-tab" type="button" data-coral-tab="captures">Captures</button>
    <button class="coral-tab" type="button" data-coral-tab="mine">Mine</button>
    <button class="coral-tab" type="button" data-coral-tab="shape">Shape</button>
  </nav>

  <section class="coral-panel is-active" data-coral-panel="reef">
    <div class="coral-bento">
      <article class="coral-panel-card coral-panel-card--span">
        <div class="coral-card-heading">
          <p>growth rings</p>
          <h2>Page captures accumulate before anyone knows the schema.</h2>
        </div>
        ${renderTimeline(model.captureFeed.timeline, timelineMax)}
      </article>
      <article class="coral-panel-card">
        <div class="coral-card-heading">
          <p>capture tools</p>
          <h2>What produced the raw text?</h2>
        </div>
        ${renderTools(model.captureFeed.tools)}
      </article>
      <article class="coral-panel-card">
        <div class="coral-card-heading">
          <p>substrates</p>
          <h2>Domains forming the reef.</h2>
        </div>
        ${renderDomains(model.captureFeed.domains, domainMax)}
      </article>
      <article class="coral-panel-card coral-panel-card--span">
        <div class="coral-card-heading">
          <p>latest polyp</p>
          <h2>Raw page evidence, not a summary.</h2>
        </div>
        ${renderPrimaryCapture(primaryCapture)}
      </article>
    </div>
  </section>

  <section class="coral-panel" data-coral-panel="captures">
    <div class="coral-ledger-layout">
      <aside class="coral-ledger-sidebar">
        <p class="coral-side-label">capture anatomy</p>
        <ol class="coral-anatomy">
          <li><strong>URL</strong><span>where the agent looked</span></li>
          <li><strong>text</strong><span>already extracted by browser tools</span></li>
          <li><strong>query</strong><span>why the page was visited</span></li>
          <li><strong>hashes</strong><span>cheap provenance and later diff</span></li>
        </ol>
      </aside>
      <div class="coral-capture-ledger">
        ${renderCaptures(captures)}
      </div>
    </div>
  </section>

  <section class="coral-panel" data-coral-panel="mine">
    <div class="coral-bento">
      <article class="coral-panel-card coral-panel-card--span">
        <div class="coral-card-heading">
          <p>prior research lookup</p>
          <h2>Read-time retrieval over saved page text.</h2>
        </div>
        ${renderPriorResearch(model.priorResearch)}
      </article>
      <article class="coral-panel-card coral-panel-card--span">
        <div class="coral-card-heading">
          <p>run diff</p>
          <h2>Comparison is optional read-time mining.</h2>
        </div>
        ${renderDiff(model.diff)}
      </article>
    </div>
  </section>

  <section class="coral-panel" data-coral-panel="shape">
    <article class="coral-panel-card coral-panel-card--full">
      <div class="coral-card-heading">
        <p>shape later</p>
        <h2>Tables are mined from raw captures when the user asks.</h2>
      </div>
      ${renderRows(model.rows)}
    </article>
  </section>
</main>`;
}

export function coralUiCss() {
  return `:root {
  color-scheme: dark;
  --reef-bg: #070908;
  --reef-ink: #f2efdf;
  --reef-muted: #9ca694;
  --reef-faint: #586355;
  --reef-line: rgba(206, 231, 192, 0.16);
  --reef-panel: rgba(14, 22, 18, 0.78);
  --reef-panel-strong: rgba(21, 33, 27, 0.94);
  --reef-coral: #ff725c;
  --reef-coral-2: #ffb45f;
  --reef-lime: #c9f27a;
  --reef-cyan: #69e7cf;
  --reef-blue: #5d8cff;
  --reef-shadow: 0 36px 120px rgba(0, 0, 0, 0.54);
  --reef-radius: 30px;
  --reef-mono: 'SFMono-Regular', 'Roboto Mono', 'Cascadia Code', Consolas, monospace;
  --reef-serif: Georgia, 'Times New Roman', serif;
  --reef-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  color: var(--reef-ink);
  font-family: var(--reef-sans);
  background:
    radial-gradient(circle at 12% 14%, rgba(105, 231, 207, 0.16), transparent 28rem),
    radial-gradient(circle at 88% 8%, rgba(255, 114, 92, 0.18), transparent 24rem),
    linear-gradient(180deg, #070908 0%, #0d1511 42%, #0a0d0b 100%);
}

button, input, select, textarea { font: inherit; }

.coral-shell {
  position: relative;
  width: min(1240px, calc(100vw - 28px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.coral-shell::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(201, 242, 122, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(105, 231, 207, 0.07) 1px, transparent 1px),
    radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px);
  background-size: 64px 64px, 64px 64px, 17px 17px;
  mask-image: linear-gradient(180deg, black, transparent 85%);
}

.coral-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
  gap: 18px;
  min-height: 470px;
}

.coral-hero-copy,
.coral-reef-card,
.coral-command-strip,
.coral-tabs,
.coral-panel-card,
.coral-ledger-sidebar,
.coral-capture-card {
  border: 1px solid var(--reef-line);
  box-shadow: var(--reef-shadow);
  backdrop-filter: blur(18px);
}

.coral-hero-copy {
  position: relative;
  overflow: hidden;
  padding: 44px;
  border-radius: 38px;
  background:
    linear-gradient(135deg, rgba(201, 242, 122, 0.12), transparent 38%),
    linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.015)),
    var(--reef-panel);
}

.coral-hero-copy::after {
  content: '';
  position: absolute;
  right: -110px;
  bottom: -140px;
  width: 360px;
  height: 360px;
  border: 1px solid rgba(255, 180, 95, 0.3);
  border-radius: 52% 48% 46% 54%;
  background: radial-gradient(circle, rgba(255, 114, 92, 0.16), transparent 64%);
}

.coral-eyebrow,
.coral-card-heading p,
.coral-side-label {
  margin: 0 0 12px;
  color: var(--reef-cyan);
  font-family: var(--reef-mono);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.coral-hero h1 {
  position: relative;
  z-index: 1;
  max-width: 780px;
  margin: 0;
  font-family: var(--reef-serif);
  font-size: clamp(3.8rem, 9vw, 8.7rem);
  line-height: 0.82;
  letter-spacing: -0.085em;
}

.coral-subtitle {
  position: relative;
  z-index: 1;
  max-width: 690px;
  margin: 28px 0 0;
  color: var(--reef-muted);
  font-size: clamp(1rem, 1.8vw, 1.22rem);
  line-height: 1.65;
}

.coral-write-path {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin-top: 34px;
  border: 1px solid var(--reef-line);
  border-radius: 22px;
  background: rgba(255,255,255,0.06);
}

.coral-write-path span {
  min-height: 70px;
  padding: 18px;
  color: var(--reef-ink);
  font-family: var(--reef-mono);
  font-size: 0.78rem;
  text-transform: uppercase;
  background: rgba(7, 9, 8, 0.42);
}

.coral-write-path span::before {
  content: '0' counter(path);
  counter-increment: path;
  display: block;
  margin-bottom: 8px;
  color: var(--reef-coral-2);
}

.coral-write-path { counter-reset: path; }

.coral-actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.coral-action,
.coral-tab {
  min-height: 42px;
  border: 1px solid var(--reef-line);
  border-radius: 999px;
  color: var(--reef-ink);
  background: rgba(255,255,255,0.055);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.coral-action { padding: 0 16px; }

.coral-action:hover,
.coral-action:focus-visible,
.coral-tab:hover,
.coral-tab:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(201, 242, 122, 0.8);
  outline: none;
}

.coral-action--primary {
  border-color: transparent;
  color: #08100c;
  background: linear-gradient(135deg, var(--reef-lime), var(--reef-cyan));
  font-weight: 900;
}

.coral-reef-card {
  position: relative;
  overflow: hidden;
  padding: 24px;
  border-radius: 38px;
  background:
    linear-gradient(180deg, rgba(105, 231, 207, 0.12), transparent 55%),
    var(--reef-panel-strong);
}

.coral-reef-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--reef-muted);
  font-family: var(--reef-mono);
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.coral-live-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--reef-lime);
  box-shadow: 0 0 0 0 rgba(201, 242, 122, 0.45);
  animation: coralPulse 2s infinite;
}

.coral-reef-map {
  position: relative;
  height: 270px;
  margin-top: 24px;
  overflow: hidden;
  border: 1px solid var(--reef-line);
  border-radius: 28px;
  background:
    radial-gradient(circle at 50% 100%, rgba(255, 114, 92, 0.22), transparent 48%),
    linear-gradient(180deg, rgba(93, 140, 255, 0.16), rgba(7, 9, 8, 0.4));
}

.coral-reef-map::before,
.coral-reef-map::after {
  content: '';
  position: absolute;
  left: -8%;
  right: -8%;
  height: 90px;
  border-top: 1px solid rgba(201, 242, 122, 0.18);
  border-radius: 50%;
}

.coral-reef-map::before { bottom: 22px; transform: rotate(-3deg); }
.coral-reef-map::after { bottom: -18px; transform: rotate(4deg); }

.coral-reef-dot {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--s);
  height: var(--s);
  border-radius: 42% 58% 47% 53%;
  background: var(--c);
  box-shadow: 0 0 24px color-mix(in srgb, var(--c), transparent 40%);
  opacity: 0.88;
}

.coral-cost-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.coral-cost {
  padding: 14px;
  border: 1px solid var(--reef-line);
  border-radius: 18px;
  background: rgba(255,255,255,0.055);
}

.coral-cost span,
.coral-command-strip span,
.coral-capture-meta span {
  color: var(--reef-faint);
  font-family: var(--reef-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.coral-cost strong {
  display: block;
  margin-top: 6px;
  color: var(--reef-ink);
  font-size: 1.18rem;
}

.coral-command-strip {
  display: grid;
  grid-template-columns: minmax(260px, 1.4fr) repeat(5, 1fr);
  gap: 1px;
  overflow: hidden;
  margin-top: 18px;
  border-radius: 26px;
  background: rgba(255,255,255,0.055);
}

.coral-command-strip > div {
  min-height: 84px;
  padding: 18px;
  background: rgba(7, 9, 8, 0.46);
}

.coral-command-strip strong {
  display: block;
  margin-top: 8px;
  font-size: 1.35rem;
}

.coral-topic-cell strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coral-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 18px 0;
  padding: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
}

.coral-tab {
  padding: 0 18px;
  font-family: var(--reef-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.coral-tab.is-active {
  color: #08100c;
  background: var(--reef-ink);
  font-weight: 900;
}

.coral-panel { display: none; }
.coral-panel.is-active { display: block; }

.coral-bento {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.48fr);
  gap: 18px;
}

.coral-panel-card,
.coral-ledger-sidebar,
.coral-capture-card {
  min-width: 0;
  border-radius: var(--reef-radius);
  background: var(--reef-panel);
}

.coral-panel-card { padding: 24px; }
.coral-panel-card--span { grid-column: span 1; }
.coral-panel-card--full { width: 100%; }

.coral-card-heading h2 {
  max-width: 760px;
  margin: 0;
  font-family: var(--reef-serif);
  font-size: clamp(1.5rem, 3vw, 2.35rem);
  line-height: 1.02;
  letter-spacing: -0.045em;
}

.coral-empty {
  margin-top: 18px;
  padding: 22px;
  border: 1px dashed rgba(201, 242, 122, 0.24);
  border-radius: 20px;
  color: var(--reef-muted);
}

.coral-timeline {
  display: grid;
  gap: 14px;
  margin-top: 24px;
}

.coral-time-row {
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr) 58px;
  gap: 14px;
  align-items: center;
}

.coral-time-date,
.coral-time-count {
  color: var(--reef-muted);
  font-family: var(--reef-mono);
  font-size: 0.84rem;
}

.coral-time-track,
.coral-domain-track {
  overflow: hidden;
  border: 1px solid var(--reef-line);
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
}

.coral-time-track { height: 20px; }
.coral-domain-track { height: 8px; }

.coral-time-bar,
.coral-domain-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--reef-coral), var(--reef-coral-2), var(--reef-lime), var(--reef-cyan));
}

.coral-tool-grid,
.coral-domain-list,
.coral-prior-list,
.coral-diff-list {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}

.coral-tool,
.coral-domain-row,
.coral-list-item,
.coral-diff-stat {
  border: 1px solid var(--reef-line);
  border-radius: 18px;
  background: rgba(255,255,255,0.052);
}

.coral-tool {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  font-family: var(--reef-mono);
}

.coral-tool span:last-child { color: var(--reef-cyan); }

.coral-domain-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 14px;
}

.coral-domain-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.coral-domain-count { color: var(--reef-cyan); font-family: var(--reef-mono); }
.coral-domain-track { grid-column: 1 / -1; }

.coral-primary-capture {
  margin-top: 22px;
  border: 1px solid var(--reef-line);
  border-radius: 24px;
  overflow: hidden;
  background: rgba(3, 6, 5, 0.68);
}

.coral-primary-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--reef-line);
}

.coral-polyp-number {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #08100c;
  background: var(--reef-lime);
  font-family: var(--reef-mono);
  font-weight: 900;
}

.coral-primary-head h3,
.coral-capture-title,
.coral-list-item h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.25;
}

.coral-primary-head p,
.coral-capture-url {
  margin: 5px 0 0;
  overflow: hidden;
  color: var(--reef-muted);
  font-family: var(--reef-mono);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coral-raw-block {
  max-height: 280px;
  margin: 0;
  padding: 18px;
  overflow: auto;
  color: #cfe7c8;
  font-family: var(--reef-mono);
  font-size: 0.82rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

.coral-ledger-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
}

.coral-ledger-sidebar { padding: 22px; }

.coral-anatomy {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.coral-anatomy li {
  padding: 14px;
  border: 1px solid var(--reef-line);
  border-radius: 18px;
  background: rgba(255,255,255,0.046);
}

.coral-anatomy strong { display: block; color: var(--reef-ink); }
.coral-anatomy span { display: block; margin-top: 5px; color: var(--reef-muted); font-size: 0.88rem; }

.coral-capture-ledger {
  display: grid;
  gap: 14px;
}

.coral-capture-card {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
}

.coral-capture-index {
  display: grid;
  place-items: center;
  align-self: start;
  width: 46px;
  height: 46px;
  border: 1px solid var(--reef-line);
  border-radius: 16px;
  color: var(--reef-coral-2);
  font-family: var(--reef-mono);
  background: rgba(255,255,255,0.04);
}

.coral-capture-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.coral-capture-meta span {
  display: inline-flex;
  padding: 6px 9px;
  border: 1px solid var(--reef-line);
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
}

.coral-capture-snippet {
  max-height: 150px;
  margin: 0;
  overflow: hidden;
  color: #cfe7c8;
  font-family: var(--reef-mono);
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.coral-list-item {
  padding: 16px;
}

.coral-list-item p {
  margin: 9px 0 0;
  color: var(--reef-muted);
  line-height: 1.55;
}

.coral-list-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.coral-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--reef-line);
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--reef-muted);
  font-family: var(--reef-mono);
  font-size: 0.74rem;
  background: rgba(255,255,255,0.04);
}

.coral-diff-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 18px;
}

.coral-diff-stat {
  padding: 16px;
}

.coral-diff-stat span { color: var(--reef-muted); font-family: var(--reef-mono); font-size: 0.76rem; text-transform: uppercase; }
.coral-diff-stat strong { display: block; margin-top: 8px; font-size: 1.8rem; }

.coral-row-table {
  width: 100%;
  margin-top: 22px;
  border: 1px solid var(--reef-line);
  border-collapse: separate;
  border-radius: 22px;
  border-spacing: 0;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
}

.coral-row-table th,
.coral-row-table td {
  padding: 13px 15px;
  border-bottom: 1px solid var(--reef-line);
  text-align: left;
  vertical-align: top;
}

.coral-row-table th {
  color: var(--reef-cyan);
  font-family: var(--reef-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.coral-row-table td { color: var(--reef-muted); }
.coral-row-table tr:last-child td { border-bottom: 0; }

@keyframes coralPulse {
  0% { box-shadow: 0 0 0 0 rgba(201, 242, 122, 0.45); }
  70% { box-shadow: 0 0 0 18px rgba(201, 242, 122, 0); }
  100% { box-shadow: 0 0 0 0 rgba(201, 242, 122, 0); }
}

@media (max-width: 980px) {
  .coral-hero,
  .coral-bento,
  .coral-ledger-layout,
  .coral-command-strip { grid-template-columns: 1fr; }
  .coral-hero { min-height: 0; }
  .coral-hero-copy { padding: 30px; }
  .coral-write-path { grid-template-columns: 1fr; }
  .coral-tabs { overflow-x: auto; border-radius: 22px; }
  .coral-tab { min-width: 140px; }
}

@media (max-width: 600px) {
  .coral-shell { width: min(100vw - 18px, 1240px); padding-top: 10px; }
  .coral-hero-copy,
  .coral-reef-card,
  .coral-panel-card,
  .coral-ledger-sidebar,
  .coral-capture-card { border-radius: 22px; }
  .coral-hero h1 { font-size: 3.6rem; }
  .coral-cost-grid,
  .coral-diff-stats { grid-template-columns: 1fr; }
  .coral-time-row { grid-template-columns: 1fr; gap: 8px; }
  .coral-capture-card { grid-template-columns: 1fr; }
  .coral-row-table { display: block; overflow-x: auto; }
}

/* Bespoke field-instrument layer: intentionally overrides the card template. */
:root {
  --reef-bg: #030807;
  --reef-ink: #f6f0da;
  --reef-muted: #b2bba7;
  --reef-faint: #6f7c68;
  --reef-line: rgba(218, 245, 195, 0.24);
  --reef-panel: rgba(5, 14, 12, 0.84);
  --reef-panel-strong: rgba(8, 21, 18, 0.96);
  --reef-coral: #ff6b4a;
  --reef-coral-2: #ffbd68;
  --reef-lime: #cfff72;
  --reef-cyan: #79ead7;
  --reef-blue: #6b8dff;
  --reef-shadow: 0 34px 110px rgba(0, 0, 0, 0.5);
  --reef-radius: 0;
  --reef-cut: 28px;
}

body {
  background:
    radial-gradient(circle at 12% 12%, rgba(121, 234, 215, 0.18), transparent 26rem),
    radial-gradient(circle at 92% 2%, rgba(255, 107, 74, 0.2), transparent 25rem),
    repeating-linear-gradient(116deg, rgba(218, 245, 195, 0.045) 0 1px, transparent 1px 24px),
    linear-gradient(180deg, #020504 0%, #06100d 48%, #030807 100%);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.38;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 96px 96px;
  mask-image: radial-gradient(circle at 50% 10%, black, transparent 78%);
}

.coral-shell {
  width: min(1430px, calc(100vw - 34px));
  padding: 34px 0 72px 78px;
}

.coral-depth-ruler {
  position: absolute;
  left: 0;
  top: 34px;
  bottom: 72px;
  width: 46px;
  border-left: 1px solid rgba(207, 255, 114, 0.5);
  border-right: 1px solid rgba(218, 245, 195, 0.13);
  background:
    repeating-linear-gradient(180deg, rgba(207, 255, 114, 0.4) 0 1px, transparent 1px 18px),
    linear-gradient(180deg, rgba(207, 255, 114, 0.08), transparent);
}

.coral-depth-ruler span {
  position: absolute;
  left: 12px;
  color: var(--reef-faint);
  font-family: var(--reef-mono);
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
}

.coral-depth-ruler span:nth-child(1) { top: 4px; }
.coral-depth-ruler span:nth-child(2) { top: 38%; color: var(--reef-cyan); }
.coral-depth-ruler span:nth-child(3) { bottom: 4px; color: var(--reef-coral-2); }

.coral-shell::before {
  opacity: 0.2;
  background-image:
    radial-gradient(circle, rgba(207, 255, 114, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(121, 234, 215, 0.08) 1px, transparent 1px);
  background-size: 19px 19px, 128px 128px;
}

.coral-hero {
  grid-template-columns: minmax(0, 1.08fr) minmax(390px, 0.82fr);
  gap: 22px;
  min-height: 620px;
}

.coral-hero-copy,
.coral-reef-card,
.coral-command-strip,
.coral-tabs,
.coral-panel-card,
.coral-ledger-sidebar,
.coral-capture-card,
.coral-list-item,
.coral-diff-stat,
.coral-primary-capture,
.coral-row-table {
  border-color: var(--reef-line);
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: blur(16px);
}

.coral-hero-copy,
.coral-reef-card,
.coral-panel-card,
.coral-ledger-sidebar,
.coral-capture-card,
.coral-list-item {
  clip-path: polygon(0 0, calc(100% - var(--reef-cut)) 0, 100% var(--reef-cut), 100% 100%, var(--reef-cut) 100%, 0 calc(100% - var(--reef-cut)));
}

.coral-hero-copy {
  padding: 46px 54px 40px;
  border-left: 4px solid var(--reef-coral);
  background:
    linear-gradient(90deg, rgba(255, 107, 74, 0.11), transparent 38%),
    linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.012)),
    var(--reef-panel);
}

.coral-hero-copy::before {
  content: '';
  position: absolute;
  right: -180px;
  bottom: -220px;
  width: 620px;
  height: 620px;
  border: 1px solid rgba(255, 189, 104, 0.26);
  border-radius: 50%;
  background: repeating-radial-gradient(circle, rgba(255, 189, 104, 0.18) 0 1px, transparent 1px 38px);
}

.coral-hero-copy::after {
  content: 'raw evidence field station';
  right: 26px;
  bottom: 28px;
  width: auto;
  height: auto;
  border: 0;
  border-radius: 0;
  color: rgba(246, 240, 218, 0.34);
  background: transparent;
  font-family: var(--reef-mono);
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transform: rotate(-90deg);
  transform-origin: right bottom;
}

.coral-eyebrow,
.coral-card-heading p,
.coral-side-label {
  color: var(--reef-cyan);
  font-size: 0.68rem;
  letter-spacing: 0.22em;
}

.coral-manifest {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-width: 620px;
  margin: 0 0 26px;
}

.coral-manifest span {
  padding-top: 8px;
  border-top: 1px solid rgba(207, 255, 114, 0.34);
  color: var(--reef-muted);
  font-family: var(--reef-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.coral-hero h1 {
  max-width: 880px;
  font-size: clamp(4.8rem, 9.8vw, 11rem);
  line-height: 0.74;
  letter-spacing: -0.095em;
  text-wrap: balance;
}

.coral-subtitle {
  max-width: 720px;
  margin-top: 30px;
  color: #c0c8b6;
}

.coral-write-path {
  grid-template-columns: 1fr;
  gap: 9px;
  max-width: 640px;
  margin-top: 38px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.coral-write-path span {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: center;
  min-height: 54px;
  padding: 0 18px 0 0;
  border: 1px solid rgba(218, 245, 195, 0.21);
  color: var(--reef-ink);
  background:
    linear-gradient(90deg, rgba(255, 107, 74, 0.18), transparent 34%),
    rgba(2, 7, 6, 0.62);
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
}

.coral-write-path span::before {
  display: grid;
  place-items: center;
  height: 100%;
  margin: 0 16px 0 0;
  border-right: 1px solid rgba(218, 245, 195, 0.18);
  color: var(--reef-coral-2);
  background: rgba(255, 189, 104, 0.08);
}

.coral-actions {
  gap: 0;
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid rgba(218, 245, 195, 0.18);
}

.coral-action,
.coral-tab {
  border-radius: 0;
  min-height: 48px;
  color: var(--reef-ink);
  background: rgba(246, 240, 218, 0.035);
}

.coral-action {
  padding: 0 18px;
  border-right: 0;
  font-weight: 800;
}

.coral-action:last-child { border-right: 1px solid var(--reef-line); }

.coral-action:hover,
.coral-tab:hover {
  transform: translateY(-1px);
  background: rgba(121, 234, 215, 0.1);
}

.coral-action:focus-visible,
.coral-tab:focus-visible {
  outline: 2px solid var(--reef-lime);
  outline-offset: 3px;
}

.coral-action--primary {
  color: #130805;
  background: linear-gradient(90deg, var(--reef-coral-2), var(--reef-lime), var(--reef-cyan));
}

.coral-reef-card {
  min-height: 100%;
  padding: 26px;
  border-top: 4px solid rgba(121, 234, 215, 0.58);
  background:
    radial-gradient(circle at 50% 100%, rgba(121, 234, 215, 0.14), transparent 42%),
    linear-gradient(180deg, rgba(121, 234, 215, 0.12), rgba(255, 107, 74, 0.045)),
    var(--reef-panel-strong);
}

.coral-reef-card::after {
  content: 'no llm / no embeddings / no screenshots';
  position: absolute;
  left: 26px;
  bottom: 20px;
  color: rgba(246, 240, 218, 0.24);
  font-family: var(--reef-mono);
  font-size: 0.64rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.coral-reef-card-head {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(218, 245, 195, 0.18);
}

.coral-reef-code {
  margin-left: auto;
  color: var(--reef-coral-2);
  font-size: 0.68rem;
}

.coral-reef-map {
  height: 360px;
  margin-top: 22px;
  border-radius: 0;
  border-color: rgba(121, 234, 215, 0.24);
  background:
    radial-gradient(circle at 52% 84%, rgba(255, 107, 74, 0.25), transparent 32%),
    repeating-radial-gradient(ellipse at 52% 98%, rgba(207, 255, 114, 0.18) 0 1px, transparent 1px 42px),
    linear-gradient(180deg, rgba(107, 141, 255, 0.19), rgba(2, 7, 6, 0.38));
  clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%);
}

.coral-reef-map::before,
.coral-reef-map::after {
  left: -22%;
  right: -22%;
  border-top-color: rgba(207, 255, 114, 0.2);
}

.coral-reef-dot {
  border-radius: 55% 45% 42% 58%;
  box-shadow: 0 0 30px color-mix(in srgb, var(--c), transparent 35%);
}

.coral-cost-grid {
  grid-template-columns: 1fr;
  gap: 0;
  margin-top: 18px;
  border-top: 1px solid rgba(218, 245, 195, 0.16);
  padding-bottom: 34px;
}

.coral-cost {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 0;
  border: 0;
  border-bottom: 1px solid rgba(218, 245, 195, 0.14);
  border-radius: 0;
  background: transparent;
}

.coral-cost strong { color: var(--reef-lime); }

.coral-command-strip {
  grid-template-columns: minmax(320px, 1.7fr) repeat(5, minmax(120px, 1fr));
  gap: 0;
  margin: 22px 0;
  border-width: 1px 0;
  background: linear-gradient(90deg, rgba(255, 107, 74, 0.08), rgba(121, 234, 215, 0.05));
}

.coral-command-strip > div {
  position: relative;
  min-height: 88px;
  padding: 18px 18px 16px;
  border-right: 1px solid rgba(218, 245, 195, 0.14);
  background: transparent;
}

.coral-command-strip > div::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, var(--reef-coral), transparent);
  opacity: 0.55;
}

.coral-command-strip strong {
  font-family: var(--reef-serif);
  font-size: clamp(1.35rem, 2.2vw, 2rem);
  letter-spacing: -0.04em;
}

.coral-tabs {
  position: sticky;
  top: 12px;
  z-index: 5;
  grid-template-columns: 176px repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 18px 0 24px;
  padding: 0;
  border-left: 4px solid var(--reef-cyan);
  background: rgba(3, 8, 7, 0.78);
}

.coral-tabs-label {
  display: flex;
  align-items: center;
  padding: 0 18px;
  color: var(--reef-faint);
  font-family: var(--reef-mono);
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.coral-tab {
  min-height: 58px;
  border: 0;
  border-left: 1px solid rgba(218, 245, 195, 0.15);
  font-size: 0.72rem;
}

.coral-tab.is-active {
  color: #07100d;
  background: linear-gradient(90deg, var(--reef-lime), var(--reef-cyan));
  box-shadow: inset 0 -5px 0 var(--reef-coral);
}

.coral-panel { margin-top: 0; }

.coral-bento {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.coral-panel-card {
  position: relative;
  padding: 26px;
  background:
    linear-gradient(180deg, rgba(246, 240, 218, 0.055), rgba(246, 240, 218, 0.012)),
    rgba(4, 12, 10, 0.78);
}

.coral-panel-card::before,
.coral-capture-card::before,
.coral-list-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 5px;
  height: 58px;
  background: linear-gradient(180deg, var(--reef-coral), var(--reef-coral-2), transparent);
}

.coral-panel-card:nth-child(1) { grid-column: 1 / span 8; }
.coral-panel-card:nth-child(2) { grid-column: 9 / -1; }
.coral-panel-card:nth-child(3) { grid-column: 1 / span 5; }
.coral-panel-card:nth-child(4) { grid-column: 6 / -1; }
.coral-panel-card--full { width: 100%; }

.coral-card-heading {
  padding-left: 18px;
  border-left: 1px solid rgba(121, 234, 215, 0.4);
}

.coral-card-heading h2 {
  font-size: clamp(1.65rem, 2.8vw, 2.85rem);
  text-wrap: balance;
}

.coral-empty {
  border-radius: 0;
  color: var(--reef-muted);
  background:
    repeating-linear-gradient(135deg, rgba(207, 255, 114, 0.04) 0 1px, transparent 1px 12px),
    rgba(3, 8, 7, 0.48);
}

.coral-timeline,
.coral-tool-grid,
.coral-domain-list,
.coral-prior-list,
.coral-diff-list {
  gap: 0;
}

.coral-time-row {
  grid-template-columns: 118px minmax(0, 1fr) 58px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(218, 245, 195, 0.13);
}

.coral-time-track,
.coral-domain-track {
  border-radius: 0;
  background: repeating-linear-gradient(90deg, rgba(246, 240, 218, 0.08) 0 1px, transparent 1px 16px);
}

.coral-time-track { height: 28px; }
.coral-domain-track { height: 10px; }

.coral-time-bar,
.coral-domain-bar {
  border-radius: 0;
  background: linear-gradient(90deg, var(--reef-coral), var(--reef-coral-2), var(--reef-lime), var(--reef-cyan));
}

.coral-tool,
.coral-domain-row,
.coral-list-item,
.coral-diff-stat {
  border-radius: 0;
}

.coral-tool {
  padding: 13px 0;
  border: 0;
  border-bottom: 1px solid rgba(218, 245, 195, 0.14);
  background: transparent;
}

.coral-domain-row {
  padding: 15px 0 15px 18px;
  border: 0;
  border-left: 1px solid rgba(121, 234, 215, 0.28);
  border-bottom: 1px solid rgba(218, 245, 195, 0.11);
  background: linear-gradient(90deg, rgba(121, 234, 215, 0.08), transparent 52%);
}

.coral-primary-capture {
  margin-top: 24px;
  border-left: 2px solid var(--reef-lime);
  background: #020706;
  clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%);
}

.coral-primary-head {
  padding: 18px;
  border-bottom-color: rgba(218, 245, 195, 0.16);
}

.coral-polyp-number {
  border-radius: 0;
  color: #09100d;
  background: linear-gradient(180deg, var(--reef-lime), var(--reef-cyan));
  transform: rotate(-4deg);
}

.coral-raw-block,
.coral-capture-snippet {
  color: #d3f3d0;
  background:
    linear-gradient(90deg, rgba(121, 234, 215, 0.08), transparent 25%),
    repeating-linear-gradient(180deg, rgba(246, 240, 218, 0.035) 0 1px, transparent 1px 24px);
}

.coral-ledger-layout {
  grid-template-columns: 258px minmax(0, 1fr);
  gap: 22px;
}

.coral-ledger-sidebar {
  position: sticky;
  top: 96px;
  align-self: start;
  padding: 22px;
  border-left: 4px solid var(--reef-coral-2);
  background: linear-gradient(180deg, rgba(255, 189, 104, 0.08), rgba(5, 14, 12, 0.72));
}

.coral-anatomy li {
  border-radius: 0;
  background: rgba(246, 240, 218, 0.035);
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
}

.coral-capture-ledger {
  position: relative;
  gap: 18px;
}

.coral-capture-ledger::before {
  content: '';
  position: absolute;
  left: 38px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, var(--reef-coral), var(--reef-cyan), transparent);
}

.coral-capture-card {
  position: relative;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 0;
  padding: 0;
  background:
    linear-gradient(90deg, rgba(255, 107, 74, 0.09), transparent 28%),
    rgba(4, 12, 10, 0.86);
}

.coral-capture-card > div:last-child {
  padding: 22px 24px;
}

.coral-capture-index {
  align-self: stretch;
  width: auto;
  height: auto;
  min-height: 176px;
  border: 0;
  border-right: 1px solid rgba(218, 245, 195, 0.18);
  border-radius: 0;
  color: var(--reef-coral-2);
  background: rgba(2, 7, 6, 0.78);
  font-size: 1.18rem;
}

.coral-capture-title,
.coral-list-item h3 {
  font-size: 1.05rem;
}

.coral-capture-meta span,
.coral-chip {
  border-radius: 0;
  background: rgba(246, 240, 218, 0.035);
}

.coral-capture-snippet {
  max-height: 190px;
  padding: 14px;
  border-left: 2px solid rgba(121, 234, 215, 0.4);
}

.coral-list-item {
  position: relative;
  padding: 18px 18px 18px 24px;
  background:
    linear-gradient(90deg, rgba(121, 234, 215, 0.09), transparent 40%),
    rgba(4, 12, 10, 0.76);
}

.coral-diff-stats {
  grid-template-columns: repeat(4, minmax(120px, 1fr));
}

.coral-diff-stat {
  background: rgba(246, 240, 218, 0.035);
}

.coral-diff-stat strong {
  color: var(--reef-lime);
  font-family: var(--reef-serif);
}

.coral-row-table {
  border-radius: 0;
  background: rgba(4, 12, 10, 0.8);
}

.coral-row-table th {
  color: var(--reef-lime);
  background: rgba(207, 255, 114, 0.055);
}

.coral-explorer-entry {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  max-width: 420px;
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(121, 234, 215, 0.34);
  color: var(--reef-ink);
  background:
    linear-gradient(90deg, rgba(121, 234, 215, 0.12), transparent 72%),
    rgba(2, 7, 6, 0.5);
  font-family: var(--reef-mono);
  text-decoration: none;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
}

.coral-explorer-entry strong {
  color: var(--reef-lime);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.coral-explorer-entry span {
  color: var(--reef-muted);
  font-size: 0.78rem;
}

.coral-explorer-entry:hover,
.coral-explorer-entry:focus-visible {
  border-color: var(--reef-lime);
  outline: 2px solid var(--reef-lime);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}

@media (max-width: 980px) {
  .coral-shell {
    width: min(100vw - 22px, 1430px);
    padding-left: 0;
  }
  .coral-depth-ruler { display: none; }
  .coral-hero,
  .coral-bento,
  .coral-ledger-layout { grid-template-columns: 1fr; }
  .coral-panel-card:nth-child(n) { grid-column: auto; }
  .coral-tabs {
    grid-template-columns: 150px repeat(4, minmax(128px, 1fr));
    overflow-x: auto;
  }
  .coral-command-strip {
    grid-template-columns: repeat(6, minmax(160px, 1fr));
    overflow-x: auto;
  }
  .coral-ledger-sidebar { position: relative; top: auto; }
}

@media (max-width: 600px) {
  .coral-hero-copy,
  .coral-reef-card,
  .coral-panel-card,
  .coral-ledger-sidebar,
  .coral-capture-card,
  .coral-list-item {
    --reef-cut: 18px;
  }
  .coral-hero-copy { padding: 28px 24px; }
  .coral-manifest { grid-template-columns: 1fr; }
  .coral-hero h1 { font-size: clamp(3.7rem, 18vw, 5.4rem); }
  .coral-write-path span { grid-template-columns: 1fr; padding: 14px; }
  .coral-write-path span::before {
    place-items: start;
    height: auto;
    margin: 0 0 8px;
    border-right: 0;
    background: transparent;
  }
  .coral-actions { display: grid; }
  .coral-action,
  .coral-action:last-child { border-right: 1px solid var(--reef-line); }
  .coral-tabs { grid-template-columns: repeat(4, minmax(118px, 1fr)); }
  .coral-tabs-label { display: none; }
  .coral-reef-map { height: 260px; }
  .coral-capture-card { grid-template-columns: 1fr; }
  .coral-capture-ledger::before { display: none; }
  .coral-capture-index {
    min-height: 44px;
    border-right: 0;
    border-bottom: 1px solid rgba(218, 245, 195, 0.18);
  }
  .coral-diff-stats { grid-template-columns: 1fr; }
}`;
}

export function coralUiScript() {
  return `document.querySelectorAll('[data-coral-ui]').forEach((root) => {
  const tabs = [...root.querySelectorAll('[data-coral-tab]')];
  const panels = [...root.querySelectorAll('[data-coral-panel]')];
  const tabBar = root.querySelector('.coral-tabs');

  const activateTab = (target, scrollToTabs = false) => {
    if (!target) return;

    tabs.forEach((item) => {
      item.classList.toggle('is-active', item.getAttribute('data-coral-tab') === target);
    });
    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.getAttribute('data-coral-panel') === target);
    });

    if (scrollToTabs) {
      tabBar?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activateTab(tab.getAttribute('data-coral-tab'));
    });
  });

  root.querySelectorAll('[data-coral-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      activateTab(button.getAttribute('data-coral-jump'), true);
    });
  });
});`;
}

function renderReefDots(captures) {
  const visibleCaptures = captures.slice(0, 34);

  if (!visibleCaptures.length) {
    return '<span class="coral-reef-dot" style="--x:46%;--y:54%;--s:42px;--c:var(--reef-coral)"></span>';
  }

  return visibleCaptures
    .map((capture, index) => {
      const seed = hash(`${capture.domain}:${capture.captured_at}:${index}`);
      const x = 6 + (seed % 86);
      const y = 18 + ((seed >> 3) % 65);
      const size = 9 + ((seed >> 5) % 28);
      const colors = ['var(--reef-coral)', 'var(--reef-coral-2)', 'var(--reef-lime)', 'var(--reef-cyan)', 'var(--reef-blue)'];
      const color = colors[seed % colors.length];
      return `<span class="coral-reef-dot" title="${escapeHtml(capture.domain)}" style="--x:${x}%;--y:${y}%;--s:${size}px;--c:${color}"></span>`;
    })
    .join('');
}

function renderTimeline(entries, max) {
  if (!entries.length) {
    return emptyState('No captures yet. Run Search Agent Sky once and Coral will start growing.');
  }

  return `<div class="coral-timeline">${entries
    .map((entry) => `<div class="coral-time-row">
      <span class="coral-time-date">${escapeHtml(entry.date)}</span>
      <div class="coral-time-track" aria-label="${number(entry.capture_count)} captures"><div class="coral-time-bar" style="width:${percent(entry.capture_count, max)}%"></div></div>
      <strong class="coral-time-count">${number(entry.capture_count)}</strong>
    </div>`)
    .join('')}</div>`;
}

function renderTools(tools) {
  if (!tools.length) {
    return emptyState('No tool metadata yet. Pass meta.tool from navigate, ddm, get_text, or intel_extract.');
  }

  return `<div class="coral-tool-grid">${tools
    .map((tool) => `<div class="coral-tool"><span>${escapeHtml(tool.tool)}</span><span>${number(tool.count)}</span></div>`)
    .join('')}</div>`;
}

function renderDomains(domains, max) {
  if (!domains.length) {
    return emptyState('No source domains yet.');
  }

  return `<div class="coral-domain-list">${domains
    .map((domain) => `<div class="coral-domain-row">
      <strong class="coral-domain-name">${escapeHtml(domain.domain)}</strong>
      <span class="coral-domain-count">${number(domain.count)}</span>
      <div class="coral-domain-track"><div class="coral-domain-bar" style="width:${percent(domain.count, max)}%"></div></div>
    </div>`)
    .join('')}</div>`;
}

function renderPrimaryCapture(capture) {
  if (!capture) {
    return emptyState('No raw page capture selected.');
  }

  return `<div class="coral-primary-capture">
    <div class="coral-primary-head">
      <span class="coral-polyp-number">01</span>
      <div>
        <h3>${escapeHtml(capture.title || capture.url)}</h3>
        <p>${escapeHtml(capture.url)}</p>
      </div>
      <span class="coral-chip">${escapeHtml(capture.meta?.tool || 'capture')}</span>
    </div>
    <pre class="coral-raw-block">${escapeHtml(snippet(capture.text, 1800))}</pre>
  </div>`;
}

function renderCaptures(captures) {
  if (!captures.length) {
    return emptyState('No captures yet.');
  }

  return captures
    .slice(0, 24)
    .map((capture, index) => `<article class="coral-capture-card">
      <div class="coral-capture-index">${String(index + 1).padStart(2, '0')}</div>
      <div>
        <h3 class="coral-capture-title">${escapeHtml(capture.title || capture.url)}</h3>
        <p class="coral-capture-url">${escapeHtml(capture.url)}</p>
        <div class="coral-capture-meta">
          <span>${escapeHtml(capture.domain)}</span>
          <span>${escapeHtml(capture.meta?.tool || 'tool?')}</span>
          <span>${number(capture.text?.length ?? 0)} chars</span>
          <span>${escapeHtml(formatDate(capture.captured_at))}</span>
          ${capture.duplicate_of ? '<span>duplicate</span>' : ''}
        </div>
        <pre class="coral-capture-snippet">${escapeHtml(snippet(capture.text, 700))}</pre>
      </div>
    </article>`)
    .join('');
}

function renderPriorResearch(results) {
  if (!results.length) {
    return emptyState('No prior research matched this filter. The next run will add page captures to mine later.');
  }

  return `<div class="coral-prior-list">${results
    .slice(0, 8)
    .map((result) => `<article class="coral-list-item">
      <h3>${escapeHtml(result.title || result.domain || result.url)}</h3>
      <p>${escapeHtml(result.highlight || 'Saved capture with source text available for answer context.')}</p>
      <div class="coral-list-meta">
        <span class="coral-chip">score ${number(result.score)}</span>
        <span class="coral-chip">${escapeHtml(result.domain)}</span>
        <span class="coral-chip">${escapeHtml(formatDate(result.captured_at))}</span>
      </div>
    </article>`)
    .join('')}</div>`;
}

function renderDiff(diff) {
  const summary = diff.summary ?? emptyDiff().summary;
  const hasChanges = summary.added_count || summary.removed_count || summary.changed_count || summary.common_count;

  if (!hasChanges) {
    return emptyState('No comparable runs yet. Coral can diff captures later without changing the cheap write path.');
  }

  return `<div class="coral-diff-stats">
    ${diffStat('Added', summary.added_count)}
    ${diffStat('Removed', summary.removed_count)}
    ${diffStat('Changed', summary.changed_count)}
    ${diffStat('Common', summary.common_count)}
  </div>
  <div class="coral-diff-list">
    ${diffList('Added sources', diff.added?.map((capture) => capture.url) ?? [])}
    ${diffList('Changed sources', diff.changed?.map((entry) => entry.after?.url) ?? [])}
    ${diffList('New terms', summary.terms_added ?? [])}
    ${diffList('Faded terms', summary.terms_removed ?? [])}
  </div>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return emptyState('No shaped rows yet. Use coral.shape() with an LLM extractor only when the user asks for a table.');
  }

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  return `<table class="coral-row-table">
    <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
    <tbody>${rows
      .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? '')}</td>`).join('')}</tr>`)
      .join('')}</tbody>
  </table>`;
}

function metric(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${number(value)}</strong></div>`;
}

function costMetric(label, value) {
  return `<div class="coral-cost"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function diffStat(label, value) {
  return `<div class="coral-diff-stat"><span>${escapeHtml(label)}</span><strong>${number(value)}</strong></div>`;
}

function diffList(label, values) {
  const filtered = values.filter(Boolean).slice(0, 8);

  if (!filtered.length) return '';

  return `<div class="coral-list-item"><h3>${escapeHtml(label)}</h3><p>${filtered.map((value) => escapeHtml(value)).join(' | ')}</p></div>`;
}

function emptyState(message) {
  return `<div class="coral-empty">${escapeHtml(message)}</div>`;
}

function normalizeSearchResult(result) {
  const capture = result.capture ?? result;

  return {
    score: result.score ?? 1,
    highlight: result.highlight ?? snippet(capture.text),
    title: capture.title ?? '',
    url: capture.url ?? '',
    domain: capture.domain ?? '',
    captured_at: capture.captured_at ?? '',
  };
}

function emptyDiff() {
  return {
    added: [],
    removed: [],
    changed: [],
    common: [],
    summary: {
      added_count: 0,
      removed_count: 0,
      changed_count: 0,
      common_count: 0,
      domains_added: [],
      domains_removed: [],
      terms_added: [],
      terms_removed: [],
    },
  };
}

function snippet(value, max = 220) {
  const text = String(value ?? '').replace(/\s+$/g, '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function percent(value, max) {
  return Math.max(8, Math.min(100, Math.round((Number(value ?? 0) / max) * 100)));
}

function number(value) {
  return new Intl.NumberFormat('en-US', { notation: Number(value ?? 0) >= 100000 ? 'compact' : 'standard' }).format(Number(value ?? 0));
}

function formatDate(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function hash(value) {
  let h = 2166136261;
  const text = String(value ?? '');
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
