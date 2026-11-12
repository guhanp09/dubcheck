# Google APM alignment: claims with inspectable evidence

The [2027 graduate APM posting](https://www.google.com/about/careers/applications/jobs/results/101007950268506822-associate-product-manager-university-graduate-2027-start) describes user/market understanding, feature delivery, performance testing and iteration. It also values technical experience, entrepreneurial initiative and clear communication. The mapping below is a portfolio interpretation of the public posting; it is not an internal Google assessment rubric.

| Relevant skill | Evidence in this project | Boundary on the claim |
|---|---|---|
| Identify a real product problem | [Primary-source ledger](RESEARCH.md) separates existing Studio capabilities from the inferred review opportunity | Desk research completed; user interviews not completed |
| Prioritize and define scope | [Product brief](PRODUCT_BRIEF.md) includes requirements, alternatives and explicit exclusions | Independent product judgment, not an approved Google roadmap |
| Technical fluency | Typed caption pipeline, Unicode/unit normalization, overlap graph, schema validation, revision binding and static deployment | AI-assisted implementation; no claim to have trained an ML model |
| Applied AI product judgment | Evaluation of meaning risks in AI-generated dubbing workflows; cautious human decision and model-scope design | No live provider integration or independent machine-translation benchmark |
| Analytical evaluation | [36-case comparison](../evaluation/results/REPORT.md), language slices, false flags, blind spots and planned control condition | Author-labelled illustrative fixtures; not production precision/recall or causal business impact |
| Iteration and quality | Unit/browser tests plus observed fixes for explicit verdict selection, stale corrections, caption math and accessible labels | Automated checks do not establish broad accessibility or usability validation |
| Launch execution | Running public tool, repository, CI, examples, recovery and handoff | Functional prototype; no users, revenue or partnerships claimed |
| Communication | Concise case study, limitations, demo script and stakeholder/launch plan | Proposed cross-functional responsibilities, not a fabricated team history |

## Suggested portfolio description

**DubCheck — Meaning-preserving review for educational dubs.** Built an English/Hindi/Tamil transcript-review workbench around documented YouTube dubbing limitations, with timestamp alignment, quantity/polarity/glossary checks, human decisions and revision-safe correction handoffs. Defined product requirements and launch metrics; evaluated 36 authored cases against two baselines and documented false alarms and semantic blind spots.

Use the actual release verification for test counts. Do not replace “authored cases” with “real users,” “YouTube benchmarks” or “production accuracy.” Do not claim the product is part of YouTube, has access to internal APIs, or meets every qualification in the job listing.

## Interview-ready decisions

- Why evidence triage instead of more dubbing generation? The selected gap concerns review quality; generation and manual publishing already exist.
- Why keep unflagged passages in the denominator? Limited checks can miss role/causal changes; fewer flags is not equivalent to correctness.
- Why not automatically rewrite the dub? It risks compounding an error and does not solve the audio-production boundary.
- What would invalidate the product hypothesis? Setup overhead dominating review savings, severe missed errors increasing, unavailable bilingual review, or no useful producer handoff.
- What should be built next? Decide from independently annotated errors and observed workflow friction, not from whichever model API is newest.
