# Research: what exists, what is inferred, what remains unproven

Reviewed **12 November 2026**. Primary sources only. Product documentation changes; the conclusions below are dated observations, not claims about Google's future roadmap.

## Evidence ledger

| Source | Observed fact | Consequence for this prototype | What it does not prove |
|---|---|---|---|
| [YouTube Help: automatic dubbing](https://support.google.com/youtube/answer/15569972?hl=en) | YouTube documents possible speech recognition and translation issues, including proper nouns, idioms and jargon. Manual review and desktop transcript review already exist. Automatic dubs cannot be directly edited. | Build evidence prioritization inside a creator review workflow. Produce a script/recording handoff; avoid a fake “edit YouTube dub” button. | It does not quantify how often educational dubs lose meaning or demonstrate demand for this particular tool. |
| [YouTube Blog: auto dubbing explained, 15 May 2026](https://blog.youtube/creator-and-artist-stories/youtube-auto-dubbing-explained/) | An interview with Auto-Dubbing PM Buddhika Kottahachchi discusses improving quality and creator controls. Audio-track performance analysis already exists in Studio. | Choose a quality-review workflow, not another audio-language analytics dashboard. | A public PM interview is not an internal roadmap or a commitment to this proposal. |
| [YouTube Help: multi-language features](https://support.google.com/youtube/answer/13338784?hl=en) | Eligible creators can upload their own dub audio. An existing automatic dub must be removed before a creator-supplied track in that language is uploaded. | Treat corrected scripts as input to a separate audio-production and Studio workflow. | Subtitle text alone does not alter spoken audio; not every creator has identical feature access. |
| [Freitag et al., TACL 2021: Experts, Errors, and Context](https://aclanthology.org/2021.tacl-1.87/) | The authors evaluate translation using explicit error analysis, professional translators and document context; evaluation procedure affects conclusions. | Plan independent bilingual annotation with context and adjudication. Keep author-labelled fixtures separate from quality claims. | This paper did not study DubCheck, Hindi/Tamil YouTube dubs or the proposed UI. It is methodological support, not validation of our detector. |
| [W3C WebVTT specification](https://www.w3.org/TR/webvtt1/) | Cues have timestamps and text; cue intervals can overlap and optional identifiers need not represent cross-language correspondence. | Align by timing and surface uncertainty. Do not equate cue index with semantic alignment. Explicitly document the supported plain-transcript subset. | A shared timestamp does not establish equivalent meaning. |
| [Google APM, University Graduate, 2027](https://www.google.com/about/careers/applications/jobs/results/101007950268506822-associate-product-manager-university-graduate-2027-start) | The role covers understanding users, launching features, testing and iteration; technical work, entrepreneurship and communication matter. | Include a shipped implementation, product decisions, measurable evaluation and a realistic research plan. | A portfolio project cannot substitute for every stated qualification or establish recruiter preferences. |

## The actual opportunity

**Inference:** a creator reviewing a long educational dub may benefit from a queue that directs attention to plausible changes in factual meaning and preserves the reasoning behind corrections. This is supported as a problem hypothesis by the documented failure modes, but has not been validated through interviews or usage.

**Not an identified missing feature:** basic auto dubbing, a manual-publish setting, transcript preview, language switching, and audio-language analytics. These already exist in YouTube. DubCheck must earn its place through better review focus and traceability.

**Not a claim of novelty:** subtitle editors, QA rules and localization glossaries exist elsewhere. This prototype combines bounded semantic-risk checks, pairing repair, review provenance and a creator handoff for the specific educational-dub workflow. No exhaustive competitive-market novelty claim is made.

## Why this creator segment

Education and practical explainers depend on preserved quantities, qualifications and terminology. The cost of an apparently fluent but wrong passage is therefore more consequential than cosmetic style differences. This prioritization is a product judgment, not a measured frequency ranking. Guhan's consumer-education and illustrated-explanation work offers relevant domain familiarity; no follower analytics, retention study or user testimonial is imported into this project.

Hindi and Tamil provide a manageable initial scope relevant to that creator context. They also expose real engineering challenges: non-Latin scripts, number words, morphology and split captions. Support is narrow and documented, rather than advertising general fluency across languages.

## Assumptions requiring validation

1. Creators can legally obtain matching original/dub transcripts and media for their own content without excessive setup effort.
2. They have a bilingual reviewer or can access one. A monolingual creator must not treat this tool as an oracle.
3. Review prioritization saves effort without reducing attention to unflagged passages.
4. A script/report handoff fits an actual dubbing producer's workflow.
5. False flags remain low enough to preserve trust across topics and language styles.

The [evaluation protocol](EVALUATION.md) describes how these assumptions would be tested. None has been marked “validated” by the authored fixture results.
