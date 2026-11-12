# Architecture and operating limits

## Runtime

A static React/TypeScript app built with Vite and hosted on GitHub Pages. Domain logic has no React or network dependency. All computation, transcript text and optional media stay in the browser. Fonts are bundled. No service worker, backend, OAuth token, model provider, API key or application telemetry is involved.

The hosting provider still receives normal requests for application assets and may log those requests under its own policies. “No uploads” means the application does not send transcript/media/reviewer content to a server; it does not mean browsing a public website is network-free. Local storage is unencrypted and browser/device access grants access to the workspace.

## Data flow

```text
SRT / WebVTT → validate, strip caption formatting, preserve text/timing
             → sorted original + target tracks
             → overlap graph + explicit manual groups
             → paired passages and orphan passages
             → quantity / negation / terminology candidates
             → reviewer decision bound to exact evidence
             → current corrections + coverage + production handoff
```

### Caption handling

`src/domain/captions.ts` accepts a plain-transcript subset of SRT and WebVTT. It supports optional cue identifiers, hours/minutes timestamps, CRLF, UTF-8 BOMs, common entities, multiline text, notes and timing settings. Styling, speaker markup and positioning are stripped with warnings; timestamps and spoken text are retained. Inequalities such as `x < 5 and y > 2` are not treated as tags. Segmented WebVTT timestamp maps are rejected, because treating them as full-media timestamps could pair unrelated speech.

Text is rendered through React, never `dangerouslySetInnerHTML`. Exports escape literal angle brackets and ampersands. This is not a lossless subtitle-style editor and does not claim full WebVTT conformance. [Format basis](https://www.w3.org/TR/webvtt1/)

### Alignment

Source/target cues form a bipartite graph. A positive overlap covering at least **35% of the shorter cue** creates an edge; connected components form review passages. Source and dub cue numbers are not treated as matching identifiers. The threshold is a transparent heuristic, not a learned semantic model.

The dub offset is subtracted from target timestamps for matching. Original target timestamps are retained for media playback and exports. Coverage is the union of intersecting time intervals divided by the larger covered duration. Below **65%** overlap, or more than **4 cues on either side**, the automatic grouping is marked for pairing review. These initial thresholds need empirical tuning on permitted creator data.

Manual groups are disjoint, explicitly selected sets of source and target cue IDs. They take precedence; remaining cues are automatically grouped. Every source/target cue remains in one group, including unmatched cues. Orphans are never silently discarded. Timing overlap is not proof of equivalent meaning; broad or wrong alignments can mask errors even if overlap is high.

### Checks

- Digits: ASCII, Devanagari and Tamil. Decimal points; signed values; international and Indian comma grouping; bounded finite values. Ambiguous comma decimals produce a review cue rather than a guess.
- Word numbers: English 0–99; Hindi 0–20 with a few spelling variants; Tamil 0–10 plus common attributive forms for 1/2. This is not general linguistic number parsing. Compositional forms outside that vocabulary may be only partially detected and can produce false flags.
- Units: selected time, mass, length and volume units; percentages; INR and USD. Equivalent units are normalized. Currency values are not converted using exchange rates. Temperature, fractions, lakh/crore words, complex compound units and all grammatical inflections are not generally supported.
- Comparison: multisets of normalized value/dimension pairs. Order changes are tolerated, but incorrect entity–quantity bindings can be missed.
- Negation: explicit lexicons, a bounded Tamil negative-suffix rule and an English not-only exception. Lexical antonyms, scope, double negation and broad grammar are not resolved.
- Glossary: whole-phrase presence of creator-defined source terms and acceptable target variants, with Unicode-aware boundaries. It can flag names only when the creator supplies them; there is no automatic entity-recognition claim.

Priority is a deterministic queue ordering, not a calibrated probability: alignment 6 points, high-priority quantity/polarity 4, medium terminology/format 2. Multiple flags add. The queue can instead be sorted by time. All passages remain part of review completion.

### Decisions and revisions

Each decision stores reviewer, reason, status, optional corrected text, timestamp, audio-check attestation and the **full exact basis**: original/target cues, languages, offset, glossary and manual-pairing state. A navigation hash is not used as proof of evidence equality. Only a decision with an exactly matching basis is current. Changes to shared settings invalidate all affected comparisons; unrelated cue-text edits can leave other decisions current.

Accepted means the reviewer judged meaning preserved; correction means a changed script was recorded; uncertain remains outstanding. No default verdict is selected. The application does not independently verify reviewer identity, language proficiency, whether audio was actually heard, or whether a proposed correction is good. JSON backups are portable, editable records, not cryptographically signed audit evidence.

### Persistence and recovery

One workspace per origin uses `localStorage` under `dubcheck.workspace.v1`. Each edit is validated before saving. The previous serialized value is compared before writing; storage events surface changes from other tabs. A conflict pauses automatic persistence until the user loads the saved copy or explicitly replaces it. Local storage cannot provide a cross-process transactional lock; this mitigates normal sequential tab conflicts, not simultaneous-write atomicity guarantees.

Storage exceptions leave the current workspace in memory with a visible export warning. Invalid stored JSON is retained for download and not automatically overwritten. Versioned backup restore rejects unknown fields, duplicate IDs, invalid timing, inconsistent current corrections and reused manual links. Media object URLs are never serialized, and are released when files change. Reattach media after a reload.

## Bounds

| Item | Limit |
|---|---:|
| Each caption file | 2 MB UTF-8 |
| Each track | 1,000 cues, 500,000 text characters, 4 hours |
| Each cue | 4,000 characters |
| Global offset | ±600 seconds |
| Glossary | 100 terms, 12 variants each |
| Review history | 2,000 events |
| Formatted workspace backup | 8 MB; new edits exceeding it are refused |
| Each attached local media file | 500 MB |

Browser storage quotas may be smaller than the backup limit. Visible save failures require downloading a backup; the app does not claim durable cloud storage. Worst-case overlap graph construction is quadratic in source/target cue count. The 1,000-cue limits bound that cost; the evaluation includes a scale smoke test. Large overlapping groups can still increase review effort and audit-snapshot size.

## Handoff integrity

- Only saved, current correction decisions modify exported target text.
- Text changes do not change original target cue timings.
- SRT/VTT filenames identify `draft` or `transcript-reviewed`; neither means audio-approved.
- Markdown includes original evidence, notes, outstanding work and audio status.
- CSV quotes cells and prefixes potentially executable formula starts, including leading whitespace, with an apostrophe.
- JSON retains original transcripts, configuration and review history. It contains reviewer names; users control sharing.

## Deployment

The production build uses relative asset URLs for GitHub Pages. A restrictive content-security meta policy permits bundled assets and local blob media; Vite's inline development preamble is accommodated only in development by removing that meta policy. CI runs unit tests, the authored evaluation, TypeScript, production build and browser tests before Pages deployment. Automated accessibility checks cover the main view and dialogs; manual assistive-technology and non-Chromium checks remain future validation.
