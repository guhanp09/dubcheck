# Evaluation: separating software correctness from translation quality

## Completed evidence

1. **Unit/integration tests:** caption safety and round trips; supported number/unit equivalence; polarity and glossary behavior; complete cue coverage; stale-review invalidation; export integrity; local persistence failure modes.
2. **Browser workflows:** import → compare → correct → save → reload → export → restore; transcript revisions, manual pairing, local media seeking, conflict recovery and responsive/accessibility checks.
3. **Authored fixture comparison:** 36 fixed examples, including intended errors, acceptable conversions/paraphrases and deliberately retained blind spots. All are visible in [cases.ts](../evaluation/cases.ts); regenerate with `npm run evaluate`.

The fixture labels and translations were authored with AI assistance. They have not been independently bilingual-annotated, are not held out and may contain linguistic imperfections. The engineering tests establish that implemented rules behave as specified. They do not establish that the rules reliably detect real-world translation mistakes.

The [generated report](../evaluation/results/REPORT.md) gives exact counts, baselines, language slices, false flags and misses. We do not present its precision/recall as production accuracy. The raw-digit baseline ignores units and script normalization; it is a simple lower-complexity comparator, not a state-of-the-art translation-quality baseline.

## Known misses that remain visible

- A teacher/student role reversal without quantities, explicit negation or declared terminology.
- “Increased” becoming “decreased” while the same percentage remains.
- Two quantities assigned to the wrong entities while their multiset is unchanged.
- “May” becoming a certainty without an explicit supported cue.
- Unsupported comparative or morphological constructions.

Known false flags include lexical negation (“not possible” → “impossible”), positive paraphrases of negative instructions, unsupported number words and ambiguous decimal-comma notation. A reviewer can record a reasoned acceptance. The check does not silently learn that every similar phrase is safe.

## Proposed bilingual quality study — not yet run

**Stage 1: verify access and workflow.** Interview 5–8 educational creators/editors. Ask them to demonstrate how they obtain a dub transcript, who verifies it, how corrections reach the audio producer and what happens after a new version. Track setup completion and failure reasons. Do not lead with the prototype as the assumed solution.

**Stage 2: build an independently annotated set.** With creator permission, collect approximately 30 educational clips split across English→Hindi and English→Tamil, several topics and speaking styles. Keep naturally occurring errors separate from controlled seeded edits. Retain original/dub audio, neighboring context and provenance; remove personal data. Two qualified bilingual reviewers independently annotate each pair, with a third adjudicating disagreements. Classify accuracy errors separately from style, pronunciation, delivery and pairing problems. Record severity and spans. Include no-error clips. Freeze a held-out subset before tuning.

The use of professional bilingual judgment, explicit error analysis and context is informed by [Freitag et al., 2021](https://aclanthology.org/2021.tacl-1.87/); this proposed protocol is not a reproduction of that study or a claim of MQM certification.

**Stage 3: test the workflow.** Use a counterbalanced within-reviewer comparison of chronological review and DubCheck-assisted review on different matched clips. Reviewers must still inspect the full clip. Avoid giving the same clip twice to a reviewer. Start with a small formative sample; determine a confirmatory sample size from observed variance and a predefined effect/non-inferiority margin. Do not claim significance from an arbitrary pilot size.

## Metrics and guardrails

| Measure | Definition | Why it matters |
|---|---|---|
| Review time per content minute | Active review time / clip duration; report setup time separately | Measures actual work rather than UI interaction counts |
| Meaning-error recall | Adjudicated accuracy errors found / all adjudicated accuracy errors, by severity | Time savings must not come from skipping important mistakes |
| Flag precision | Flagged passages containing an adjudicated actionable issue / flagged passages | Excess false alarms consume attention |
| Unflagged miss rate | Missed meaning errors in unflagged passages / relevant annotated errors | Tests automation bias and rule blind spots |
| Pairing repair rate | Passages needing manual pairing / all passages | Validates whether timestamps are a usable starting point |
| Audio/script discrepancy | Reviewer corrections contradicted by the actual audio / corrections | A transcript can itself be wrong |
| Successful producer handoff | Producer can locate, understand and implement correction without follow-up / handed-off issues | Tests the output's usefulness |
| Re-review integrity | Stale decisions applied to a new revision | Must remain zero in deterministic regression tests |

Report language/topic slices, distributions, confidence intervals and disagreements. Do not pool away a poorly performing language. A proposed telemetry event schema is below, but the released app does not send telemetry.

```text
review_started       { workspace_id, pair, cue_count, consent_id }
pairing_corrected    { passage_id, original_group_size, new_group_size }
decision_recorded    { passage_id, decision, risk_kinds, elapsed_active_ms }
handoff_exported     { format, reviewed_count, outstanding_count }
```

A future consented study should use pseudonymous IDs; transcript text, reviewer names and audio do not belong in routine telemetry. Consent, retention and deletion procedures would be specified before collecting anything.

## Prospective launch gates — targets, not results

- Two independent bilingual reviewers sign off on the evaluation set and demo translations.
- The confidence interval for assisted-review accuracy excludes a material degradation; choose the non-inferiority margin before the confirmatory study.
- Median review time improves by at least 20% after separating import/setup overhead, without worse severe-error recall. This is a proposed product threshold, not an achieved saving.
- Reviewers can explain why a flag fired and understand that unflagged passages remain unchecked.
- No stale-correction application or lost-cue regression; no critical accessibility, data-loss or transcript-upload issue.
- Creator/producer handoff is demonstrated on permitted, real content.

If speed improves but error detection worsens, do not expand distribution. Improve review coverage and presentation before adding more automation. If transcript acquisition dominates effort, revisit the product workflow rather than optimizing the detector in isolation.
