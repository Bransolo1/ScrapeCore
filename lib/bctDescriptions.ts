/**
 * Plain-language descriptions for BCT Taxonomy v1 (BCTTv1) techniques
 * used in this platform's system prompt.
 */
export const BCT_DESCRIPTIONS: Record<string, string> = {
  // Education
  "Information about health consequences":
    "Provides facts about how the behaviour affects health outcomes to raise knowledge and motivation.",
  "Salience of consequences":
    "Makes consequences more vivid or personally relevant — e.g., images, stories — to heighten their behavioural impact.",

  // Persuasion
  "Verbal persuasion about capability":
    "Uses encouragement and reassurance to build confidence that the person can perform the behaviour.",
  "Pros and cons":
    "Prompts the person to weigh benefits against costs of changing behaviour, making trade-offs explicit.",
  "Anticipated regret":
    "Asks the person to imagine how they would feel if they failed to act, converting future regret into present motivation.",
  "Social comparison":
    "Provides information about how the person's behaviour compares to peers to prompt reflection.",
  "Normative feedback on behaviour":
    "Gives feedback showing how behaviour compares to a social norm — e.g., 'Most people your age exercise 3× a week'.",

  // Incentivisation
  "Material reward (behaviour)":
    "Provides a tangible reward (money, vouchers, goods) contingent on performing the target behaviour.",
  "Non-specific reward":
    "Delivers praise or positive feedback for performing the behaviour without specifying a material reward.",
  "Self-incentive":
    "Prompts the person to plan their own reward contingent on performing the target behaviour.",

  // Coercion
  "Behaviour contract (penalty)":
    "Creates a written commitment specifying a negative consequence if the person fails to meet a behavioural goal.",
  "Future punishment":
    "Informs the person of a negative consequence that will follow non-performance of the behaviour.",

  // Training
  "Instruction on how to perform the behaviour":
    "Provides step-by-step guidance on performing the behaviour, addressing capability gaps directly.",
  "Behavioural practice/rehearsal":
    "Creates opportunities to practise the behaviour repeatedly, building skill and reducing effort.",
  "Graded tasks":
    "Sets increasingly difficult tasks building towards the target behaviour, reducing early barriers and building self-efficacy.",
  "Habit formation":
    "Prompts the person to perform the behaviour in the same context repeatedly to build automaticity.",

  // Restriction
  "Restructuring the physical environment (restriction)":
    "Changes the environment to make an unwanted behaviour harder — e.g., removing unhealthy foods from a canteen.",
  "Reduce exposure to cues for the behaviour":
    "Removes or avoids environmental cues that trigger unwanted behaviours.",

  // Environmental restructuring
  "Prompts/cues":
    "Introduces reminders or triggers into the environment to prompt the desired behaviour at the right moment.",
  "Implementation intentions":
    "Prompts the person to form a specific 'if-then' plan linking a situational cue to a behavioural response.",
  "Restructuring the physical environment (adding support)":
    "Changes the physical environment to make desired behaviour easier or more accessible.",
  "Adding objects to environment":
    "Introduces tools, equipment, or aids into the environment that directly facilitate the behaviour.",
  "Restructuring the social environment":
    "Changes the social context — group membership, norms, relationships — to support the target behaviour.",

  // Modelling
  "Demonstration by credible other":
    "Shows the behaviour being performed successfully by a credible role model to build confidence and motivation.",
  "Vicarious consequences":
    "Shows others being rewarded or penalised for a behaviour to influence the person's own motivation through observation.",

  // Enablement
  "Problem solving":
    "Helps the person analyse barriers to the behaviour and generate strategies to overcome them.",
  "Action planning":
    "Prompts detailed planning of when, where, and how the behaviour will be performed — specificity increases follow-through.",
  "Goal setting (behaviour)":
    "Encourages the person to commit to a specific behavioural goal to guide and sustain effort.",
  "Goal setting (outcome)":
    "Encourages the person to commit to a specific outcome goal linked to the behaviour.",
  "Self-monitoring of behaviour":
    "Prompts the person to track their own behaviour to increase awareness and enable self-regulation.",
  "Feedback on behaviour":
    "Provides information about the person's behaviour relative to a goal or baseline to enable adjustment.",
  "Social support (practical)":
    "Enlists or provides practical help from others — childcare, transport, reminders — that remove structural barriers.",
  "Social support (emotional)":
    "Provides or arranges encouragement and empathy from others to maintain motivation under difficulty.",
  "Reduce negative emotions":
    "Teaches strategies to manage anxiety, stress, or shame that act as barriers to the behaviour.",
};

/** Returns the description for a BCT, or a generic fallback. */
export function describeBCT(name: string): string {
  return BCT_DESCRIPTIONS[name] ?? "A behaviour change technique from BCT Taxonomy v1 (Michie et al. 2013).";
}
