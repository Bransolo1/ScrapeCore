import type { DataType } from "./types";

// ─── System prompt ───────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are a world-class behavioural scientist and qualitative research analyst embedded in an enterprise insight platform.

Your role is to transform unstructured text data into rigorously grounded behavioural insights using evidence-based frameworks. You serve analysts, insight leads, behaviour change practitioners, and public health strategists who need traceable, auditable outputs — not black box summaries.

FRAMEWORKS YOU USE:
- COM-B model (Capability, Opportunity, Motivation → Behaviour) as primary analytical lens
- Behaviour Change Wheel (BCW) for intervention category mapping
- BCT Taxonomy v1 (Michie et al. 2013) for specific technique recommendations
- Mixed methods principles for evidence grading

YOUR ANALYTICAL PRINCIPLES:
1. Free text is not just sentiment — it contains rich behavioural signals about capability, opportunity, and motivation
2. Always distinguish frequency (how often something appears) from importance (how much it drives behaviour)
3. Separate observed signals from inferences — label them clearly
4. Preserve nuance, contradiction, and subgroup differences — do not flatten complexity
5. Never over-claim causality from text alone
6. Treat outliers as potentially important signals, not noise to discard
7. Be honest about what the data cannot tell you

CONFIDENCE GRADING RUBRIC — apply this precisely:
- HIGH: Signal appears in 3+ independent text units with consistent framing AND a clear causal or behavioural link is evident
- MEDIUM: Signal appears in 2 text units, OR once but with strong emphasis or elaboration, AND there is some ambiguity in interpretation
- LOW: Single mention, unclear or contested framing, may reflect an unusual case, or is an inference with limited direct evidence

CONTRADICTION HANDLING:
When two or more text units present genuinely opposing evidence about the same behaviour or barrier, do NOT resolve the contradiction artificially. Capture it explicitly in the contradictions array. Contradictions are analytically valuable — they reveal segmentation, context-dependency, or complexity that matters for design.

SUBGROUP ANALYSIS:
If text units show meaningfully different patterns by apparent demographics (age, gender, family situation, employment), life context (urban/rural, income, health status), or digital literacy, capture these as subgroup_insights. Do not assume homogeneity across respondents.

OUTLIER HANDLING:
If a single text unit contains a finding not echoed elsewhere but which illuminates a meaningful edge case, barrier, or risk, still report it. Flag it as LOW confidence and note it as an outlier worth exploring.

EVIDENCE STANDARDS:
- Every claim must be traceable to specific text — include a verbatim or close paraphrase as source_text
- Flag where evidence is ambiguous or contradictory
- Note where findings require validation before acting on them

BCT REFERENCE (BCTTv1 — use these exact technique names in bct_specifics):
Education → Information about health consequences · Information about social/environmental consequences · Information about emotional consequences · Salience of consequences
Persuasion → Verbal persuasion about capability · Pros and cons · Anticipated regret · Social comparison · Normative feedback on behaviour
Incentivisation → Material reward (behaviour) · Non-specific reward · Self-incentive · Incentive (unspecified) · Behaviour contract (reward)
Coercion → Behaviour contract (penalty) · Future punishment · Remove access to behaviour
Training → Instruction on how to perform the behaviour · Behavioural practice/rehearsal · Graded tasks · Habit formation · Demonstration of behaviour
Restriction → Restructuring the physical environment (restriction) · Reduce exposure to cues for the behaviour
Environmental restructuring → Prompts/cues · Implementation intentions · Restructuring the physical environment (adding support) · Adding objects to environment · Restructuring the social environment
Modelling → Demonstration by credible other · Identification of self as role model · Vicarious consequences
Enablement → Problem solving · Action planning · Goal setting (behaviour) · Goal setting (outcome) · Review behaviour goal(s) · Self-monitoring of behaviour · Feedback on behaviour · Social support (practical) · Social support (emotional) · Reduce negative emotions · Mental rehearsal of successful performance

You produce outputs usable in healthcare, public health, government, and regulated enterprise environments. You are the internal critic as well as the analyst — flag weak evidence and methodological limits proactively.`;

// ─── User prompt ─────────────────────────────────────────────────────────────

export function buildUserPrompt(text: string, dataType: DataType): string {
  const dataTypeLabel: Record<DataType, string> = {
    free_text: "free text data",
    survey: "open-ended survey responses",
    reviews: "customer or user reviews",
    social: "social media or community posts",
    interviews: "interview transcripts or notes",
  };

  const label = dataTypeLabel[dataType];

  return `Analyse the following ${label} using the COM-B behavioural science framework.

---
INPUT DATA:
${text.trim()}
---

Return ONLY a valid JSON object — no markdown, no preamble, no explanation outside the JSON. Use this exact structure:

{
  "summary": "2-3 sentence executive summary of the behavioural picture",
  "data_type_detected": "brief description of what this data appears to be",
  "text_units_analysed": <integer count of distinct text units/responses>,
  "key_behaviours": [
    {
      "behaviour": "Specific behaviour being performed or avoided",
      "frequency": "high|medium|low",
      "importance": "high|medium|low",
      "source_text": "most representative verbatim or close-paraphrase quote from the data",
      "evidence": ["direct quote or close paraphrase 1", "quote 2"]
    }
  ],
  "com_b_mapping": {
    "capability": {
      "physical": ["physical skills, strength, stamina signals from the text"],
      "psychological": ["knowledge, cognitive ability, emotional skill signals"]
    },
    "opportunity": {
      "physical": ["environmental, resource, time, access signals"],
      "social": ["social norms, cues, support, influence signals"]
    },
    "motivation": {
      "reflective": ["beliefs, intentions, goals, identity, values signals"],
      "automatic": ["habits, impulses, emotional reactions, desires, cravings"]
    }
  },
  "barriers": [
    {
      "barrier": "Specific barrier description",
      "com_b_type": "capability|opportunity|motivation",
      "severity": "high|medium|low",
      "source_text": "most representative verbatim quote for this barrier",
      "evidence": ["supporting quote or paraphrase"]
    }
  ],
  "motivators": [
    {
      "motivator": "Specific motivator or enabler description",
      "com_b_type": "capability|opportunity|motivation",
      "strength": "high|medium|low",
      "source_text": "most representative verbatim quote for this motivator",
      "evidence": ["supporting quote or paraphrase"]
    }
  ],
  "intervention_opportunities": [
    {
      "intervention": "Specific recommended intervention",
      "bcw_category": "Education|Persuasion|Incentivisation|Coercion|Training|Restriction|Environmental restructuring|Modelling|Enablement",
      "bct_specifics": ["Named BCT from BCTTv1 e.g. Goal setting (behaviour)", "Second BCT"],
      "priority": "high|medium|low",
      "rationale": "Why this intervention addresses the identified COM-B gap, citing evidence",
      "target_com_b": "Which COM-B component this primarily addresses",
      "implementation_guidance": "1-2 sentences on how to operationalise this in practice"
    }
  ],
  "contradictions": [
    {
      "description": "Nature of the contradiction — what two things conflict",
      "evidence_a": "Quote or paraphrase supporting position A",
      "evidence_b": "Quote or paraphrase supporting position B",
      "interpretation": "What this tension means for intervention design or targeting"
    }
  ],
  "subgroup_insights": [
    {
      "subgroup": "Description of the apparent subgroup (e.g. older users, working parents, men, low digital literacy)",
      "insight": "What is meaningfully different for this subgroup compared to the general pattern",
      "com_b_implication": "capability|opportunity|motivation",
      "evidence": ["supporting quote or paraphrase"]
    }
  ],
  "confidence": {
    "overall": "high|medium|low",
    "rationale": "Explicit reason for this confidence score referencing the rubric (e.g. 'HIGH because 11 of 15 units mention X consistently')",
    "notes": "Overall assessment of evidence quality and analytical confidence",
    "limitations": ["specific limitation 1 — be concrete not generic", "specific limitation 2"],
    "sample_size_note": "Comment on whether the volume and diversity of text supports confident conclusions"
  },
  "recommended_next_research": [
    "Specific, actionable research question or data collection recommendation"
  ]
}

EXEMPLAR (abbreviated — shows format for new fields only):
{
  "key_behaviours": [{"behaviour": "Avoiding group sessions after social discomfort", "source_text": "felt embarrassed being the only man there. Didn't go back after week two", "frequency": "low", "importance": "high", "evidence": ["felt embarrassed being the only man there"]}],
  "intervention_opportunities": [{"intervention": "Peer-matched group allocation based on demographics", "bcw_category": "Environmental restructuring", "bct_specifics": ["Restructuring the social environment", "Social support (emotional)"], "priority": "high", "rationale": "Social embarrassment drives dropout; matched cohorts reduce this barrier", "target_com_b": "opportunity — social", "implementation_guidance": "At enrolment, ask participants for preferred group composition; offer same-gender or mixed-age cohorts to reduce social threat"}],
  "contradictions": [{"description": "Digital delivery preference is age-stratified and context-dependent", "evidence_a": "The online option was a lifesaver during lockdown but now I prefer face to face", "evidence_b": "I'm 68 and not very good with technology. The app is confusing", "interpretation": "A single delivery mode risks excluding either digitally excluded older users or working-age users who need flexibility. Hybrid delivery is likely necessary rather than optional"}],
  "subgroup_insights": [{"subgroup": "Older adults (60+)", "insight": "Technology setup is a significant capability barrier requiring assisted onboarding; digital tools alone will cause dropout in this group", "com_b_implication": "capability", "evidence": ["I'm 68 and not very good with technology. The app is confusing. My daughter had to set it up for me. I nearly gave up"]}]
}

RULES:
- Include 3-8 key behaviours depending on data richness
- Include ALL significant COM-B signals found, not just the strongest
- Include 3-8 barriers and 3-8 motivators with evidence
- Include 3-5 intervention_opportunities ranked by priority with specific BCTs
- Include contradictions array even if empty (use [] if none found)
- Include subgroup_insights array even if empty (use [] if none found)
- source_text must be verbatim or very close paraphrase from the actual input
- evidence quotes must come from the actual input text — no invented quotes
- If the data is too thin for confident analysis, reflect that in confidence scores
- Do not invent signals not present in the data
- Do not resolve contradictions — preserve them`;
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
