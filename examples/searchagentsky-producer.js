import { createCoral } from "@unchainedsky/coral";

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
