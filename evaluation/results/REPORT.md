# Authored fixture evaluation

Authored, author-labelled illustrative fixtures. Not held out; no independent bilingual annotation. These numbers are not real-world translation accuracy or reviewer time savings.

36 cases: 20 intended meaning errors and 16 intended acceptable translations.

| Method | True flags | False flags | Missed errors | Precision | Recall | Flagged / total |
|---|---:|---:|---:|---:|---:|---:|
| dubcheck | 15 | 4 | 5 | 78.9% | 75.0% | 19/36 |
| digitMismatch | 4 | 8 | 16 | 33.3% | 20.0% | 12/36 |
| reviewAll | 20 | 16 | 0 | 55.6% | 100.0% | 36/36 |

The review-all baseline means every passage is selected for review; its precision is simply the error prevalence in this fixture set. These are triage predictions, not a recommendation to skip unflagged passages. All passages remain in the product's mandatory review coverage.

## Language slices (DubCheck)

- hi: 27 fixtures; precision 71.4%, recall 71.4%.
- ta: 9 fixtures; precision 100.0%, recall 83.3%.

## Known misses

- b01: Agent and recipient reversed; no supported trigger.
- b02: Direction changed without an explicit negation token.
- b03: Same quantity multiset, different entity bindings.
- b04: Uncertainty removed without a trigger.
- b05: Comparative direction reversed.

## Known false positives

- f01: Equivalent lexical negation not in the bounded cue list.
- f02: Negative instruction rephrased positively.
- f03: Hindi word number beyond supported range.
- f04: Intended decimal-comma notation; deliberately abstains instead of guessing.

## Interpretation

Numbers are descriptive of these hand-authored examples only. The language sets are small and uneven; no statistical generalization is warranted. Flags can be caused by unsupported vocabulary, valid paraphrases and ambiguity. No source audio, real YouTube output or independent reviewer was used. See [the evaluation protocol](../../docs/EVALUATION.md) for the prospective bilingual study and launch criteria.
