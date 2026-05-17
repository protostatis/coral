import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { appendJsonl, readJsonl, readJsonlArray } from "./jsonl.js";
import { buildCoralGraph } from "./graph.js";
import { canonicalizeUrl, domainFromUrl, normalizeCapture, normalizeRun } from "./normalize.js";
import {
  compareBySearchResult,
  makeHighlight,
  matchesCapture,
  matchesRun,
  normalizeSearchArgs,
  scoreCapture,
  tokenize,
} from "./search.js";
import { buildCaptureFeed, buildTopicView, compareCaptureSets } from "./views.js";
export { buildCoralExplorerModel, coralExplorerCss, coralExplorerScript, renderCoralExplorer, renderCoralExplorerDocument } from "./explorer.js";
export { buildCoralGraph } from "./graph.js";
export { buildCoralUiModel, coralUiCss, coralUiScript, renderCoralDashboard, renderCoralDocument } from "./ui.js";

export class Coral {
  constructor(options = {}) {
    this.dir = resolve(options.dir ?? process.env.CORAL_DIR ?? ".coral");
    this.capturesFile = options.capturesFile ?? join(this.dir, "captures.jsonl");
    this.runsFile = options.runsFile ?? join(this.dir, "runs.jsonl");
    this.source = options.source ?? "searchagentsky";
    this.clock = options.clock;
    this.dedupe = options.dedupe ?? false;
    this.skipInvalidJsonl = options.skipInvalidJsonl ?? false;
  }

  async ensureReady() {
    await mkdir(this.dir, { recursive: true });
  }

  async appendCapture(input) {
    const capture = normalizeCapture(input, { clock: this.clock, source: this.source });

    if (this.dedupe && !capture.duplicate_of) {
      const duplicate = await this.findDuplicate(capture);

      if (duplicate) {
        capture.duplicate_of = duplicate.id;
      }
    }

    await appendJsonl(this.capturesFile, capture);
    return capture;
  }

  async appendCaptures(inputs) {
    const captures = [];

    for (const input of inputs) {
      captures.push(await this.appendCapture(input));
    }

    return captures;
  }

  async appendRun(input) {
    const run = normalizeRun(input, { clock: this.clock, source: this.source });
    await appendJsonl(this.runsFile, run);
    return run;
  }

  async search(input = {}, options = {}) {
    const args = normalizeSearchArgs(input, options);
    const query = args.query ?? "";
    const limit = args.limit ?? 25;
    const minScore = args.minScore ?? (query ? 1 : 0);
    const results = [];

    for await (const capture of this.iterCaptures()) {
      if (!matchesCapture(capture, args)) {
        continue;
      }

      const score = query ? scoreCapture(capture, query) : 1;

      if (score < minScore) {
        continue;
      }

      results.push({
        capture,
        score,
        highlight: makeHighlight(capture, query),
      });
    }

    return results.sort(compareBySearchResult).slice(0, limit);
  }

  async listCaptures(filters = {}) {
    const results = await this.search({ ...filters, limit: filters.limit ?? Number.POSITIVE_INFINITY, minScore: 0 });
    return results.map((result) => result.capture);
  }

  async getCapture(id) {
    for await (const capture of this.iterCaptures()) {
      if (capture.id === id) {
        return capture;
      }
    }

    return null;
  }

  async getCaptureFeed(input = {}, options = {}) {
    const args = normalizeSearchArgs(input, options);
    const captures = await this.listCaptures({
      ...args,
      includeDuplicates: args.includeDuplicates ?? true,
      limit: args.limit ?? 500,
      minScore: args.minScore ?? 0,
    });

    return buildCaptureFeed({ captures, limit: args.recentLimit ?? 50 });
  }

  async getGraph(input = {}, options = {}) {
    const args = normalizeSearchArgs(input, options);
    const captures = await this.listCaptures({
      ...args,
      includeDuplicates: args.includeDuplicates ?? true,
      limit: args.limit ?? 500,
      minScore: args.minScore ?? 0,
    });

    return buildCoralGraph({
      captures,
      query: args.query ?? "",
      limit: args.limit ?? 500,
      termLimit: args.termLimit ?? 28,
    });
  }

  async listRuns(filters = {}) {
    const runs = [];

    for await (const run of this.iterRuns()) {
      if (matchesRun(run, filters)) {
        runs.push(run);
      }
    }

    return runs
      .sort((left, right) => Date.parse(right.started_at) - Date.parse(left.started_at))
      .slice(0, filters.limit ?? Number.POSITIVE_INFINITY);
  }

  async getRun(id) {
    for await (const run of this.iterRuns()) {
      if (run.id === id) {
        return run;
      }
    }

    return null;
  }

  async getTopicView(input = {}, options = {}) {
    const args = typeof input === "string" ? { ...options, topic: input } : { ...input };
    const topic = args.topic ?? args.query ?? "";
    const captureResults = await this.search({
      ...args,
      query: args.query ?? topic,
      limit: args.limit ?? 500,
      minScore: args.minScore ?? 0,
    });
    const runs = await this.listRuns({
      topic: args.topic,
      query: args.runQuery,
      after: args.after,
      before: args.before,
      limit: args.runLimit ?? 100,
    });

    return buildTopicView({
      topic,
      captures: captureResults.map((result) => result.capture),
      runs,
      limit: args.recentLimit ?? 25,
    });
  }

  async compareRuns(leftRunId, rightRunId, options = {}) {
    const left = await this.listCaptures({ ...options, run_id: leftRunId, includeDuplicates: options.includeDuplicates ?? true });
    const right = await this.listCaptures({ ...options, run_id: rightRunId, includeDuplicates: options.includeDuplicates ?? true });

    return compareCaptureSets(left, right);
  }

  async compareCaptureSets(leftFilters = {}, rightFilters = {}) {
    const left = Array.isArray(leftFilters) ? leftFilters : await this.listCaptures(leftFilters);
    const right = Array.isArray(rightFilters) ? rightFilters : await this.listCaptures(rightFilters);

    return compareCaptureSets(left, right);
  }

  async stats() {
    const captures = await readJsonlArray(this.capturesFile, { skipInvalid: this.skipInvalidJsonl });
    const runs = await readJsonlArray(this.runsFile, { skipInvalid: this.skipInvalidJsonl });
    const domains = new Map();
    const topics = new Map();
    let duplicateCaptures = 0;
    let firstCapturedAt = "";
    let lastCapturedAt = "";

    for (const capture of captures) {
      domains.set(capture.domain, (domains.get(capture.domain) ?? 0) + 1);

      if (capture.topic) {
        topics.set(capture.topic, (topics.get(capture.topic) ?? 0) + 1);
      }

      if (capture.duplicate_of) {
        duplicateCaptures += 1;
      }

      if (!firstCapturedAt || Date.parse(capture.captured_at) < Date.parse(firstCapturedAt)) {
        firstCapturedAt = capture.captured_at;
      }

      if (!lastCapturedAt || Date.parse(capture.captured_at) > Date.parse(lastCapturedAt)) {
        lastCapturedAt = capture.captured_at;
      }
    }

    return {
      capture_count: captures.length,
      run_count: runs.length,
      duplicate_capture_count: duplicateCaptures,
      first_captured_at: firstCapturedAt,
      last_captured_at: lastCapturedAt,
      domains: topEntries(domains, "domain"),
      topics: topEntries(topics, "topic"),
    };
  }

  async shape(docs, options = {}) {
    if (typeof options.shaper !== "function") {
      throw new Error("coral.shape requires a shaper callback that calls your LLM or extraction service");
    }

    const captures = docs.map((item) => item.capture ?? item);

    return options.shaper({
      captures,
      columns: options.columns ?? [],
      hint: options.hint ?? "",
    });
  }

  async findDuplicate(capture) {
    for await (const existing of this.iterCaptures()) {
      if (existing.duplicate_of) {
        continue;
      }

      if (existing.canonical_url === capture.canonical_url && existing.content_hash === capture.content_hash) {
        return existing;
      }
    }

    return null;
  }

  iterCaptures() {
    return readJsonl(this.capturesFile, { skipInvalid: this.skipInvalidJsonl });
  }

  iterRuns() {
    return readJsonl(this.runsFile, { skipInvalid: this.skipInvalidJsonl });
  }
}

export function createCoral(options = {}) {
  return new Coral(options);
}

function topEntries(map, key) {
  return [...map.entries()]
    .map(([value, count]) => ({ [key]: value, count }))
    .sort((left, right) => right.count - left.count || String(left[key]).localeCompare(String(right[key])));
}

export {
  buildCaptureFeed,
  buildTopicView,
  canonicalizeUrl,
  compareCaptureSets,
  domainFromUrl,
  normalizeCapture,
  normalizeRun,
  tokenize,
};
