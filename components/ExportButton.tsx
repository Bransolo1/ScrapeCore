"use client";

import type { BehaviourAnalysis } from "@/lib/types";

interface ExportButtonProps {
  analysis: BehaviourAnalysis;
  inputText: string;
}

export default function ExportButton({ analysis, inputText }: ExportButtonProps) {
  const exportPDF = () => {
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const sections: string[] = [];

    const row = (label: string, val: string) =>
      `<tr><td style="color:#6b7280;font-size:12px;padding:4px 12px 4px 0;vertical-align:top;white-space:nowrap">${label}</td><td style="font-size:13px;padding:4px 0">${val}</td></tr>`;

    const badge = (text: string, color: string) =>
      `<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:${color};margin:2px 4px 2px 0">${text}</span>`;

    sections.push(`
      <table style="margin-bottom:16px">${[
        row("Data type", analysis.data_type_detected),
        row("Units analysed", String(analysis.text_units_analysed)),
        row("Overall confidence", analysis.confidence?.overall ?? "—"),
      ].join("")}</table>
    `);

    if (analysis.key_behaviours?.length) {
      sections.push(`<h2>Key Behaviours</h2><ul>${analysis.key_behaviours.map((b) =>
        `<li><strong>${b.behaviour}</strong> — frequency: ${b.frequency}, importance: ${b.importance}${b.source_text ? `<br><em>"${b.source_text}"</em>` : ""}</li>`
      ).join("")}</ul>`);
    }

    const comB = analysis.com_b_mapping;
    sections.push(`<h2>COM-B Mapping</h2>
      <h3>Capability</h3>
      <p><strong>Physical:</strong> ${comB.capability.physical.join("; ") || "None"}</p>
      <p><strong>Psychological:</strong> ${comB.capability.psychological.join("; ") || "None"}</p>
      <h3>Opportunity</h3>
      <p><strong>Physical:</strong> ${comB.opportunity.physical.join("; ") || "None"}</p>
      <p><strong>Social:</strong> ${comB.opportunity.social.join("; ") || "None"}</p>
      <h3>Motivation</h3>
      <p><strong>Reflective:</strong> ${comB.motivation.reflective.join("; ") || "None"}</p>
      <p><strong>Automatic:</strong> ${comB.motivation.automatic.join("; ") || "None"}</p>`);

    if (analysis.barriers?.length) {
      sections.push(`<h2>Barriers</h2><ul>${analysis.barriers.map((b) =>
        `<li>${badge(b.severity.toUpperCase(), b.severity === "high" ? "#fee2e2" : b.severity === "medium" ? "#fef3c7" : "#f3f4f6")} <strong>${b.barrier}</strong> <em>(${b.com_b_type})</em>${b.source_text ? `<br><span style="color:#6b7280">"${b.source_text}"</span>` : ""}</li>`
      ).join("")}</ul>`);
    }

    if (analysis.motivators?.length) {
      sections.push(`<h2>Motivators</h2><ul>${analysis.motivators.map((m) =>
        `<li>${badge(m.strength.toUpperCase(), "#d1fae5")} <strong>${m.motivator}</strong> <em>(${m.com_b_type})</em></li>`
      ).join("")}</ul>`);
    }

    if (analysis.intervention_opportunities?.length) {
      sections.push(`<h2>Intervention Opportunities</h2><ol>${analysis.intervention_opportunities.map((i) =>
        `<li><strong>${i.intervention}</strong> — ${i.bcw_category} ${badge(i.priority, i.priority === "high" ? "#ede9fe" : "#f3f4f6")}<br>${i.rationale}${i.implementation_guidance ? `<br><em>${i.implementation_guidance}</em>` : ""}</li>`
      ).join("")}</ol>`);
    }

    sections.push(`<h2>Confidence &amp; Limitations</h2>
      <p><strong>Overall:</strong> ${analysis.confidence?.overall} — ${analysis.confidence?.rationale ?? ""}</p>
      ${analysis.confidence?.limitations?.length ? `<ul>${analysis.confidence.limitations.map((l) => `<li>${l}</li>`).join("")}</ul>` : ""}`);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>Behavioural Analysis — ${date}</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;color:#111;max-width:800px;margin:0 auto;padding:32px}
        h1{font-size:22px;margin:0 0 4px}
        .sub{color:#6b7280;font-size:13px;margin:0 0 24px}
        h2{font-size:16px;font-weight:700;margin:28px 0 8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
        h3{font-size:14px;font-weight:600;margin:12px 0 4px;color:#374151}
        ul,ol{padding-left:20px;margin:0 0 8px}
        li{margin-bottom:8px;line-height:1.5}
        em{color:#6b7280}
        @media print{body{padding:0}button{display:none}}
      </style></head>
      <body>
        <h1>Behavioural Analysis Report</h1>
        <p class="sub">Generated ${date} · Powered by ScrapeCore &amp; Claude Opus 4.6</p>
        <p style="margin-bottom:20px">${analysis.summary}</p>
        ${sections.join("\n")}
        <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
      </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); }
  };
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
        onClick={exportPDF}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        title="Open print dialog — choose 'Save as PDF' in your browser"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        PDF
      </button>
      <button
        onClick={exportMarkdown}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Markdown
      </button>
      <button
        onClick={exportJSON}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        JSON
      </button>
    </div>
  );
}
