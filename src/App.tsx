import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Code2,
  Download,
  FileUp,
  Globe2,
  Layers,
  Link2,
  ListFilter,
  LockKeyhole,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { useWorkspace } from "./useWorkspace";
import { createDemo } from "./data/demo";
import { analyze, riskScore } from "./domain/alignment";
import { timestamp } from "./domain/captions";
import {
  currentDecision,
  parseBackup,
  reviewState,
  summarize,
} from "./domain/review";
import {
  LANGUAGES,
  MAX_BACKUP_BYTES,
  type Group,
  type Project,
} from "./domain/types";
import { Modal } from "./components/Modal";
import { ImportDialog } from "./components/ImportDialog";
import { SettingsDialog } from "./components/SettingsDialog";
import { PairDialog } from "./components/PairDialog";
import { ExportDialog, download } from "./components/ExportDialog";
import { ReviewForm } from "./components/ReviewForm";
import { MediaPanel, type MediaHandle } from "./components/MediaPanel";

const REPO = "https://github.com/guhanp09/dubcheck";
const STATES = {
  unreviewed: "To review",
  stale: "Review again",
  accepted: "Meaning preserved",
  correction: "Script corrected",
  uncertain: "Second opinion",
};
type Dialog =
  | "new"
  | "source"
  | "target"
  | "settings"
  | "pair"
  | "export"
  | "about"
  | "samples"
  | "replace-storage"
  | null;

export default function App() {
  const ws = useWorkspace(),
    { project } = ws;
  const groups = useMemo(() => analyze(project), [project]);
  const summary = useMemo(() => summarize(project, groups), [project, groups]);
  const [selectedId, setSelectedId] = useState(groups[0]?.id || "");
  const [filter, setFilter] = useState<
    "all" | "flagged" | "pending" | "reviewed"
  >("all");
  const [sort, setSort] = useState<"priority" | "time">("priority");
  const [search, setSearch] = useState(""),
    [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false),
    [formEpoch, setFormEpoch] = useState(0);
  const originalMedia = useRef<MediaHandle>(null),
    dubMedia = useRef<MediaHandle>(null);
  const onDirty = useCallback((value: boolean) => setDirty(value), []);
  const selected = groups.find((g) => g.id === selectedId) || groups[0];
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty || (!ws.saved && project.decisions.length > 0)) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, ws.saved, project.decisions.length]);
  function proceed() {
    if (!dirty) return true;
    if (
      !window.confirm(
        "Discard the unsaved edits in this passage? Saved decisions will be kept.",
      )
    )
      return false;
    setDirty(false);
    setFormEpoch((n) => n + 1);
    return true;
  }
  function open(next: Dialog) {
    if (next === "export" || next === "about") {
      setDialog(next);
      return;
    }
    if (proceed()) {
      setDirty(false);
      setDialog(next);
    }
  }
  function update(next: Project, message: string) {
    try {
      ws.update(next);
      setDialog(null);
      setDirty(false);
      setNotice(message);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The workspace could not be updated.",
      );
    }
  }
  function choose(group: Group) {
    if (group.id === selected?.id || !proceed()) return;
    setDirty(false);
    setSelectedId(group.id);
  }
  const visible = groups
    .filter((g) => {
      const state = reviewState(project, g),
        done = state === "accepted" || state === "correction";
      const text = [...g.source, ...g.target]
        .map((c) => c.text)
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!search || text.includes(search.toLocaleLowerCase())) &&
        (filter === "all" ||
          (filter === "flagged" && g.risks.length) ||
          (filter === "pending" && !done) ||
          (filter === "reviewed" && done))
      );
    })
    .toSorted((a, b) =>
      sort === "priority"
        ? riskScore(b) - riskScore(a) || a.startMs - b.startMs
        : a.startMs - b.startMs,
    );
  const activeIndex = groups.findIndex((g) => g.id === selected?.id);
  const timelineStart = Math.min(
    Math.max(0, activeIndex - 11),
    Math.max(0, groups.length - 24),
  );
  const timelineGroups = groups.slice(timelineStart, timelineStart + 24);
  async function restore(file?: File) {
    if (!file || !proceed()) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setNotice("Workspace backup must be smaller than 8 MB.");
      return;
    }
    try {
      update(
        parseBackup(await file.text()),
        "Workspace restored. Reattach media if you want to listen.",
      );
      setSelectedId("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The workspace backup could not be read.",
      );
    }
  }
  const seek = (side: "source" | "target", milliseconds: number) => {
    if (
      !(side === "source" ? originalMedia : dubMedia).current?.seek(
        milliseconds / 1000,
      )
    )
      setNotice(
        `Attach ${side === "source" ? "original" : "dub"} media below to listen at ${timestamp(milliseconds)}. The sample contains transcripts only.`,
      );
  };
  return (
    <>
      <a className="skip-link" href="#review-workspace">
        Skip to review
      </a>
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <AudioLines size={24} />
          </span>
          <span>
            dubcheck<span className="brand-dot">.</span>
          </span>
          <span className="workspace-label">CREATOR WORKSPACE</span>
        </div>
        <nav aria-label="Main navigation">
          <button className="text-button" onClick={() => open("about")}>
            <BookOpen size={16} />
            <span>How it works</span>
          </button>
          <a
            className="text-button"
            href={REPO}
            target="_blank"
            rel="noreferrer"
            aria-label="View project"
          >
            <Code2 size={17} />
            <span>View project</span>
          </a>
        </nav>
      </header>
      <main className="app-shell">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              <Globe2 size={14} /> TRANSLATE THE WORDS. KEEP THE MEANING.
            </p>
            <h1>
              Every language.
              <br className="mobile-only" /> The same idea.
            </h1>
            <p className="lede">
              Find what may have changed in a dub. Review the evidence. Make the
              call.
            </p>
          </div>
          <button className="primary import-cta" onClick={() => open("new")}>
            <FileUp size={17} />
            Import transcripts
          </button>
        </div>
        <section className="project-bar" aria-label="Current project">
          <div className="project-identity">
            <span className="episode-art" aria-hidden="true">
              <AudioLines />
            </span>
            <div>
              <div className="project-title">
                <h2>{project.title}</h2>
                {project.sample && (
                  <span className="tag sample-tag">SAMPLE EPISODE</span>
                )}
              </div>
              <p>
                {LANGUAGES[project.source.language]} <ArrowRight size={13} />{" "}
                {LANGUAGES[project.target.language]}
                <span className="dot-sep">·</span>
                {timestamp(
                  Math.max(...project.source.cues.map((c) => c.endMs)),
                )}
                <span className="dot-sep">·</span>
                {groups.length} passages
              </p>
            </div>
          </div>
          <div className="project-actions">
            <button className="text-button" onClick={() => open("samples")}>
              Try a sample
            </button>
            <button className="secondary" onClick={() => open("settings")}>
              <Settings2 size={16} />
              Timing & terms
            </button>
            <button className="secondary" onClick={() => open("export")}>
              <Download size={16} />
              Export handoff
            </button>
          </div>
        </section>
        <div className="status-strip">
          <span>
            <LockKeyhole size={13} />
            {ws.saved
              ? "Saved in this browser"
              : project.sample && !project.decisions.length
                ? "Sample ready · edits save in this browser"
                : "Not saved yet"}
          </span>
          <span>
            {project.sample
              ? "Illustrative transcripts with seeded errors · no sample audio"
              : "Your files stay on this device · no account needed"}
          </span>
          <label className="restore-link">
            <Undo2 size={13} />
            Restore backup
            <input
              aria-label="Restore workspace backup"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void restore(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {ws.warning && (
          <div className="storage-warning" role="alert">
            <TriangleAlert size={18} />
            <div>
              <p>{ws.warning}</p>
              <div className="inline-actions">
                <button
                  onClick={() =>
                    download(
                      JSON.stringify(project, null, 2),
                      "dubcheck-unsaved-workspace.json",
                      "application/json",
                    )
                  }
                >
                  Download this copy
                </button>
                <button
                  onClick={() => {
                    if (proceed()) {
                      ws.loadOther();
                      setDirty(false);
                    }
                  }}
                >
                  Load saved copy
                </button>
                <button onClick={() => setDialog("replace-storage")}>
                  Save this copy here
                </button>
                {ws.unreadableRaw && (
                  <button
                    onClick={() =>
                      download(
                        ws.unreadableRaw!,
                        "dubcheck-recovery.json",
                        "application/json",
                      )
                    }
                  >
                    Download unreadable data
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <div aria-live="polite" className={notice ? "notice" : "sr-only"}>
          {notice}
          {notice && (
            <button
              className="text-button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              Dismiss
            </button>
          )}
        </div>
        <section className="metrics" aria-label="Review progress">
          <div className="metric">
            <span>
              <CircleAlert size={16} />
              Flagged passages
            </span>
            <strong>
              {summary.flagged}
              <small> / {summary.total}</small>
            </strong>
            <p>Candidates for a closer look</p>
          </div>
          <div className="metric">
            <span>
              <ShieldCheck size={16} />
              Reviewed
            </span>
            <strong>
              {summary.reviewed}
              <small> / {summary.total}</small>
            </strong>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Passages reviewed"
              aria-valuenow={summary.reviewed}
              aria-valuemin={0}
              aria-valuemax={summary.total}
            >
              <i
                style={{
                  width: `${(100 * summary.reviewed) / summary.total}%`,
                }}
              />
            </div>
          </div>
          <div className="metric">
            <span>
              <Layers size={16} />
              Script corrections
            </span>
            <strong>{summary.corrections}</strong>
            <p>Ready for the audio producer</p>
          </div>
          <div className="metric next-step">
            <span className="eyebrow">THE FINISH LINE</span>
            <strong>
              {summary.remaining
                ? `${summary.remaining} to go`
                : "Review recorded"}
            </strong>
            <p>Review every passage, including those without flags.</p>
          </div>
        </section>
        <div className="workspace" id="review-workspace">
          <aside className="queue" aria-label="Review queue">
            <div className="queue-heading">
              <h2>Review queue</h2>
              <span>{visible.length}</span>
            </div>
            <label className="search-field">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a word or phrase"
                aria-label="Search passages"
              />
            </label>
            <div className="queue-controls">
              <label>
                <span className="sr-only">Filter passages</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                >
                  <option value="all">All passages</option>
                  <option value="flagged">Flagged</option>
                  <option value="pending">Still to review</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </label>
              <label>
                <ListFilter size={13} />
                <span className="sr-only">Sort passages</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                >
                  <option value="priority">Priority</option>
                  <option value="time">Time</option>
                </select>
              </label>
            </div>
            <div className="queue-list">
              {visible.map((g) => {
                const state = reviewState(project, g),
                  done = ["accepted", "correction"].includes(state);
                return (
                  <button
                    key={g.id}
                    className={`queue-item ${selected.id === g.id ? "active" : ""}`}
                    onClick={() => choose(g)}
                    aria-pressed={selected.id === g.id}
                  >
                    <div className="queue-item-meta">
                      <span>
                        {timestamp(g.startMs)}–{timestamp(g.endMs)}
                      </span>
                      {done ? (
                        <Check size={14} className="success-text" />
                      ) : (
                        <span
                          className={`risk-dot ${g.risks.some((r) => r.severity === "high") ? "high" : g.risks.length ? "medium" : "none"}`}
                        />
                      )}
                    </div>
                    <p>
                      {g.source.map((c) => c.text).join(" ") ||
                        g.target.map((c) => c.text).join(" ")}
                    </p>
                    <small className={state === "stale" ? "stale-text" : ""}>
                      {state !== "unreviewed"
                        ? STATES[state]
                        : g.risks.length
                          ? g.risks[0].kind === "quantity"
                            ? "Quantity mismatch"
                            : g.risks[0].kind === "negation"
                              ? "Possible meaning reversal"
                              : g.risks[0].kind === "glossary"
                                ? "Terminology"
                                : "Pairing / format check"
                          : "No checks triggered"}
                    </small>
                  </button>
                );
              })}
              {!visible.length && (
                <p className="empty-queue">
                  No passages match. Try another filter or search term.
                </p>
              )}
            </div>
            <div className="queue-foot">
              <ShieldCheck size={16} />
              <p>
                A flag is a question.
                <br />
                Your review is the answer.
              </p>
            </div>
          </aside>
          <section className="review-panel" aria-labelledby="passage-title">
            <div className="passage-heading">
              <div>
                <p className="eyebrow">
                  PASSAGE {activeIndex + 1} OF {groups.length}
                </p>
                <h2 id="passage-title">
                  {timestamp(selected.startMs)} <span>—</span>{" "}
                  {timestamp(selected.endMs)}
                </h2>
              </div>
              <div className="passage-status">
                <span
                  className={`state-tag state-${reviewState(project, selected)}`}
                >
                  {STATES[reviewState(project, selected)]}
                </span>
                <div className="passage-nav">
                  <button
                    className="icon-button"
                    aria-label="Previous passage"
                    disabled={activeIndex <= 0}
                    onClick={() => choose(groups[activeIndex - 1])}
                  >
                    <ChevronLeft size={19} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Next passage"
                    disabled={activeIndex >= groups.length - 1}
                    onClick={() => choose(groups[activeIndex + 1])}
                  >
                    <ChevronRight size={19} />
                  </button>
                </div>
              </div>
            </div>
            <div className="passage-map" aria-label="Passage timeline">
              {timelineGroups.map((g) => (
                <button
                  key={g.id}
                  style={{ flexGrow: Math.max(1, g.endMs - g.startMs) }}
                  className={`${g.id === selected.id ? "selected" : ""} ${["accepted", "correction"].includes(reviewState(project, g)) ? "done" : g.risks.length ? "flagged" : ""}`}
                  aria-label={`Go to ${timestamp(g.startMs)}`}
                  aria-pressed={g.id === selected.id}
                  onClick={() => choose(g)}
                />
              ))}
            </div>
            {groups.length > 24 && (
              <p className="timeline-range">
                Nearby passages {timelineStart + 1}–
                {timelineStart + timelineGroups.length} of {groups.length}. Use
                the queue or arrows to move through the full review.
              </p>
            )}
            <div className="pairing-row">
              <span>
                <Link2 size={14} />
                {selected.manual
                  ? "Manually paired"
                  : `${selected.source.length} original → ${selected.target.length} dub cues`}
                <span className="dot-sep">·</span>
                {Math.round(selected.coverage * 100)}% timing overlap
              </span>
              <button className="text-button" onClick={() => open("pair")}>
                Adjust pairing
              </button>
            </div>
            <div className="transcripts">
              {(["source", "target"] as const).map((side) => (
                <article key={side} className={`transcript ${side}`}>
                  <header>
                    <span className="eyebrow">
                      {side === "source" ? "ORIGINAL" : "DUB TRANSCRIPT"}
                    </span>
                    <span className="language-pill">
                      {LANGUAGES[project[side].language]}
                    </span>
                  </header>
                  <div className="cue-texts" lang={project[side].language}>
                    {selected[side].map((c) => (
                      <div className="cue-text" key={c.id}>
                        <button
                          className="time-button"
                          onClick={() => seek(side, c.startMs)}
                          aria-label={`Listen to ${side === "source" ? "original" : "dub"} at ${timestamp(c.startMs)}`}
                        >
                          {timestamp(c.startMs)}
                        </button>
                        <p>{c.text}</p>
                      </div>
                    ))}
                    {!selected[side].length && (
                      <p className="unpaired-empty">
                        No paired caption. Check the timing or pair it manually.
                      </p>
                    )}
                  </div>
                  <button
                    className="text-button update-track"
                    onClick={() => open(side)}
                  >
                    <FileUp size={13} />
                    Update transcript
                  </button>
                </article>
              ))}
            </div>
            <div className="risk-evidence">
              {selected.risks.length ? (
                selected.risks.map((risk, i) => (
                  <article
                    className={`risk-card ${risk.severity}`}
                    key={`${risk.kind}-${i}`}
                  >
                    <div className="risk-title">
                      <CircleAlert size={17} />
                      <h3>{risk.title}</h3>
                      <span>
                        {risk.severity === "high" ? "HIGH PRIORITY" : "CHECK"}
                      </span>
                    </div>
                    <p>{risk.detail}</p>
                    {(risk.sourceEvidence.length > 0 ||
                      risk.targetEvidence.length > 0) && (
                      <div className="evidence-pair">
                        <span>
                          <small>Original evidence</small>
                          {risk.sourceEvidence.length
                            ? risk.sourceEvidence.join(" · ")
                            : "No matching cue found"}
                        </span>
                        <ArrowRight size={15} />
                        <span>
                          <small>Dub evidence</small>
                          {risk.targetEvidence.length
                            ? risk.targetEvidence.join(" · ")
                            : "No matching cue found"}
                        </span>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <div className="no-risk">
                  <Check size={19} />
                  <div>
                    <strong>No supported checks triggered</strong>
                    <p>
                      Meaning can still change without a flag. Read and listen
                      before recording your decision.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <ReviewForm
              key={`${selected.id}-${selected.basis}-${currentDecision(project, selected)?.decidedAt || ""}-${formEpoch}`}
              project={project}
              group={selected}
              onDirty={onDirty}
              onSave={(p) =>
                update(
                  p,
                  "Decision recorded. Continue to the next passage when ready.",
                )
              }
            />
            <details className="listen-section">
              <summary>
                <AudioLines size={18} />
                Listen to the actual tracks<span>Optional · local files</span>
              </summary>
              <div className="media-grid">
                <MediaPanel
                  ref={originalMedia}
                  side="Original"
                  trackKey={JSON.stringify(project.source)}
                />
                <MediaPanel
                  ref={dubMedia}
                  side="Dub"
                  trackKey={JSON.stringify(project.target)}
                />
              </div>
              <p className="hint">
                Attach the matching audio or video, then use the caption
                timestamps to seek. Media is never uploaded or included in
                backups; reattach it after reloading.
              </p>
            </details>
          </section>
        </div>
        <footer className="app-footer">
          <p>
            <LockKeyhole size={13} />
            Private by default. No uploads. No analytics.
          </p>
          <p>
            Independent creator tool · Not affiliated with YouTube or Google
          </p>
          <a
            href={`${REPO}/blob/main/docs/PRODUCT_BRIEF.md`}
            target="_blank"
            rel="noreferrer"
          >
            Read the product case study <ArrowRight size={13} />
          </a>
        </footer>
      </main>
      {["new", "source", "target"].includes(dialog || "") && (
        <ImportDialog
          project={project}
          mode={dialog as "new" | "source" | "target"}
          onClose={() => setDialog(null)}
          onImport={(p, warnings) => {
            update(p, ["Transcripts imported.", ...warnings].join(" "));
            setSelectedId("");
            setSearch("");
            setFilter("all");
          }}
        />
      )}
      {dialog === "settings" && (
        <SettingsDialog
          project={project}
          onClose={() => setDialog(null)}
          onSave={(p) =>
            update(
              p,
              "Comparison settings saved. Review any decisions marked “Review again”.",
            )
          }
        />
      )}
      {dialog === "pair" && (
        <PairDialog
          project={project}
          group={selected}
          onClose={() => setDialog(null)}
          onSave={(p) => {
            update(p, "Pairing updated. Check the new passage boundaries.");
            setSelectedId("");
          }}
        />
      )}
      {dialog === "export" && (
        <ExportDialog project={project} onClose={() => setDialog(null)} />
      )}
      {dialog === "samples" && (
        <Modal title="Explore a sample review" onClose={() => setDialog(null)}>
          <p className="modal-intro">
            A short, fictional education episode with deliberately altered
            numbers, a reversed claim and a terminology mismatch. These authored
            translations are illustrative and have not been independently
            reviewed by native speakers.
          </p>
          <div className="sample-options">
            {(["hi", "ta"] as const).map((lang) => (
              <button
                className="sample-option"
                key={lang}
                onClick={() => {
                  update(
                    createDemo(lang),
                    `${LANGUAGES[lang]} sample opened. No real creator or audience data is included.`,
                  );
                  setSelectedId("");
                  setFilter("all");
                  setSearch("");
                }}
              >
                <Globe2 />
                <span>
                  <strong>
                    English <ArrowRight size={14} /> {LANGUAGES[lang]}
                  </strong>
                  <small>73 seconds · 10 review passages</small>
                </span>
                <ArrowRight size={20} />
              </button>
            ))}
          </div>
          <p className="hint">
            Opening a sample replaces this workspace. Export a JSON backup first
            to keep your current reviews.
          </p>
        </Modal>
      )}
      {dialog === "replace-storage" && (
        <Modal
          title="Replace the saved workspace?"
          onClose={() => setDialog(null)}
        >
          <p className="modal-intro">
            This saves the workspace currently on screen over the copy in
            browser storage. Download a backup of anything you need to keep
            first.
          </p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => {
                ws.saveCurrent();
                setDialog(null);
              }}
            >
              Replace saved copy
            </button>
          </div>
        </Modal>
      )}
      {dialog === "about" && (
        <Modal
          title="A closer listen, with evidence"
          onClose={() => setDialog(null)}
        >
          <p className="modal-intro">
            DubCheck helps educational creators review possible meaning changes
            between an original and a translated transcript. It prioritizes
            questions; a bilingual person decides what is right.
          </p>
          <ol className="how-steps">
            <li>
              <strong>Bring the two transcripts</strong>
              <p>
                Import creator-owned SRT or WebVTT. Timing overlap groups split
                or merged captions. Adjust the offset or pairing if the passages
                do not match.
              </p>
            </li>
            <li>
              <strong>Check the meaning</strong>
              <p>
                Compare numbers and supported units, negation cues and your
                preferred terminology. Attach local media to listen. Review
                every passage, even those with no flags.
              </p>
            </li>
            <li>
              <strong>Record a decision</strong>
              <p>
                Keep the wording, propose a correction, or request a second
                opinion. Record your reasoning. Changed evidence makes old
                decisions stale.
              </p>
            </li>
            <li>
              <strong>Hand off the next step</strong>
              <p>
                Export corrected captions, the review log and a full backup.
                Script corrections need an audio-production step and a final
                listen in Studio.
              </p>
            </li>
          </ol>
          <div className="about-limit">
            <TriangleAlert size={18} />
            <p>
              This is a narrow heuristic tool, not a translation-quality score.
              It can miss role reversals, causal errors, idioms and unsupported
              grammar. Hindi and Tamil number-word and negation coverage is
              limited. Timing overlap is not proof of semantic alignment.
            </p>
          </div>
          <p className="hint">
            No YouTube account connection, scraping, automatic publishing,
            external model calls or tracking. Your browser stores transcript
            text and reviewer names without encryption. Demo media is not
            included.
          </p>
          <a
            className="secondary link-button"
            href={`${REPO}/blob/main/docs/RESEARCH.md`}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} />
            Research & limitations
          </a>
        </Modal>
      )}
    </>
  );
}
