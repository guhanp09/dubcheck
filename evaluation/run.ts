import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { cases } from "./cases";
import { checkMeaning } from "../src/domain/checks";
import { analyze } from "../src/domain/alignment";
import { createDemo } from "../src/data/demo";

const results = cases.map((c) => {
  const risks = checkMeaning(
    c.source,
    c.target,
    "en",
    c.language,
    c.glossary || [],
  );
  const digitOnly = (s: string) => (s.match(/\d+/g) || []).sort().join("|");
  return {
    ...c,
    kinds: risks.map((r) => r.kind),
    dubcheck: risks.length > 0,
    digitMismatch: digitOnly(c.source) !== digitOnly(c.target),
    reviewAll: true,
  };
});
function metrics(
  key: "dubcheck" | "digitMismatch" | "reviewAll",
  subset = results,
) {
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  for (const r of subset) {
    if (r[key] && r.authoredMeaningError) tp++;
    else if (r[key]) fp++;
    else if (r.authoredMeaningError) fn++;
    else tn++;
  }
  return {
    tp,
    fp,
    fn,
    tn,
    precision: tp / (tp + fp) || 0,
    recall: tp / (tp + fn) || 0,
    flagged: tp + fp,
    total: subset.length,
  };
}
const summary = {
  cases: results.length,
  provenance:
    "Authored, author-labelled illustrative fixtures. Not held out; no independent bilingual annotation. These numbers are not real-world translation accuracy or reviewer time savings.",
  baselines: {
    dubcheck: metrics("dubcheck"),
    digitMismatch: metrics("digitMismatch"),
    reviewAll: metrics("reviewAll"),
  },
  languageSlices: Object.fromEntries(
    ["hi", "ta"].map((language) => [
      language,
      metrics(
        "dubcheck",
        results.filter((r) => r.language === language),
      ),
    ]),
  ),
  blindSpots: results
    .filter((r) => r.authoredMeaningError && !r.dubcheck)
    .map((r) => ({ id: r.id, note: r.note })),
  falsePositives: results
    .filter((r) => !r.authoredMeaningError && r.dubcheck)
    .map((r) => ({ id: r.id, note: r.note })),
  results,
};
const regressions = results.filter((r) => r.dubcheck !== r.expectedFlag);
mkdirSync("evaluation/results", { recursive: true });
writeFileSync(
  "evaluation/results/latest.json",
  JSON.stringify(summary, null, 2) + "\n",
);
const percent = (x: number) => `${(x * 100).toFixed(1)}%`;
const report = `# Authored fixture evaluation\n\n${summary.provenance}\n\n${results.length} cases: ${results.filter((r) => r.authoredMeaningError).length} intended meaning errors and ${results.filter((r) => !r.authoredMeaningError).length} intended acceptable translations.\n\n| Method | True flags | False flags | Missed errors | Precision | Recall | Flagged / total |\n|---|---:|---:|---:|---:|---:|---:|\n${Object.entries(
  summary.baselines,
)
  .map(
    ([name, m]) =>
      `| ${name} | ${m.tp} | ${m.fp} | ${m.fn} | ${percent(m.precision)} | ${percent(m.recall)} | ${m.flagged}/${m.total} |`,
  )
  .join(
    "\n",
  )}\n\nThe review-all baseline means every passage is selected for review; its precision is simply the error prevalence in this fixture set. These are triage predictions, not a recommendation to skip unflagged passages. All passages remain in the product's mandatory review coverage.\n\n## Language slices (DubCheck)\n\n${Object.entries(
  summary.languageSlices,
)
  .map(
    ([l, m]) =>
      `- ${l}: ${m.total} fixtures; precision ${percent(m.precision)}, recall ${percent(m.recall)}.`,
  )
  .join(
    "\n",
  )}\n\n## Known misses\n\n${summary.blindSpots.map((r) => `- ${r.id}: ${r.note}`).join("\n")}\n\n## Known false positives\n\n${summary.falsePositives.map((r) => `- ${r.id}: ${r.note}`).join("\n")}\n\n## Interpretation\n\nNumbers are descriptive of these hand-authored examples only. The language sets are small and uneven; no statistical generalization is warranted. Flags can be caused by unsupported vocabulary, valid paraphrases and ambiguity. No source audio, real YouTube output or independent reviewer was used. See [the evaluation protocol](../../docs/EVALUATION.md) for the prospective bilingual study and launch criteria.\n`;
writeFileSync("evaluation/results/REPORT.md", report);
const p = createDemo();
p.source.cues = Array.from({ length: 1000 }, (_, i) => ({
  id: `c${i}`,
  startMs: i * 4000,
  endMs: i * 4000 + 3500,
  text: `The sample contains ${i + 1} people.`,
}));
p.target.cues = p.source.cues.map((c, i) => ({
  ...c,
  text: `नमूने में ${i + 1} लोग हैं।`,
}));
const start = performance.now();
const groups = analyze(p);
const elapsed = performance.now() - start;
console.log(
  JSON.stringify(
    {
      authoredCases: results.length,
      regressions: regressions.map((r) => r.id),
      baselines: summary.baselines,
      scaleSmoke: {
        sourceCues: 1000,
        targetCues: 1000,
        groups: groups.length,
        elapsedMs: Math.round(elapsed),
        note: "One local runtime observation, not an SLA or a cross-device benchmark.",
      },
    },
    null,
    2,
  ),
);
if (regressions.length || groups.length !== 1000) process.exitCode = 1;
