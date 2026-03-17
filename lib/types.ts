export type Confidence = "high" | "medium" | "low";
export type Priority = "high" | "medium" | "low";
export type DataType = "free_text" | "survey" | "reviews" | "social" | "interviews";

export interface EvidenceQuote {
  quote: string;
  source_index?: number;
}

export interface KeyBehaviour {
  behaviour: string;
  frequency: Confidence;
  importance: Confidence;
  source_text: string; // most representative verbatim quote
  evidence: string[];
}

export interface ComBDimension {
  physical?: string[];
  psychological?: string[];
  social?: string[];
  reflective?: string[];
  automatic?: string[];
}

export interface ComBMapping {
  capability: {
    physical: string[];
    psychological: string[];
  };
  opportunity: {
    physical: string[];
    social: string[];
  };
  motivation: {
    reflective: string[];
    automatic: string[];
  };
}

export interface Barrier {
  barrier: string;
  com_b_type: "capability" | "opportunity" | "motivation";
  severity: Confidence;
  source_text: string; // most representative verbatim quote
  evidence: string[];
}

export interface Motivator {
  motivator: string;
  com_b_type: "capability" | "opportunity" | "motivation";
  strength: Confidence;
  source_text: string; // most representative verbatim quote
  evidence: string[];
}

export interface InterventionOpportunity {
  intervention: string;
  bcw_category: string;
  bct_specifics: string[]; // Named BCTs from BCTTv1 (e.g. "Goal setting (behaviour)", "Action planning")
  priority: Priority;
  rationale: string;
  target_com_b: string;
  implementation_guidance: string; // 1-2 sentence operational note
}

export interface ContradictoryFinding {
  description: string; // nature of the contradiction
  evidence_a: string; // quote/paraphrase supporting side A
  evidence_b: string; // quote/paraphrase supporting side B
  interpretation: string; // what this tension means for intervention design
}

export interface SubgroupInsight {
  subgroup: string; // apparent group (e.g. "older users", "working parents", "men")
  insight: string; // what differs for this subgroup
  com_b_implication: "capability" | "opportunity" | "motivation";
  evidence: string[];
}

export interface ConfidenceAssessment {
  overall: Confidence;
  rationale: string; // explicit reason for the confidence score
  notes: string;
  limitations: string[];
  sample_size_note: string;
}

export interface BehaviourAnalysis {
  summary: string;
  data_type_detected: string;
  text_units_analysed: number;
  key_behaviours: KeyBehaviour[];
  com_b_mapping: ComBMapping;
  barriers: Barrier[];
  motivators: Motivator[];
  intervention_opportunities: InterventionOpportunity[];
  contradictions: ContradictoryFinding[];
  subgroup_insights: SubgroupInsight[];
  confidence: ConfidenceAssessment;
  recommended_next_research: string[];
}

export interface AnalysisState {
  status: "idle" | "streaming" | "complete" | "error";
  streamingText: string;
  analysis: BehaviourAnalysis | null;
  error: string | null;
  durationMs: number | null;
  savedId?: string | null;  // DB id once persisted — used for review panel
}
