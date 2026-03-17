import { appendFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const LOG_PATH = join(process.cwd(), "prompt_eval_log.md");

interface EvalLogEntry {
  date: string;
  promptVersion: string;
  rubricGrade: string;
  rubricTotal: number;
  groundingScore: number;
  dataType: string;
  wordCount: number;
  analysisId: string;
}

const HEADER = `# Prompt Eval Log

Auto-populated by ScrapeCore after each analysis. One row per analysis saved.

| Date | Prompt Version | Rubric Grade | Rubric /50 | Grounding % | Data Type | Word Count | Analysis ID |
|------|---------------|--------------|-----------|-------------|-----------|------------|-------------|
`;

export function appendEvalLog(entry: EvalLogEntry): void {
  try {
    if (!existsSync(LOG_PATH)) {
      writeFileSync(LOG_PATH, HEADER, "utf8");
    }
    const row = `| ${entry.date} | ${entry.promptVersion} | ${entry.rubricGrade} | ${entry.rubricTotal} | ${entry.groundingScore}% | ${entry.dataType} | ${entry.wordCount} | ${entry.analysisId} |\n`;
    appendFileSync(LOG_PATH, row, "utf8");
  } catch {
    // Non-critical — silently skip if file system is read-only (e.g. Vercel)
  }
}
