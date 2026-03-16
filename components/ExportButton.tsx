"use client";

import type { BehaviourAnalysis } from "@/lib/types";

interface ExportButtonProps {
  analysis: BehaviourAnalysis;
  inputText: string;
}

export default function ExportButton({ analysis, inputText }: ExportButtonProps) {
  const exportJSON = () => {
    const blob = new Blob(
      [JSON.stringify({ analysis, metadata: { exportedAt: new Date().toISOString(), inputLength: inputText.length } }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `behaviour-analysis-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    const lines: string[] = [
      `# Behavioural Analysis Report`,
      `*Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}*`,
      ``,
      `## Summary`,
      analysis.summary,
      ``,
      `**Data type:** ${analysis.data_type_detected}  `,
      `**Text units analysed:** ${analysis.text_units_analysed}  `,
      `**Overall confidence:** ${analysis.confidence.overall}`,
      ``,
      `## Key Behaviours`,
      ...analysis.key_behaviours.map((b) =>
        `- **${b.behaviour}** (frequency: ${b.frequency}, importance: ${b.importance})\n${b.source_text ? `  > "${b.source_text}"\n` : ""}  ${b.evidence[0] ?? ""}`
      ),
      ``,
      `## COM-B Mapping`,
      `### Capability`,
      `**Physical:** ${analysis.com_b_mapping.capability.physical.join("; ") || "None identified"}`,
      `**Psychological:** ${analysis.com_b_mapping.capability.psychological.join("; ") || "None identified"}`,
      `### Opportunity`,
      `**Physical:** ${analysis.com_b_mapping.opportunity.physical.join("; ") || "None identified"}`,
      `**Social:** ${analysis.com_b_mapping.opportunity.social.join("; ") || "None identified"}`,
      `### Motivation`,
      `**Reflective:** ${analysis.com_b_mapping.motivation.reflective.join("; ") || "None identified"}`,
      `**Automatic:** ${analysis.com_b_mapping.motivation.automatic.join("; ") || "None identified"}`,
      ``,
      `## Barriers`,
      ...analysis.barriers.map((b) =>
        `- **[${b.severity.toUpperCase()}]** ${b.barrier} *(${b.com_b_type})*${b.source_text ? `\n  > "${b.source_text}"` : ""}`
      ),
      ``,
      `## Motivators`,
      ...analysis.motivators.map((m) =>
        `- **[${m.strength.toUpperCase()}]** ${m.motivator} *(${m.com_b_type})*${m.source_text ? `\n  > "${m.source_text}"` : ""}`
      ),
      ``,
      `## Intervention Opportunities`,
      ...analysis.intervention_opportunities.map((item, i) =>
        [
          `${i + 1}. **${item.intervention}** — ${item.bcw_category} [${item.priority}]`,
          `   ${item.rationale}`,
          item.bct_specifics?.length ? `   *BCTs: ${item.bct_specifics.join(", ")}*` : "",
          item.implementation_guidance ? `   ${item.implementation_guidance}` : "",
        ].filter(Boolean).join("\n")
      ),
      ``,
      ...(analysis.contradictions?.length ? [
        `## Contradictions & Tensions`,
        ...analysis.contradictions.map((c) =>
          `**${c.description}**\n- A: "${c.evidence_a}"\n- B: "${c.evidence_b}"\n- *${c.interpretation}*`
        ),
        ``,
      ] : []),
      ...(analysis.subgroup_insights?.length ? [
        `## Subgroup Insights`,
        ...analysis.subgroup_insights.map((sg) =>
          `- **${sg.subgroup}** (${sg.com_b_implication}): ${sg.insight}`
        ),
        ``,
      ] : []),
      `## Confidence & Limitations`,
      `**Overall:** ${analysis.confidence.overall}`,
      ...(analysis.confidence.rationale ? [`**Rationale:** ${analysis.confidence.rationale}`, ``] : [``]),
      analysis.confidence.notes,
      ``,
      `**Limitations:**`,
      ...analysis.confidence.limitations.map((l) => `- ${l}`),
      ``,
      `## Recommended Next Research`,
      ...analysis.recommended_next_research.map((r) => `- ${r}`),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `behaviour-analysis-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium">Export:</span>
      <button
        onClick={exportMarkdown}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Markdown report
      </button>
      <button
        onClick={exportJSON}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        JSON data
      </button>
    </div>
  );
}
