import { useEffect, useState } from "react";
import { Check, CircleHelp, PencilLine, Save } from "lucide-react";
import {
  currentDecision,
  latestDecision,
  recordDecision,
} from "../domain/review";
import { timestamp } from "../domain/captions";
import type { Decision, Group, Project } from "../domain/types";

export function ReviewForm({
  project,
  group,
  onSave,
  onDirty,
}: {
  project: Project;
  group: Group;
  onSave: (p: Project) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const existing = currentDecision(project, group),
    previous = latestDecision(project, group);
  const [status, setStatus] = useState<Decision["status"] | "">(
    existing?.status || "",
  );
  const [reviewer, setReviewer] = useState(
    existing?.reviewer || project.decisions.at(-1)?.reviewer || "",
  );
  const [note, setNote] = useState(existing?.note || "");
  const [audioChecked, setAudioChecked] = useState(
    existing?.audioChecked || false,
  );
  const [edits, setEdits] = useState<Record<string, string>>(
    Object.fromEntries(
      group.target.map((c) => [c.id, existing?.corrections[c.id] || c.text]),
    ),
  );
  const [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  const touch = () => setDirty(true);
  return (
    <form
      className="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        try {
          if (!status)
            throw new Error("Choose a decision after comparing both passages.");
          const corrections =
            status === "correction"
              ? Object.fromEntries(
                  group.target
                    .filter((c) => edits[c.id]?.trim() !== c.text)
                    .map((c) => [c.id, edits[c.id]?.trim()]),
                )
              : {};
          if (!reviewer.trim() || note.trim().length < 3)
            throw new Error(
              "Add your name and a short reason for this decision.",
            );
          if (Object.values(corrections).some((text) => !text))
            throw new Error("A corrected caption cannot be empty.");
          const next = recordDecision(project, group, {
            status,
            reviewer,
            note,
            corrections,
            audioChecked,
          });
          setDirty(false);
          onDirty(false);
          onSave(next);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "The decision could not be saved.",
          );
        }
      }}
    >
      <div className="section-heading">
        <h3>Your review</h3>
        <span>
          {dirty
            ? "Unsaved edits"
            : existing
              ? "Current decision recorded"
              : "A person makes the call"}
        </span>
      </div>
      {previous && !existing && (
        <p className="stale-message">
          The evidence or comparison settings changed. The earlier decision is
          retained in history and is excluded from this handoff.
        </p>
      )}
      <fieldset className="decision-options">
        <legend className="sr-only">Review decision</legend>
        {[
          { value: "accepted", name: "Meaning preserved", icon: Check },
          { value: "correction", name: "Needs correction", icon: PencilLine },
          { value: "uncertain", name: "Second opinion", icon: CircleHelp },
        ].map(({ value, name, icon: Icon }) => (
          <label
            key={value}
            className={`decision-option ${status === value ? "chosen" : ""}`}
          >
            <input
              type="radio"
              name="decision"
              value={value}
              checked={status === value}
              disabled={value === "correction" && !group.target.length}
              onChange={() => {
                setStatus(value as Decision["status"]);
                touch();
              }}
            />
            <Icon size={17} />
            <span>{name}</span>
          </label>
        ))}
      </fieldset>
      {status === "correction" && (
        <div className="correction-editor">
          <p className="hint">
            Write the corrected script for the audio producer. This changes the
            exported captions, not the dub audio.
          </p>
          {group.target.map((c) => (
            <label className="field" key={c.id}>
              Proposed dub text · {timestamp(c.startMs)}
              <textarea
                lang={project.target.language}
                rows={3}
                value={edits[c.id] || ""}
                maxLength={4000}
                required
                onChange={(e) => {
                  setEdits((old) => ({ ...old, [c.id]: e.target.value }));
                  touch();
                }}
              />
            </label>
          ))}
        </div>
      )}
      <div className="review-inputs">
        <label className="field reviewer-name">
          Reviewer
          <input
            value={reviewer}
            onChange={(e) => {
              setReviewer(e.target.value);
              touch();
            }}
            maxLength={100}
            autoComplete="name"
            placeholder="Your name"
            required
          />
        </label>
        <label className="field review-note">
          Reason / evidence
          <textarea
            rows={2}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              touch();
            }}
            maxLength={2000}
            minLength={3}
            required
            placeholder={
              status === "uncertain"
                ? "What needs a second opinion?"
                : "What did you check, and why is this the right decision?"
            }
          />
        </label>
      </div>
      <label className="audio-check">
        <input
          type="checkbox"
          checked={audioChecked}
          onChange={(e) => {
            setAudioChecked(e.target.checked);
            touch();
          }}
        />
        <span>
          I compared the original and dub audio
          <small>
            Using attached media or the tracks in Studio. Text alone cannot
            verify pronunciation or delivery.
          </small>
        </span>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="review-bottom">
        <span>
          {!status
            ? "Choose a decision after comparing both passages."
            : status === "uncertain"
              ? "This passage will stay in the review queue."
              : "Only this passage will be marked reviewed."}
        </span>
        <button className="primary" type="submit">
          <Save size={16} />
          Save decision
        </button>
      </div>
      {project.decisions.some((d) => d.groupId === group.id) && (
        <details className="history">
          <summary>
            Decision history (
            {project.decisions.filter((d) => d.groupId === group.id).length})
          </summary>
          <ol>
            {project.decisions
              .filter((d) => d.groupId === group.id)
              .toReversed()
              .map((d, i) => (
                <li key={`${d.decidedAt}-${i}`}>
                  <strong>
                    {d.reviewer} · {d.status}
                  </strong>
                  <small>
                    {new Date(d.decidedAt).toLocaleString()} ·{" "}
                    {d.basis === group.basis
                      ? "Same evidence"
                      : "Older evidence"}
                  </small>
                  <p>{d.note}</p>
                </li>
              ))}
          </ol>
        </details>
      )}
    </form>
  );
}
