import { useState } from "react";
import { Modal } from "./Modal";
import { timestamp } from "../domain/captions";
import type { Group, Project } from "../domain/types";

export function PairDialog({
  project,
  group,
  onClose,
  onSave,
}: {
  project: Project;
  group: Group;
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [sources, setSources] = useState(group.source.map((c) => c.id));
  const [targets, setTargets] = useState(group.target.map((c) => c.id));
  const [error, setError] = useState("");
  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  return (
    <Modal title="Pair the same spoken passage" onClose={onClose} wide>
      <p className="modal-intro">
        Choose the original and dub cues that convey the same passage. Cues
        removed from a manual pairing return to timestamp matching. Pairings are
        never inferred from cue numbers alone.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!sources.length) {
            setError("Choose at least one original cue.");
            return;
          }
          // A newly chosen cue can be reassigned, but existing manual groups must remain disjoint.
          const remaining = project.manualGroups
            .map((m) => ({
              ...m,
              sourceIds: m.sourceIds.filter((id) => !sources.includes(id)),
              targetIds: m.targetIds.filter((id) => !targets.includes(id)),
            }))
            .filter((m) => m.sourceIds.length);
          onSave({
            ...project,
            manualGroups: [
              ...remaining,
              {
                id: `pair-${crypto.randomUUID()}`,
                sourceIds: sources,
                targetIds: targets,
              },
            ],
          });
        }}
      >
        <div className="pair-grid">
          {(["source", "target"] as const).map((side) => (
            <fieldset key={side}>
              <legend>
                {side === "source" ? "Original cues" : "Dub cues"}
              </legend>
              <div className="cue-picker">
                {project[side].cues.map((c) => (
                  <label key={c.id} className="pick-cue">
                    <input
                      type="checkbox"
                      checked={(side === "source" ? sources : targets).includes(
                        c.id,
                      )}
                      onChange={() =>
                        side === "source"
                          ? setSources(toggle(sources, c.id))
                          : setTargets(toggle(targets, c.id))
                      }
                    />
                    <span>
                      <small>
                        {c.id} · {timestamp(c.startMs)}
                      </small>
                      {c.text}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          {project.manualGroups.length > 0 && (
            <button
              className="secondary"
              type="button"
              onClick={() => onSave({ ...project, manualGroups: [] })}
            >
              Reset all to timestamp matching
            </button>
          )}
          <button className="primary">Save pairing</button>
        </div>
      </form>
    </Modal>
  );
}
