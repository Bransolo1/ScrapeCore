export type Confidence = "high" | "medium" | "low";
export type Priority = "high" | "medium" | "low";
export type DataType = "free_text" | "survey" | "reviews" | "social" | "interviews" | "competitor";
export type EmotionalValence = "positive" | "negative" | "ambivalent" | "neutral";

export interface EvidenceQuote {
  quote: string;
  source_index?: number;
}

export interface KeyBehaviour {
  behaviour: string;
  frequency: Confidence;
  importance: Confidence;
  source_text: string;
  evidence: string[];
  emotional_valence?: EmotionalValence;   // new: how people feel about this behaviour
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
  source_text: string;
  evidence: string[];
  emotional_valence?: EmotionalValence;   // new: emotional tone of this barrier
}

export interface Motivator {
  motivator: string;
  com_b_type: "capability" | "opportunity" | "motivation";
  strength: Confidence;
  source_text: string;
  evidence: string[];
  emotional_valence?: EmotionalValence;   // new: emotional tone of this motivator
}

// NEW — environmental/structural enablers distinct from motivational motivators
export interface Facilitator {
  facilitator: string;
  type: "environmental" | "social" | "institutional" | "digital" | "personal";
  strength: Confidence;
  source_text: string;
  evidence: string[];
}

// NEW — where, when, and how the behaviour occurs
export interface BehaviouralContext {
  setting: string;                                                        // physical/digital context
  triggers: string[];                                                     // prompts that initiate behaviour
  temporal_pattern: string;                                               // frequency / time-of-day / routine
  social_context: string;                                                 // individual vs social, who is present
  routine_vs_deliberate: "routine" | "deliberate" | "mixed" | "unknown"; // habitual vs intentional
}

export interface InterventionOpportunity {
  intervention: string;
  bcw_category: string;
  bct_specifics: string[];
  priority: Priority;
  rationale: string;
  target_com_b: string;
  implementation_guidance: string;
}

export interface ContradictoryFinding {
  description: string;
  evidence_a: string;
  evidence_b: string;
  interpretation: string;
}

export interface SubgroupInsight {
  subgroup: string;
  insight: string;
  com_b_implication: "capability" | "opportunity" | "motivation";
  evidence: string[];
}

export interface ConfidenceAssessment {
  overall: Confidence;
  rationale: string;
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
  facilitators?: Facilitator[];            // new — environmental/structural enablers
  behavioural_context?: BehaviouralContext; // new — setting, triggers, temporality
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
  savedId?: string | null;
}
