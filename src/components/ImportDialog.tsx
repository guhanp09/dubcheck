import { useState } from "react";
import { FileUp } from "lucide-react";
import { Modal } from "./Modal";
import { parseCaptions } from "../domain/captions";
import {
  LANGUAGES,
  MAX_IMPORT_BYTES,
  type Language,
  type Project,
} from "../domain/types";

type Mode = "new" | "source" | "target";
export function ImportDialog({
  project,
  mode,
  onClose,
  onImport,
}: {
  project: Project;
  mode: Mode;
  onClose: () => void;
  onImport: (p: Project, warnings: string[]) => void;
}) {
  const [title, setTitle] = useState(mode === "new" ? "" : project.title);
  const [source, setSource] = useState(""),
    [target, setTarget] = useState("");
  const [sourceLang, setSourceLang] = useState<Language>(
      project.source.language,
    ),
    [targetLang, setTargetLang] = useState<Language>(project.target.language);
  const [names, setNames] = useState({
    source: "original.srt",
    target: "dub.srt",
  });
  const [error, setError] = useState("");
  const [reading, setReading] = useState(0);
  async function file(side: "source" | "target", f?: File) {
    if (!f) return;
    setError("");
    if (f.size > MAX_IMPORT_BYTES) {
      setError("Each caption file must be smaller than 2 MB.");
      return;
    }
    setReading((n) => n + 1);
    try {
      const text = await f.text();
      (side === "source" ? setSource : setTarget)(text);
      setNames((n) => ({ ...n, [side]: f.name }));
    } catch {
      setError("This file could not be read. Try a UTF-8 SRT or WebVTT file.");
    } finally {
      setReading((n) => n - 1);
    }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const a =
        mode === "target"
          ? { track: project.source, warnings: [] }
          : parseCaptions(source, names.source, sourceLang);
      const b =
        mode === "source"
          ? { track: project.target, warnings: [] }
          : parseCaptions(target, names.target, targetLang);
      if (a.track.language === b.track.language)
        throw new Error("Choose different source and dub languages.");
      const fresh = mode === "new";
      const next: Project = {
        ...project,
        id: fresh ? `project-${crypto.randomUUID()}` : project.id,
        title: title.trim() || "Untitled review",
        source: a.track,
        target: b.track,
        offsetMs: fresh ? 0 : project.offsetMs,
        glossary: fresh ? [] : project.glossary,
        manualGroups: [],
        decisions: fresh ? [] : project.decisions,
        sample: false,
        updatedAt: new Date().toISOString(),
      };
      const warnings = [...new Set([...a.warnings, ...b.warnings])];
      if (!fresh && project.manualGroups.length)
        warnings.push(
          "Manual pairings were reset because the transcript changed.",
        );
      onImport(next, warnings);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The captions could not be imported.",
      );
    }
  }
  return (
    <Modal
      title={
        mode === "new"
          ? "Start with your transcripts"
          : `Update ${mode === "source" ? "original" : "dub"} transcript`
      }
      onClose={onClose}
      wide
    >
      <p className="modal-intro">
        Bring creator-owned SRT or WebVTT files. Text stays in this browser.
        DubCheck does not fetch or change anything in YouTube Studio.
      </p>
      <form onSubmit={submit}>
        {mode === "new" && (
          <label className="field">
            Project title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Why averages can mislead"
              required
              maxLength={180}
            />
          </label>
        )}
        <div className="import-grid">
          {(["source", "target"] as const)
            .filter((side) => mode === "new" || side === mode)
            .map((side) => (
              <section key={side} className="import-panel">
                <h3>
                  {side === "source" ? "Original transcript" : "Dub transcript"}
                </h3>
                <label className="field">
                  {side === "source" ? "Original language" : "Dub language"}
                  <select
                    value={side === "source" ? sourceLang : targetLang}
                    onChange={(e) =>
                      (side === "source" ? setSourceLang : setTargetLang)(
                        e.target.value as Language,
                      )
                    }
                  >
                    {Object.entries(LANGUAGES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="file-drop">
                  <FileUp size={20} />
                  <span>
                    Choose {side === "source" ? "original" : "dub"} captions
                  </span>
                  <small>SRT / VTT · UTF-8 · up to 2 MB</small>
                  <input
                    type="file"
                    accept=".srt,.vtt,text/vtt,text/plain"
                    aria-label={`Upload ${side} captions`}
                    onChange={(e) => {
                      void file(side, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="field">
                  Or paste {side === "source" ? "original" : "dub"} captions
                  <textarea
                    className="caption-input"
                    value={side === "source" ? source : target}
                    onChange={(e) =>
                      (side === "source" ? setSource : setTarget)(
                        e.target.value,
                      )
                    }
                    maxLength={MAX_IMPORT_BYTES}
                    rows={7}
                    placeholder={
                      "1\n00:00:00,000 --> 00:00:05,000\nYour caption text"
                    }
                    required
                  />
                </label>
              </section>
            ))}
        </div>
        <p className="hint">
          {mode === "new"
            ? "A new workspace replaces the open one. Download a JSON backup first if you want to keep its reviews."
            : "Original evidence stays in the review history. Decisions whose evidence changed become stale; new caption pairings need review."}{" "}
          Up to 1,000 cues and 4 hours per track. Positioning and caption
          styling are not preserved.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit" disabled={reading > 0}>
            {reading
              ? "Reading file…"
              : mode === "new"
                ? "Create workspace"
                : "Update transcript"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
