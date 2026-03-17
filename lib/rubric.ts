/**
 * Evaluation Rubric Auto-Scorer
 *
 * Deterministic proxy scoring for the 10 dimensions in evaluation_rubric.md.
 * Each dimension scores 1–5. Total is /50.
 *
 * Scores are intentionally conservative — proxy checks from the analysis JSON,
 * not semantic judgements. They surface structural completeness, not content quality.
 */

import type { BehaviourAnalysis } from "@/lib/types";

export interface RubricDimension {
  name: string;
  score: number; // 1–5
  rationale: string;
}

export interface RubricResult {
  dimensions: RubricDimension[];
  total: number; // 0–50
  grade: "strong" | "acceptable" | "needs_revision"; // ≥40 | 25–39 | <25
}

function dim(name: string, score: number, rationale: string): RubricDimension {
  return { name, score: Math.max(1, Math.min(5, Math.round(score))), rationale };
}

export function scoreRubric(
  analysis: BehaviourAnalysis,
  groundingScore: number,
  avgValidityScore: number | null,
): RubricResult {
  const dimensions: RubricDimension[] = [];

  // ── 1. Strategic Specificity ─────────────────────────────────────────────
  const units = analysis.text_units_analysed ?? 0;
  const summaryLen = analysis.summary?.length ?? 0;
  dimensions.push(dim(
    "Strategic Specificity",
    units >= 10 && summaryLen > 150 ? 5 :
    units >= 5  && summaryLen > 100 ? 4 :
    units >= 3  ? 3 :
    units >= 1  ? 2 : 1,
    `${units} text units; summary ${summaryLen} chars`,
  ));

  // ── 2. Behavioural Science Depth ─────────────────────────────────────────
  const comb = analysis.com_b_mapping;
  const filledDims = [
    (comb?.capability?.physical?.length  ?? 0) > 0,
    (comb?.capability?.psychological?.length ?? 0) > 0,
    (comb?.opportunity?.physical?.length ?? 0) > 0,
    (comb?.opportunity?.social?.length   ?? 0) > 0,
    (comb?.motivation?.reflective?.length ?? 0) > 0,
    (comb?.motivation?.automatic?.length  ?? 0) > 0,
  ].filter(Boolean).length;
  dimensions.push(dim(
    "Behavioural Science Depth",
    filledDims >= 6 ? 5 : filledDims >= 5 ? 4 : filledDims >= 3 ? 3 : filledDims >= 1 ? 2 : 1,
    `${filledDims}/6 COM-B sub-dimensions populated`,
  ));

  // ── 3. Evidence Hygiene ───────────────────────────────────────────────────
  dimensions.push(dim(
    "Evidence Hygiene",
    groundingScore >= 90 ? 5 :
    groundingScore >= 70 ? 4 :
    groundingScore >= 50 ? 3 :
    groundingScore >= 30 ? 2 : 1,
    `Grounding score ${groundingScore}/100`,
  ));

  // ── 4. Product Realism ────────────────────────────────────────────────────
  const interventions = analysis.intervention_opportunities ?? [];
  const withGuidance = interventions.filter((i) => i.implementation_guidance?.trim()).length;
  dimensions.push(dim(
    "Product Realism",
    withGuidance >= 3 ? 5 : withGuidance >= 2 ? 4 : withGuidance >= 1 ? 3 : interventions.length > 0 ? 2 : 1,
    `${withGuidance}/${interventions.length} interventions have implementation guidance`,
  ));

  // ── 5. Enterprise Readiness ───────────────────────────────────────────────
  const limitationCount = analysis.confidence?.limitations?.length ?? 0;
  const hasSampleNote   = !!(analysis.confidence?.sample_size_note?.trim());
  const hasRationale    = !!(analysis.confidence?.rationale?.trim());
  dimensions.push(dim(
    "Enterprise Readiness",
    limitationCount >= 3 && hasSampleNote && hasRationale ? 5 :
    limitationCount >= 2 && hasSampleNote ? 4 :
    limitationCount >= 1 && hasSampleNote ? 3 :
    limitationCount >= 1 || hasSampleNote ? 2 : 1,
    `${limitationCount} limitations; sample note ${hasSampleNote ? "present" : "absent"}`,
  ));

  // ── 6. UX Clarity ─────────────────────────────────────────────────────────
  const researchCount = analysis.recommended_next_research?.length ?? 0;
  const hasContext    = !!(analysis.behavioural_context);
  dimensions.push(dim(
    "UX Clarity",
    researchCount >= 3 && hasContext ? 5 :
    researchCount >= 2 && hasContext ? 4 :
    researchCount >= 1 && hasContext ? 3 :
    researchCount >= 1 || hasContext ? 2 : 1,
    `${researchCount} research recommendations; behavioural context ${hasContext ? "present" : "absent"}`,
  ));

  // ── 7. Technical Plausibility ─────────────────────────────────────────────
  dimensions.push(dim(
    "Technical Plausibility",
    avgValidityScore === null ? 1 :
    avgValidityScore >= 3.5 ? 5 :
    avgValidityScore >= 2.5 ? 4 :
    avgValidityScore >= 1.5 ? 3 :
    avgValidityScore >= 0.5 ? 2 : 1,
    avgValidityScore !== null
      ? `Avg intervention validity ${avgValidityScore.toFixed(1)}/4`
      : "No interventions to score",
  ));

  // ── 8. Differentiation ────────────────────────────────────────────────────
  const contradictionCount = analysis.contradictions?.length ?? 0;
  const subgroupCount      = analysis.subgroup_insights?.length ?? 0;
  dimensions.push(dim(
    "Differentiation",
    contradictionCount >= 2 && subgroupCount >= 2 ? 5 :
    contradictionCount >= 1 && subgroupCount >= 1 ? 4 :
    contradictionCount >= 1 || subgroupCount >= 1 ? 3 : 2,
    `${contradictionCount} contradictions; ${subgroupCount} subgroup insights`,
  ));

  // ── 9. Actionability ──────────────────────────────────────────────────────
  const highPriority = interventions.filter((i) => i.priority === "high").length;
  const withBCT      = interventions.filter((i) => (i.bct_specifics?.length ?? 0) > 0).length;
  dimensions.push(dim(
    "Actionability",
    highPriority >= 1 && withBCT >= 2 && researchCount >= 2 ? 5 :
    highPriority >= 1 && researchCount >= 1 ? 4 :
    interventions.length > 0 && researchCount >= 1 ? 3 :
    interventions.length > 0 ? 2 : 1,
    `${highPriority} high-priority interventions; ${withBCT} with BCT specifics`,
  ));

  // ── 10. Red Team Resilience ───────────────────────────────────────────────
  const facilitatorCount = analysis.facilitators?.length ?? 0;
  dimensions.push(dim(
    "Red Team Resilience",
    limitationCount >= 2 && subgroupCount >= 1 && facilitatorCount >= 1 ? 5 :
    limitationCount >= 2 && subgroupCount >= 1 ? 4 :
    limitationCount >= 1 && (subgroupCount >= 1 || facilitatorCount >= 1) ? 3 :
    limitationCount >= 1 ? 2 : 1,
    `${limitationCount} limitations; ${subgroupCount} subgroups; ${facilitatorCount} facilitators`,
  ));

  const total = dimensions.reduce((s, d) => s + d.score, 0);
  const grade: RubricResult["grade"] =
    total >= 40 ? "strong" : total >= 25 ? "acceptable" : "needs_revision";

  return { dimensions, total, grade };
}
