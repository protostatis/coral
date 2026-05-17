export interface CoralOptions {
  dir?: string;
  capturesFile?: string;
  runsFile?: string;
  source?: string;
  clock?: () => Date | string | number;
  /** Defaults to false so appendCapture never scans existing captures. */
  dedupe?: boolean;
  skipInvalidJsonl?: boolean;
}

export interface CaptureInput {
  id?: string;
  url: string;
  canonical_url?: string;
  canonicalUrl?: string;
  domain?: string;
  title?: string;
  text?: string;
  body?: string;
  content?: string;
  query?: string;
  topic?: string;
  captured_at?: string | Date;
  capturedAt?: string | Date;
  run_id?: string;
  runId?: string;
  session_id?: string;
  sessionId?: string;
  answer_id?: string;
  answerId?: string;
  source?: string;
  content_hash?: string;
  contentHash?: string;
  text_hash?: string;
  textHash?: string;
  duplicate_of?: string;
  duplicateOf?: string;
  status?: number;
  content_type?: string;
  contentType?: string;
  meta?: Record<string, unknown>;
}

export interface Capture {
  id: string;
  url: string;
  canonical_url: string;
  domain: string;
  title: string;
  text: string;
  query: string;
  topic: string;
  captured_at: string;
  run_id: string;
  session_id: string;
  answer_id: string;
  source: string;
  content_hash: string;
  text_hash: string;
  duplicate_of: string;
  meta: Record<string, unknown>;
}

export interface RunInput {
  id?: string;
  query: string;
  topic?: string;
  started_at?: string | Date;
  startedAt?: string | Date;
  ended_at?: string | Date;
  endedAt?: string | Date;
  session_id?: string;
  sessionId?: string;
  answer_id?: string;
  answerId?: string;
  result_url?: string;
  resultUrl?: string;
  source?: string;
  status?: string;
  meta?: Record<string, unknown>;
}

export interface Run {
  id: string;
  query: string;
  topic: string;
  started_at: string;
  ended_at: string;
  session_id: string;
  answer_id: string;
  result_url: string;
  source: string;
  status: string;
  meta: Record<string, unknown>;
}

export interface SearchOptions {
  query?: string;
  domain?: string | string[];
  topic?: string | string[];
  run_id?: string;
  runId?: string;
  session_id?: string;
  sessionId?: string;
  answer_id?: string;
  answerId?: string;
  after?: string;
  before?: string;
  limit?: number;
  minScore?: number;
  includeDuplicates?: boolean;
}

export interface GraphOptions extends SearchOptions {
  termLimit?: number;
}

export interface ReefOptions extends SearchOptions {
  colonyLimit?: number;
}

export interface SearchResult {
  capture: Capture;
  score: number;
  highlight: string;
}

export interface TopicView {
  topic: string;
  capture_count: number;
  run_count: number;
  first_captured_at: string;
  last_captured_at: string;
  domains: Array<{ domain: string; count: number; last_captured_at: string; titles: string[] }>;
  timeline: Array<{ date: string; capture_count: number; run_ids: string[]; domains: string[] }>;
  top_terms: Array<{ term: string; score: number }>;
  recent_captures: Capture[];
  recent_runs: Run[];
}

export interface CaptureFeed {
  capture_count: number;
  first_captured_at: string;
  last_captured_at: string;
  total_text_length: number;
  domains: Array<{ domain: string; count: number; last_captured_at: string; titles: string[] }>;
  tools: Array<{ tool: string; count: number }>;
  timeline: Array<{ date: string; capture_count: number; run_ids: string[]; domains: string[] }>;
  recent_captures: Capture[];
}

export interface Stats {
  capture_count: number;
  run_count: number;
  duplicate_capture_count: number;
  first_captured_at: string;
  last_captured_at: string;
  domains: Array<{ domain: string; count: number }>;
  topics: Array<{ topic: string; count: number }>;
}

export interface CompareResult {
  added: Capture[];
  removed: Capture[];
  changed: Array<{ before: Capture; after: Capture }>;
  common: Capture[];
  summary: {
    added_count: number;
    removed_count: number;
    changed_count: number;
    common_count: number;
    domains_added: string[];
    domains_removed: string[];
    terms_added: string[];
    terms_removed: string[];
  };
}

export interface CoralUiModelInput {
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  topic?: string;
  actions?: string[];
  topicView?: Partial<TopicView>;
  diff?: Partial<CompareResult>;
  priorResearch?: Array<SearchResult | Capture>;
  rows?: Array<Record<string, unknown>>;
  captureFeed?: Partial<CaptureFeed>;
  captures?: Capture[];
  stats?: Partial<Stats>;
  captureCount?: number;
  runCount?: number;
  domainCount?: number;
  toolCount?: number;
  changeCount?: number;
  textLength?: number;
  explorerHref?: string;
}

export interface CoralGraphNode {
  id: string;
  type: "capture" | "domain" | "term";
  label: string;
  size?: number;
  [key: string]: unknown;
}

export interface CoralGraphEdge {
  id: string;
  source: string;
  target: string;
  type: "domain" | "term" | "duplicate";
  weight: number;
}

export interface CoralGraph {
  schema_version: number;
  generated_at: string;
  query: string;
  stats: {
    capture_count: number;
    domain_count: number;
    term_count: number;
    node_count: number;
    edge_count: number;
    total_text_length: number;
  };
  nodes: CoralGraphNode[];
  edges: CoralGraphEdge[];
}

export interface CoralExplorerModelInput {
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  query?: string;
  captures?: Capture[];
  graph?: CoralGraph;
}

export type CoralReefMorphology = "branching" | "fan" | "plate" | "brain" | "anemone";

export interface CoralReefCapturePreview {
  id: string;
  title: string;
  url: string;
  domain: string;
  captured_at: string;
  query: string;
  topic: string;
  tool: string;
  text_preview: string;
}

export interface CoralReefCaptureGlyph {
  id: string;
  title: string;
  url: string;
  domain: string;
  captured_at: string;
  query: string;
  topic: string;
  tool: string;
  run_id: string;
  answer_id: string;
  text_length: number;
  duplicate_of: string;
  recency_score: number;
  seed: number;
  size: number;
  position: [number, number, number];
}

export interface CoralReefColony {
  id: string;
  label: string;
  content: string;
  dna: string;
  morphology: CoralReefMorphology;
  color: string;
  swatch: string;
  position: [number, number, number];
  captures: number;
  sources: number;
  growth: string;
  tags: string[];
  copy: string;
  similarity: string;
  recency: string;
  inspection: string;
  first_captured_at: string;
  last_captured_at: string;
  recent_ratio: number;
  top_domains: Array<{ domain: string; count: number; last_captured_at: string }>;
  top_terms: Array<{ term: string; score: number }>;
  tool_counts: Array<{ tool: string; count: number; last_captured_at: string }>;
  topic_samples: Array<{ topic: string; count: number; last_captured_at: string }>;
  source_bands: Array<{ domain: string; count: number; weight: number; seed: number }>;
  timeline_bands: Array<{ date: string; count: number; weight: number; seed: number }>;
  capture_glyphs: CoralReefCaptureGlyph[];
  recent_captures: CoralReefCapturePreview[];
}

export interface CoralReefModel {
  schema_version: number;
  generated_at: string;
  query: string;
  ethos: string;
  source: string;
  stats: {
    capture_count: number;
    source_count: number;
    run_count: number;
    answer_count: number;
    colony_count: number;
  };
  colonies: CoralReefColony[];
}

export interface ShapeOptions<Row = unknown> {
  columns?: string[];
  hint?: string;
  shaper: (input: { captures: Capture[]; columns: string[]; hint: string }) => Promise<Row[]> | Row[];
}

export class Coral {
  dir: string;
  capturesFile: string;
  runsFile: string;
  source: string;
  dedupe: boolean;
  skipInvalidJsonl: boolean;

  constructor(options?: CoralOptions);
  ensureReady(): Promise<void>;
  appendCapture(input: CaptureInput): Promise<Capture>;
  appendCaptures(inputs: CaptureInput[]): Promise<Capture[]>;
  appendRun(input: RunInput): Promise<Run>;
  search(query?: string, options?: SearchOptions): Promise<SearchResult[]>;
  search(options?: SearchOptions): Promise<SearchResult[]>;
  listCaptures(filters?: SearchOptions): Promise<Capture[]>;
  getCapture(id: string): Promise<Capture | null>;
  getCaptureFeed(query?: string, options?: SearchOptions & { recentLimit?: number }): Promise<CaptureFeed>;
  getCaptureFeed(options?: SearchOptions & { recentLimit?: number }): Promise<CaptureFeed>;
  getGraph(query?: string, options?: GraphOptions): Promise<CoralGraph>;
  getGraph(options?: GraphOptions): Promise<CoralGraph>;
  getReef(query?: string, options?: ReefOptions): Promise<CoralReefModel>;
  getReef(options?: ReefOptions): Promise<CoralReefModel>;
  listRuns(filters?: Partial<SearchOptions> & { query?: string; limit?: number }): Promise<Run[]>;
  getRun(id: string): Promise<Run | null>;
  getTopicView(topic: string, options?: SearchOptions & { runLimit?: number; recentLimit?: number; runQuery?: string }): Promise<TopicView>;
  getTopicView(options?: SearchOptions & { runLimit?: number; recentLimit?: number; runQuery?: string }): Promise<TopicView>;
  compareRuns(leftRunId: string, rightRunId: string, options?: SearchOptions): Promise<CompareResult>;
  compareCaptureSets(leftFilters?: SearchOptions | Capture[], rightFilters?: SearchOptions | Capture[]): Promise<CompareResult>;
  stats(): Promise<Stats>;
  shape<Row = unknown>(docs: Array<Capture | SearchResult>, options: ShapeOptions<Row>): Promise<Row[]>;
}

export function createCoral(options?: CoralOptions): Coral;
export function canonicalizeUrl(url: string): string;
export function domainFromUrl(url: string): string;
export function normalizeCapture(input: CaptureInput, options?: CoralOptions): Capture;
export function normalizeRun(input: RunInput, options?: CoralOptions): Run;
export function tokenize(value: string): string[];
export function buildTopicView(input?: { topic?: string; captures?: Capture[]; runs?: Run[]; limit?: number }): TopicView;
export function buildCaptureFeed(input?: { captures?: Capture[]; limit?: number }): CaptureFeed;
export function compareCaptureSets(leftCaptures?: Capture[], rightCaptures?: Capture[]): CompareResult;
export function buildCoralGraph(input?: { captures?: Capture[]; query?: string; limit?: number; termLimit?: number }): CoralGraph;
export function buildCoralReefModel(input?: { captures?: Capture[]; query?: string; limit?: number; colonyLimit?: number }): CoralReefModel;
export function buildCoralUiModel(input?: CoralUiModelInput): Record<string, unknown>;
export function renderCoralDocument(input?: CoralUiModelInput, options?: { title?: string }): string;
export function renderCoralDashboard(input?: CoralUiModelInput): string;
export function coralUiCss(): string;
export function coralUiScript(): string;
export function buildCoralExplorerModel(input?: CoralExplorerModelInput): Record<string, unknown>;
export function renderCoralExplorerDocument(input?: CoralExplorerModelInput, options?: { title?: string }): string;
export function renderCoralExplorer(input?: CoralExplorerModelInput): string;
export function coralExplorerCss(): string;
export function coralExplorerScript(): string;
