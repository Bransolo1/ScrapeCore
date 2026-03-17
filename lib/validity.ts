/**
 * Measurement Validity Scoring
 *
 * Scores each intervention opportunity on whether it is specific enough to
 * actually implement and measure. Analysts can use this to quickly identify
 * vague or under-specified recommendations before acting on them.
 *
 * Score 0–4 → weak / fair / good / excellent
 */

import type { InterventionOpportunity } from "@/lib/types";

export type ValidityLevel = "weak" | "fair" | "good" | "excellent";

export interface ValidityResult {
  score: number;       // 0–4
  level: ValidityLevel;
  checks: { label: string; passed: boolean; tip: string }[];
}

const BCW_CATEGORIES = new Set([
  "Education", "Persuasion", "Incentivisation", "Coercion",
  "Training", "Restriction", "Environmental restructuring", "Modelling", "Enablement",
]);

export function scoreIntervention(intervention: InterventionOpportunity): ValidityResult {
  const checks: ValidityResult["checks"] = [
    {
      label: "Named BCTs",
      passed: (intervention.bct_specifics?.length ?? 0) > 0,
      tip: "Add specific Behaviour Change Techniques from BCTTv1 taxonomy",
    },
    {
      label: "COM-B target",
      passed: (intervention.target_com_b?.length ?? 0) > 8,
      tip: "Specify the exact COM-B component being targeted",
    },
    {
      label: "Implementation guidance",
      passed: (intervention.implementation_guidance?.length ?? 0) > 40,
      tip: "Provide operational implementation detail (≥2 sentences)",
    },
    {
      label: "BCW category valid",
      passed: BCW_CATEGORIES.has(intervention.bcw_category ?? ""),
      tip: "BCW category must be one of the 9 standard categories",
    },
  ];

  const score = checks.filter((c) => c.passed).length;
  const level: ValidityLevel =
    score === 4 ? "excellent" : score === 3 ? "good" : score === 2 ? "fair" : "weak";

  return { score, level, checks };
}

export function scoreAllInterventions(
  interventions: InterventionOpportunity[]
): ValidityResult[] {
  return interventions.map(scoreIntervention);
}
