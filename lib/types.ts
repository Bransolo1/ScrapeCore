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
  evidence: string[];
}

export interface Motivator {
  motivator: string;
  com_b_type: "capability" | "opportunity" | "motivation";
  strength: Confidence;
  evidence: string[];
}

export interface InterventionOpportunity {
  intervention: string;
  bcw_category: string;
  priority: Priority;
  rationale: string;
  target_com_b: string;
}

export interface ConfidenceAssessment {
  overall: Confidence;
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
  confidence: ConfidenceAssessment;
  recommended_next_research: string[];
}

export interface AnalysisState {
  status: "idle" | "streaming" | "complete" | "error";
  streamingText: string;
  analysis: BehaviourAnalysis | null;
  error: string | null;
  durationMs: number | null;
}
