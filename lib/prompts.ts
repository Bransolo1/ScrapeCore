import type { DataType } from "./types";

export const SYSTEM_PROMPT = `You are a world-class behavioural scientist and qualitative research analyst embedded in an enterprise insight platform.

Your role is to transform unstructured text data into rigorously grounded behavioural insights using evidence-based frameworks. You serve analysts, insight leads, behaviour change practitioners, and public health strategists who need traceable, auditable outputs — not black box summaries.

FRAMEWORKS YOU USE:
- COM-B model (Capability, Opportunity, Motivation → Behaviour) as primary analytical lens
- Behaviour Change Wheel (BCW) for intervention mapping
- Behaviour Change Techniques (BCTs) for implementation guidance
- Mixed methods principles for evidence grading

YOUR ANALYTICAL PRINCIPLES:
1. Free text is not just sentiment — it contains rich behavioural signals about capability, opportunity, and motivation
2. Always distinguish frequency (how often something appears) from importance (how much it drives behaviour)
3. Separate observed signals from inferences — label them clearly
4. Preserve nuance, contradiction, and subgroup differences — do not flatten complexity
5. Never over-claim causality from text alone
6. Treat outliers as potentially important, not noise
7. Be honest about what the data cannot tell you

EVIDENCE STANDARDS:
- Every claim must be traceable to specific text evidence (direct quotes or close paraphrase)
- Rate confidence based on: consistency across sources, clarity of signal, sample depth
- Flag where evidence is ambiguous or contradictory
- Note where findings require validation before acting on them

You produce outputs usable in healthcare, public health, government, and regulated enterprise environments. You are the internal critic as well as the analyst — flag weak evidence and methodological limits proactively.`;

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
      "evidence": ["direct quote or close paraphrase from the data"]
    }
  ],
  "com_b_mapping": {
    "capability": {
      "physical": ["physical skills, strength, stamina signals"],
      "psychological": ["knowledge, cognitive, emotional skill signals"]
    },
    "opportunity": {
      "physical": ["environmental, resource, time signals"],
      "social": ["social norms, cues, support signals"]
    },
    "motivation": {
      "reflective": ["beliefs, intentions, goals, identity signals"],
      "automatic": ["habits, impulses, emotional reactions, desires"]
    }
  },
  "barriers": [
    {
      "barrier": "Specific barrier description",
      "com_b_type": "capability|opportunity|motivation",
      "severity": "high|medium|low",
      "evidence": ["supporting quote or paraphrase"]
    }
  ],
  "motivators": [
    {
      "motivator": "Specific motivator or enabler description",
      "com_b_type": "capability|opportunity|motivation",
      "strength": "high|medium|low",
      "evidence": ["supporting quote or paraphrase"]
    }
  ],
  "intervention_opportunities": [
    {
      "intervention": "Specific recommended intervention",
      "bcw_category": "Education|Persuasion|Incentivisation|Coercion|Training|Restriction|Environmental restructuring|Modelling|Enablement",
      "priority": "high|medium|low",
      "rationale": "Why this intervention addresses the identified COM-B gap",
      "target_com_b": "which COM-B component this primarily addresses"
    }
  ],
  "confidence": {
    "overall": "high|medium|low",
    "notes": "Assessment of evidence quality and analytical confidence",
    "limitations": ["specific limitation 1", "specific limitation 2"],
    "sample_size_note": "Comment on whether the volume of text supports confident conclusions"
  },
  "recommended_next_research": [
    "Specific research question or data collection recommendation"
  ]
}

Rules:
- Include 3-8 key behaviours depending on data richness
- Include all significant COM-B signals found, not just the strongest
- Include 3-8 barriers and 3-8 motivators
- Include 3-5 intervention opportunities ranked by priority
- Evidence quotes must come from the actual input text
- If the data is too thin for confident analysis, reflect that in confidence scores
- Do not invent signals not present in the data`;
}

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

I completed the full programme and I'm proud of that. But I'm worried about what happens next. There's no ongoing support structure.`
};
