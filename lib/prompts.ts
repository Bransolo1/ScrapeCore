import type { DataType } from "./types";

export const PROMPT_VERSION = "v2.1";

// ─── System prompt ───────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are a world-class behavioural scientist and qualitative research analyst embedded in an enterprise insight platform.

Your role is to transform unstructured text data into rigorously grounded behavioural insights using evidence-based frameworks. You serve analysts, insight leads, behaviour change practitioners, and public health strategists who need traceable, auditable outputs — not black box summaries.

FRAMEWORKS YOU USE:
- COM-B model (Capability, Opportunity, Motivation → Behaviour) as primary analytical lens
- Behaviour Change Wheel (BCW) for intervention category mapping
- BCT Taxonomy v1 (Michie et al. 2013) for specific technique recommendations
- Emotional valence analysis to capture the affective dimension of behaviours
- Mixed methods principles for evidence grading

YOUR ANALYTICAL PRINCIPLES:
1. Free text is not just sentiment — it contains rich behavioural signals about capability, opportunity, and motivation
2. Always distinguish frequency (how often something appears) from importance (how much it drives behaviour)
3. Separate observed signals from inferences — label them clearly
4. Preserve nuance, contradiction, and subgroup differences — do not flatten complexity
5. Never over-claim causality from text alone
6. Treat outliers as potentially important signals, not noise to discard
7. Be honest about what the data cannot tell you
8. Capture emotional valence — HOW people feel about behaviours, barriers, and motivators matters for intervention design
9. Distinguish FACILITATORS (structural/environmental enablers already in place) from MOTIVATORS (internal drives)
10. Document BEHAVIOURAL CONTEXT — where, when, with whom, and under what conditions the behaviour occurs

CONFIDENCE GRADING RUBRIC:
- HIGH: Signal appears in 3+ independent text units with consistent framing AND a clear causal or behavioural link is evident
- MEDIUM: Signal appears in 2 text units, OR once but with strong emphasis or elaboration
- LOW: Single mention, unclear or contested framing, or inference with limited direct evidence

EMOTIONAL VALENCE GUIDE:
- positive: People feel good, motivated, relieved, proud, or hopeful about this
- negative: People feel anxious, ashamed, frustrated, burdened, or reluctant
- ambivalent: Mixed feelings — both positive and negative coexist
- neutral: No clear affective signal

FACILITATOR vs MOTIVATOR DISTINCTION:
- Motivator: Internal push — a desire, belief, habit, goal, or emotional drive the person has
- Facilitator: External scaffold — a tool, person, institution, environment, or resource that makes the behaviour easier

CONTRADICTION HANDLING: Capture genuinely opposing evidence in the contradictions array.
SUBGROUP ANALYSIS: Capture meaningful differences in subgroup_insights.
EVIDENCE STANDARDS: Every claim must be traceable to specific text via source_text.

BCT REFERENCE (BCTTv1):
Education → Information about health consequences · Salience of consequences
Persuasion → Verbal persuasion about capability · Pros and cons · Anticipated regret · Social comparison · Normative feedback on behaviour
Incentivisation → Material reward (behaviour) · Non-specific reward · Self-incentive
Coercion → Behaviour contract (penalty) · Future punishment
Training → Instruction on how to perform the behaviour · Behavioural practice/rehearsal · Graded tasks · Habit formation
Restriction → Restructuring the physical environment (restriction) · Reduce exposure to cues for the behaviour
Environmental restructuring → Prompts/cues · Implementation intentions · Restructuring the physical environment (adding support) · Adding objects to environment · Restructuring the social environment
Modelling → Demonstration by credible other · Vicarious consequences
Enablement → Problem solving · Action planning · Goal setting (behaviour) · Goal setting (outcome) · Self-monitoring of behaviour · Feedback on behaviour · Social support (practical) · Social support (emotional) · Reduce negative emotions`;

// ─── Competitor reverse-engineering system prompt suffix ──────────────────────

export const COMPETITOR_PROMPT_SUFFIX = `

COMPETITOR ANALYSIS MODE:
You are reverse-engineering a competitor's implied behaviour change strategy from publicly available signals (reviews, messaging, UX copy). Your goal is to infer:
- What target behaviours they are driving in their users
- What COM-B levers they are primarily pulling
- What BCW intervention categories their product embodies
- What barriers they have deliberately designed around (and which they have ignored)
- Where their strategy has gaps that represent opportunities

Frame all findings as strategic intelligence. Acknowledge inference limitations — you are reading the strategy from external signals, not internal documents.`;

// ─── User prompt ─────────────────────────────────────────────────────────────

export function buildUserPrompt(
  text: string,
  dataType: DataType,
  projectContext?: string
): string {
  const dataTypeLabel: Record<string, string> = {
    free_text: "free text data",
    survey: "open-ended survey responses",
    reviews: "customer or user reviews",
    social: "social media or community posts",
    interviews: "interview transcripts or notes",
    competitor: "competitor intelligence signals (reviews, messaging, UX signals)",
  };

  const label = dataTypeLabel[dataType] ?? "qualitative data";
  const contextBlock = projectContext?.trim()
    ? `\nPROJECT CONTEXT (use this to focus your analysis):\n${projectContext.trim()}\n`
    : "";

  return `Analyse the following ${label} using the COM-B behavioural science framework.
${contextBlock}
---
INPUT DATA:
${text.trim()}
---

Return ONLY a valid JSON object — no markdown, no preamble. Use this exact structure:

{
  "summary": "2-3 sentence executive summary",
  "data_type_detected": "brief description of what this data appears to be",
  "text_units_analysed": <integer>,
  "behavioural_context": {
    "setting": "Where does this behaviour primarily occur?",
    "triggers": ["What initiates or prompts this behaviour?"],
    "temporal_pattern": "When and how often does this behaviour occur?",
    "social_context": "Is this behaviour social or individual?",
    "routine_vs_deliberate": "routine|deliberate|mixed|unknown"
  },
  "key_behaviours": [
    {
      "behaviour": "Specific behaviour being performed or avoided",
      "frequency": "high|medium|low",
      "importance": "high|medium|low",
      "emotional_valence": "positive|negative|ambivalent|neutral",
      "source_text": "most representative verbatim or close-paraphrase quote",
      "evidence": ["quote 1", "quote 2"]
    }
  ],
  "com_b_mapping": {
    "capability": { "physical": [], "psychological": [] },
    "opportunity": { "physical": [], "social": [] },
    "motivation":  { "reflective": [], "automatic": [] }
  },
  "barriers": [
    {
      "barrier": "Specific barrier description",
      "com_b_type": "capability|opportunity|motivation",
      "severity": "high|medium|low",
      "emotional_valence": "positive|negative|ambivalent|neutral",
      "source_text": "most representative verbatim quote",
      "evidence": ["supporting quote"]
    }
  ],
  "motivators": [
    {
      "motivator": "Specific internal motivator or drive",
      "com_b_type": "capability|opportunity|motivation",
      "strength": "high|medium|low",
      "emotional_valence": "positive|negative|ambivalent|neutral",
      "source_text": "most representative verbatim quote",
      "evidence": ["supporting quote"]
    }
  ],
  "facilitators": [
    {
      "facilitator": "Environmental or structural enabler already in place",
      "type": "environmental|social|institutional|digital|personal",
      "strength": "high|medium|low",
      "source_text": "most representative verbatim quote",
      "evidence": ["supporting quote"]
    }
  ],
  "intervention_opportunities": [
    {
      "intervention": "Specific recommended intervention",
      "bcw_category": "Education|Persuasion|Incentivisation|Coercion|Training|Restriction|Environmental restructuring|Modelling|Enablement",
      "bct_specifics": ["Named BCT from BCTTv1"],
      "priority": "high|medium|low",
      "rationale": "Why this addresses the identified COM-B gap",
      "target_com_b": "Which COM-B component this primarily addresses",
      "implementation_guidance": "1-2 sentences on how to operationalise this"
    }
  ],
  "contradictions": [
    {
      "description": "Nature of the contradiction",
      "evidence_a": "Quote supporting position A",
      "evidence_b": "Quote supporting position B",
      "interpretation": "What this tension means for intervention design"
    }
  ],
  "subgroup_insights": [
    {
      "subgroup": "Description of the apparent subgroup",
      "insight": "What is meaningfully different for this subgroup",
      "com_b_implication": "capability|opportunity|motivation",
      "evidence": ["supporting quote"]
    }
  ],
  "confidence": {
    "overall": "high|medium|low",
    "rationale": "Explicit reason for this confidence score",
    "notes": "Overall assessment of evidence quality",
    "limitations": ["specific limitation"],
    "sample_size_note": "Comment on data volume and diversity"
  },
  "recommended_next_research": ["Specific actionable research recommendation"]
}

REQUIRED FIELDS: emotional_valence on all barriers/motivators/key_behaviours. behavioural_context with all subfields. facilitators array ([] if none). contradictions and subgroup_insights arrays ([] if none).
Do NOT invent quotes. source_text must trace to actual input.`;
}

// ─── Example data ─────────────────────────────────────────────────────────────

export const EXAMPLE_DATA = {
  label: "NHS Diabetes Prevention Survey",
  dataType: "survey" as DataType,
  text: `I know I should exercise more but I just don't have the time with two kids and a full-time job. My GP mentioned the programme but I couldn't take the afternoon sessions off work.

The app is really helpful actually. I use it every morning to log my meals. It's become part of my routine now. I feel more in control.

I tried the group sessions but felt embarrassed being the only man there. Didn't go back after week two.

My wife does all the cooking so it's hard to change what I eat at home. She doesn't really understand why it matters.

Lost 4kg since starting. That's the most I've ever lost. The small goals really work for me - I don't feel overwhelmed.

I wasn't diagnosed, just high risk, so it's hard to take it seriously. It doesn't feel real yet.

The coach was brilliant. She remembered my name and always asked about my dog. That personal touch made all the difference.

I keep forgetting to take my readings. I need something to remind me. The app notifications are turned off by default.

My family all have diabetes so I'm very motivated. I don't want to end up like my dad. This programme is my best chance.

I moved to a new area and had to change GP. The new one doesn't seem to know about the programme. I fell through the cracks.

Portion sizes were the biggest revelation for me. I had no idea I was eating so much. Nobody ever explained this to me before.

The online option was a lifesaver during lockdown but now I prefer face to face. The zoom sessions feel a bit clinical.

I'm 68 and not very good with technology. The app is confusing. My daughter had to set it up for me. I nearly gave up.

Work stress is my biggest trigger. I eat badly when I'm anxious. Understanding that connection has been really useful.

I completed the full programme and I'm proud of that. But I'm worried about what happens next. There's no ongoing support structure.`,
};
