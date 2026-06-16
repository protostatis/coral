import { createCoral, renderCoralDocument, renderCoralExplorerDocument } from "@unchainedsky/coral";

const coral = createCoral({
  dir: process.env.CORAL_DIR ?? ".coral",
  source: "searchagentsky",
});

export async function recordSearchAgentSkyRun({ query, topic, sessionId, answerId, resultUrl }) {
  return coral.appendRun({
    query,
    topic,
    session_id: sessionId,
    answer_id: answerId,
    result_url: resultUrl,
  });
}

export async function recordSearchAgentSkyPageVisit({ page, run = {}, extraction, query, sessionId, answerId }) {
  if (!page?.url) {
    return null;
  }

  return coral.appendCapture({
    url: page.url,
    title: page.title,
    text: extraction?.text ?? page.text ?? "",
    query: run.query ?? query ?? "",
    topic: run.topic,
    run_id: run.id,
    session_id: run.session_id ?? sessionId,
    answer_id: run.answer_id ?? answerId,
    meta: {
      status: page.status,
      content_type: page.contentType,
      tool: extraction?.tool ?? "ddm",
      extraction_strategy: extraction?.strategy,
    },
  });
}

export async function getPriorResearch(query) {
  return coral.search(query, { limit: 8 });
}

export async function getAnswerCaptureFeed(answerId) {
  return coral.getCaptureFeed({ answer_id: answerId });
}

export async function getAnswerReef(answerId) {
  return coral.getReef({ answer_id: answerId, includeDuplicates: true });
}

export function registerCoralRoutes(app, { basePath = "/coral", reefApiPath = "/api/coral/reef", explorerPath = `${basePath}/explorer` } = {}) {
  app.get(basePath, async (req, res) => {
    try {
      const reef = await coral.getReef(filtersFromQuery(req.query));
      res.type("html").send(renderCoralDocument(reef, { title: "Coral Evidence Reef", api: reefApiPath }));
    } catch (error) {
      res.status(500).send(error.message || "failed to render coral reef");
    }
  });

  app.get(explorerPath, async (req, res) => {
    try {
      const graph = await coral.getGraph(filtersFromQuery(req.query));
      res.type("html").send(renderCoralExplorerDocument({ graph, backHref: basePath }));
    } catch (error) {
      res.status(500).send(error.message || "failed to render coral explorer");
    }
  });

  registerCoralReefRoutes(app, { basePath: reefApiPath });
}

export function registerCoralReefRoutes(app, { basePath = "/api/coral/reef" } = {}) {
  app.get(basePath, async (req, res) => {
    try {
      res.json(await coral.getReef(filtersFromQuery(req.query)));
    } catch (error) {
      res.status(500).json({ error: error.message || "failed to build coral reef" });
    }
  });
}

function filtersFromQuery(query = {}) {
  const filters = { includeDuplicates: true };
  if (typeof query.q === "string") filters.query = query.q;
  if (typeof query.domain === "string") filters.domain = query.domain;
  if (typeof query.run_id === "string") filters.run_id = query.run_id;
  if (typeof query.session_id === "string") filters.session_id = query.session_id;
  if (typeof query.answer_id === "string") filters.answer_id = query.answer_id;
  if (typeof query.after === "string") filters.after = query.after;
  if (typeof query.before === "string") filters.before = query.before;
  if (typeof query.limit === "string") {
    const limit = Number(query.limit);
    if (Number.isFinite(limit) && limit > 0) filters.limit = Math.min(limit, 500);
  }
  return filters;
}
