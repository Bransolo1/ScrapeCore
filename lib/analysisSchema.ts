import { z } from "zod/v4";

/**
 * Runtime Zod schema for validating Claude's analysis JSON output.
 * This catches malformed/incomplete responses before they hit the DB or UI.
 */

const confidenceLevel = z.enum(["high", "medium", "low"]);
const emotionalValence = z.enum(["positive", "negative", "ambivalent", "neutral"]).optional();

const keyBehaviourSchema = z.object({
  behaviour: z.string(),
  frequency: confidenceLevel,
  importance: confidenceLevel,
  source_text: z.string().default(""),
  evidence: z.array(z.string()).default([]),
  emotional_valence: emotionalValence,
});

const comBMappingSchema = z.object({
  capability: z.object({
    physical: z.array(z.string()).default([]),
    psychological: z.array(z.string()).default([]),
  }),
  opportunity: z.object({
    physical: z.array(z.string()).default([]),
    social: z.array(z.string()).default([]),
  }),
  motivation: z.object({
    reflective: z.array(z.string()).default([]),
    automatic: z.array(z.string()).default([]),
  }),
});

const barrierSchema = z.object({
  barrier: z.string(),
  com_b_type: z.enum(["capability", "opportunity", "motivation"]),
  severity: confidenceLevel,
  source_text: z.string().default(""),
  evidence: z.array(z.string()).default([]),
  emotional_valence: emotionalValence,
});

const motivatorSchema = z.object({
  motivator: z.string(),
  com_b_type: z.enum(["capability", "opportunity", "motivation"]),
  strength: confidenceLevel,
  source_text: z.string().default(""),
  evidence: z.array(z.string()).default([]),
  emotional_valence: emotionalValence,
});

const facilitatorSchema = z.object({
  facilitator: z.string(),
  type: z.enum(["environmental", "social", "institutional", "digital", "personal"]),
  strength: confidenceLevel,
  source_text: z.string().default(""),
  evidence: z.array(z.string()).default([]),
});

const behaviouralContextSchema = z.object({
  setting: z.string(),
  triggers: z.array(z.string()).default([]),
  temporal_pattern: z.string().default(""),
  social_context: z.string().default(""),
  routine_vs_deliberate: z.enum(["routine", "deliberate", "mixed", "unknown"]).default("unknown"),
});

const interventionSchema = z.object({
  intervention: z.string(),
  bcw_category: z.string(),
  bct_specifics: z.array(z.string()).default([]),
  priority: confidenceLevel,
  rationale: z.string().default(""),
  target_com_b: z.string().default(""),
  implementation_guidance: z.string().default(""),
  source_evidence: z.array(z.string()).optional(),
});

const contradictionSchema = z.object({
  description: z.string(),
  evidence_a: z.string().default(""),
  evidence_b: z.string().default(""),
  interpretation: z.string().default(""),
});

const subgroupSchema = z.object({
  subgroup: z.string(),
  insight: z.string(),
  com_b_implication: z.enum(["capability", "opportunity", "motivation"]),
  evidence: z.array(z.string()).default([]),
});

const confidenceSchema = z.object({
  overall: confidenceLevel,
  rationale: z.string().default(""),
  notes: z.string().default(""),
  limitations: z.array(z.string()).default([]),
  sample_size_note: z.string().default(""),
  suitable_for_high_trust_use: z.boolean().default(false),
  high_trust_notes: z.string().optional(),
});

const companyModelSchema = z.object({
  observed_signals: z.array(z.string()).default([]),
  high_confidence_inferences: z.array(z.string()).default([]),
  medium_confidence_inferences: z.array(z.string()).default([]),
  unknowns: z.array(z.string()).default([]),
  strategic_implications: z.array(z.string()).default([]),
  opportunities_to_beat_them: z.array(z.string()).default([]),
});

export const behaviourAnalysisSchema = z.object({
  summary: z.string(),
  data_type_detected: z.string().default("unknown"),
  text_units_analysed: z.number().default(0),
  key_behaviours: z.array(keyBehaviourSchema).default([]),
  com_b_mapping: comBMappingSchema,
  barriers: z.array(barrierSchema).default([]),
  motivators: z.array(motivatorSchema).default([]),
  facilitators: z.array(facilitatorSchema).optional(),
  behavioural_context: behaviouralContextSchema.optional(),
  company_model: companyModelSchema.optional(),
  intervention_opportunities: z.array(interventionSchema).default([]),
  contradictions: z.array(contradictionSchema).default([]),
  subgroup_insights: z.array(subgroupSchema).default([]),
  confidence: confidenceSchema,
  recommended_next_research: z.array(z.string()).default([]),
  clarification_note: z.string().optional(),
});

export type ValidatedAnalysis = z.infer<typeof behaviourAnalysisSchema>;

/**
 * Parse and validate Claude's JSON output. Returns the validated analysis or null.
 * Uses Zod's `.parse()` with defaults to fill in missing optional fields.
 */
export function validateAnalysis(raw: unknown): ValidatedAnalysis | null {
  const result = behaviourAnalysisSchema.safeParse(raw);
  if (result.success) return result.data;

  // Log validation errors for debugging but don't crash
  console.error("[analysis-validation] Schema validation failed:", JSON.stringify(result.error.issues, null, 2).slice(0, 1000));
  return null;
}
