# DubCheck: keep the lesson intact across languages

**Owner:** Guhan Purushothaman · **Status:** functional independent prototype · **Date:** 12 November 2026

## Product decision

Build a creator review workbench that helps a bilingual person find and resolve possible meaning changes in educational dubs. Ship a narrow, explainable comparison before introducing general AI translation scoring or automatic rewriting.

The initial user is an educational creator or editor with an original transcript, a translated transcript and access to a bilingual reviewer. Their job is: **“Before I release another language, help me check that it teaches the same thing, and tell my audio producer exactly what needs to change.”** This user/job definition is a hypothesis, not the result of completed interviews.

YouTube already provides manual dub review and transcript preview. It also acknowledges translation limitations. DubCheck's contribution is the evidence queue and decision trail inside that workflow. [Primary-source research](RESEARCH.md)

## A concrete before and after

An original says **24 participants**. The dub says **48**. A chronological listen may catch it, but the reviewer has to remember the original figure and find the corresponding point in the other track.

DubCheck pairs the passages, shows both timestamps and the detected quantities, and asks for a decision. The reviewer corrects the script, identifies themselves and explains why. The original text is preserved. The handoff tells the producer what to re-record; it never pretends the audio has already changed. If the dub transcript is revised, the old correction stops applying until it is checked again.

This is an authored demonstration, not a measured incident in a real creator's channel.

## Priorities and acceptance criteria

| Priority | Requirement | Acceptance evidence |
|---|---|---|
| P0 | Every source and target cue remains inspectable | Tests cover split/merged captions, orphans, offsets and manual pairing |
| P0 | Review evidence must be concrete | Exact source/dub text, time ranges, detected values and rule explanations |
| P0 | Human decisions control the handoff | No preselected verdict; names/reasons required; unchanged “corrections” rejected |
| P0 | Revised evidence cannot reuse old approval silently | Exact basis comparison; stale corrections excluded from exported scripts |
| P0 | Export must not imply corrected audio | Draft/transcript-reviewed status, remaining coverage, explicit recording step |
| P0 | Work should survive normal interruptions | Browser persistence, JSON backup/restore, storage warnings and cross-tab protection |
| P1 | Creator vocabulary must be configurable | Terms, acceptable variants and names; changes invalidate prior decisions |
| P1 | Real listening must be possible | Local audio/video, original/dub timestamp seeking, no uploads |
| P1 | Review should work across layouts | Keyboard controls, accessible names, mobile queue, automated accessibility checks |
| Later | Broad semantic comparisons and ASR | Requires model evaluation, consent, cost design and bilingual ground truth first |

## What was deliberately left out

- YouTube authentication, scraping and automatic track replacement: no unsupported integration promise.
- New dubbing generation: it does not address the selected review problem.
- A single “quality score”: partial rules cannot justify a global correctness claim.
- Automatic fixes: convincing mistranslations are precisely where a wrong suggested correction can be dangerous.
- Audience-growth or watch-time dashboards: YouTube already offers language-level analysis, and this project has no creator analytics dataset.
- Shared cloud accounts: not needed to validate the core solo-editor/reviewer workflow; export supports a manual handoff.

## Alternatives considered

| Alternative | Advantage | Tradeoff | Decision |
|---|---|---|---|
| Review in Studio, in time order | Existing tool, actual audio, no export setup | No contribution from this prototype to evidence prioritization or portable review provenance | Baseline for the prospective study |
| Spreadsheet of paired captions | Flexible, familiar, easy to share | Manual pairing and revision bookkeeping; no built-in invariants | Export CSV for interoperability, improve the comparison workflow |
| Generic LLM “translation quality” score | Broad semantic coverage in principle | Calibration, hallucinated explanations, privacy, cost and unsupported certainty | Defer; do not disguise an untested model call as validation |
| Automatic dub rewriting | Fast when right | Audio/script mismatch; wrong fixes; unauthorized integration assumptions | Exclude from v1 |
| Explainable checks plus full human review | Auditable, deterministic, works locally | Limited grammar/semantics; false flags; bilingual reviewer still necessary | Build and measure honestly |

## Important product judgments

1. **A flag is a review candidate, not an error label.** Equivalent positive/negative phrasing may trigger polarity rules. Language-specific morphology can defeat exact terminology matching.
2. **Zero flags is not an approval.** The progress denominator includes every passage. This helps counter automation bias and incomplete rule coverage.
3. **No default verdict.** The user must explicitly select preserved/correction/second opinion. The sample's incorrect first caption is not silently preselected as acceptable.
4. **Pairing uncertainty precedes meaning checks.** Otherwise a timing problem can masquerade as a mistranslation. Orphans and broad/weak overlaps are surfaced.
5. **Corrections remain tied to their source evidence.** Changing a transcript or glossary makes prior assumptions visible rather than silently inheriting them.
6. **A completed transcript review is not a publish-ready dub.** Audio attestation is recorded separately; corrected scripts need recording and a final listen.

## Measurement and launch decision

The reproducible authored evaluation compares rule-based triage against a raw-digit baseline and reviewing everything. It explicitly includes five missed semantic changes and four false flags. Those are informative engineering examples, not a user study or language-quality benchmark. [Results](../evaluation/results/REPORT.md)

**Prototype release:** ship as an independent local tool with sample data, limitations and validated workflow behavior.

**Creator beta:** contingent on the bilingual study, setup interviews and error adjudication described in [EVALUATION.md](EVALUATION.md). Primary success would be lower review time per minute of content **at non-inferior meaning-error detection**, not more flags, more clicks or a better demo.

## A realistic follow-on project

If this were a team project, the PM would align engineering on pairing/revision integrity, UX on evidence comprehension and reviewer fatigue, localization specialists on error annotation, creator partnerships on recruitment and media rights, and privacy/security reviewers on any future upload/model feature. These are proposed responsibilities; no such cross-functional team collaboration is claimed for this solo prototype.

Progression: validate workflow access → annotate bilingual data → compare review methods → improve the largest observed error class → consider an opt-in semantic model only if the added recall justifies false alarms, latency, privacy and cost.
