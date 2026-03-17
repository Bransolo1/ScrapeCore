/**
 * Prompt version changelog registry.
 * Each entry records what changed between consecutive prompt versions.
 * Add a new entry here whenever PROMPT_VERSION in prompts.ts is bumped.
 */

export interface PromptChange {
  type: "added" | "changed" | "removed" | "fixed";
  description: string;
}

export interface PromptVersionEntry {
  version: string;
  date: string;
  summary: string;
  changes: PromptChange[];
}

export const PROMPT_CHANGELOG: PromptVersionEntry[] = [
  {
    version: "v1.0",
    date: "2025-01",
    summary: "Initial structured COM-B prompt with XML output schema.",
    changes: [
      { type: "added", description: "COM-B mapping with capability/opportunity/motivation sub-dimensions" },
      { type: "added", description: "Barriers and motivators with severity/strength and source_text" },
      { type: "added", description: "Intervention opportunities with BCW category and BCT specifics" },
      { type: "added", description: "Contradictions section" },
      { type: "added", description: "Subgroup insights and persona card generation" },
      { type: "added", description: "Confidence assessment with overall rating and rationale" },
    ],
  },
  {
    version: "v1.1",
    date: "2025-02",
    summary: "Added evidence grounding fields and improved source tracing.",
    changes: [
      { type: "added", description: "evidence[] array on barriers, motivators, and key behaviours — up to 3 direct quotes per finding" },
      { type: "added", description: "source_text field on all findings — primary quote that generated the finding" },
      { type: "changed", description: "Increased minimum required text_units_analysed count in output" },
      { type: "fixed", description: "Prompt now explicitly disallows paraphrasing source quotes — verbatim extraction required" },
    ],
  },
  {
    version: "v1.2",
    date: "2025-03",
    summary: "Added recommended_next_research and competitor analysis mode.",
    changes: [
      { type: "added", description: "recommended_next_research field — structured suggestions for follow-up studies" },
      { type: "added", description: "COMPETITOR_PROMPT_SUFFIX — structured company_model output for competitor intel data type" },
      { type: "added", description: "company_model fields: observed_signals, inferences, unknowns, strategic_implications" },
      { type: "changed", description: "System prompt now references BCT Taxonomy v1 (Michie et al. 2013) explicitly" },
    ],
  },
  {
    version: "v2.0",
    date: "2025-06",
    summary: "Major schema expansion: emotional valence, facilitators, behavioural context, high-trust flag.",
    changes: [
      { type: "added", description: "emotional_valence field on key_behaviours, barriers, and motivators (positive/negative/mixed/neutral)" },
      { type: "added", description: "facilitators[] array — distinct from motivators; captures environmental/contextual conditions" },
      { type: "added", description: "behavioural_context section — setting, triggers, temporal_pattern, social_context, routine_vs_deliberate" },
      { type: "added", description: "suitable_for_high_trust_use boolean + high_trust_notes on confidence object" },
      { type: "changed", description: "Confidence object expanded with data_quality_concerns and sample_representativeness fields" },
      { type: "changed", description: "Intervention opportunities now include implementation_guidance and source_evidence[] fields" },
    ],
  },
  {
    version: "v2.1",
    date: "2025-09",
    summary: "Context engineering: project memory injection and clarification re-prompt.",
    changes: [
      { type: "added", description: "Project memory block prepended to system prompt when prior analyses exist in same project" },
      { type: "added", description: "clarification_note field — generated via fallback re-prompt when confidence = low" },
      { type: "added", description: "projectContext (analyst-supplied research question) injected into analysis user prompt" },
      { type: "changed", description: "Plain language mode: COM-B terminology replaced with accessible equivalents in prompt output guidance" },
    ],
  },
  {
    version: "v2.2",
    date: "2025-12",
    summary: "Prompt hardening: stricter grounding requirements, diversity warnings, PII-aware instructions.",
    changes: [
      { type: "changed", description: "Prompt now instructs model to explicitly flag when fewer than 5 text units are available" },
      { type: "changed", description: "Barriers and motivators must cite at least one verbatim quote; inference-only findings require rationale" },
      { type: "added", description: "Model instructed to note input_diversity_concerns when all responses appear from a single perspective" },
      { type: "added", description: "PII-detected flag awareness: model instructed not to reproduce redacted tokens in output" },
      { type: "fixed", description: "Resolved over-reporting of high-confidence findings when input had < 10 text units" },
    ],
  },
];

/**
 * Get all changelog entries between two versions (inclusive, ordered oldest→newest).
 * Returns entries that are strictly newer than `fromVersion` up to and including `toVersion`.
 */
export function getChangesBetween(
  fromVersion: string | null | undefined,
  toVersion: string | null | undefined
): PromptVersionEntry[] {
  if (!fromVersion || !toVersion || fromVersion === toVersion) return [];

  const allVersions = PROMPT_CHANGELOG.map((e) => e.version);
  const fromIdx = allVersions.indexOf(fromVersion);
  const toIdx   = allVersions.indexOf(toVersion);

  if (fromIdx === -1 || toIdx === -1) return [];

  const [start, end] = fromIdx < toIdx ? [fromIdx + 1, toIdx] : [toIdx + 1, fromIdx];
  const entries = PROMPT_CHANGELOG.slice(start, end + 1);

  // If going backwards (newer → older), reverse and flip change types to communicate regression
  return fromIdx < toIdx ? entries : [...entries].reverse();
}
