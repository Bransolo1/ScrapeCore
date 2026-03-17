/**
 * Plain Language Mode — Sprint 3.3
 * Maps COM-B jargon terms to plain-English equivalents for non-expert audiences.
 */

export const PLAIN_TERMS: Record<string, string> = {
  // COM-B top-level
  Capability: "Skills & Knowledge",
  Opportunity: "Environment & Context",
  Motivation: "Desire & Habit",

  // COM-B sub-dimensions
  "Physical capability":    "Physical ability",
  "Psychological capability": "Mental skills",
  "Physical opportunity":   "Physical surroundings",
  "Social opportunity":     "Social influence",
  "Reflective motivation":  "Conscious goals",
  "Automatic motivation":   "Instincts & habits",

  // Short labels used in column groups
  Physical:      "Physical",
  Psychological: "Mental",
  Social:        "Social",
  Reflective:    "Goals",
  Automatic:     "Habits",

  // COM-B type badges on barriers/motivators
  capability:  "skills",
  opportunity: "environment",
  motivation:  "desire",

  // BCW intervention categories
  Education:                     "Teaching & informing",
  Persuasion:                    "Encouraging & nudging",
  Incentivisation:               "Rewards & incentives",
  Coercion:                      "Rules & penalties",
  Training:                      "Practice & coaching",
  Restriction:                   "Limiting choices",
  "Environmental restructuring": "Redesigning the environment",
  Modelling:                     "Showing examples",
  Enablement:                    "Removing obstacles",
};

/**
 * Returns the plain-language equivalent if plain mode is active,
 * otherwise returns the original term unchanged.
 */
export function plainify(term: string, isPlainMode: boolean): string {
  if (!isPlainMode) return term;
  return PLAIN_TERMS[term] ?? term;
}
