import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { LANGUAGES, type Project } from "../domain/types";

export function SettingsDialog({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [offset, setOffset] = useState(String(project.offsetMs / 1000));
  const [terms, setTerms] = useState(
    project.glossary.map((t) => ({
      ...t,
      aliases: t.translations.join(" | "),
    })),
  );
  const [error, setError] = useState("");
  return (
    <Modal title="Timing & terminology" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const seconds = Number(offset);
          if (!Number.isFinite(seconds) || Math.abs(seconds) > 600) {
            setError("Use an offset between −600 and 600 seconds.");
            return;
          }
          const glossary = terms.map(({ aliases, ...term }) => ({
            ...term,
            translations: [
              ...new Set(
                aliases
                  .split("|")
                  .map((s) => s.trim())
                  .filter(Boolean),
              ),
            ],
          }));
          if (
            glossary.some(
              (t) =>
                !t.source.trim() ||
                !t.translations.length ||
                t.translations.length > 12 ||
                t.translations.some((s) => s.length > 100),
            )
          ) {
            setError(
              "Every term needs a source phrase and 1–12 translations, each up to 100 characters.",
            );
            return;
          }
          onSave({
            ...project,
            offsetMs: Math.round(seconds * 1000),
            glossary,
          });
        }}
      >
        <p className="modal-intro">
          Tune the comparison to your episode. Changing these settings makes
          existing review decisions stale so they can be checked against the new
          rules.
        </p>
        <label className="field narrow">
          Dub starts later by (seconds)
          <input
            type="number"
            min="-600"
            max="600"
            step="0.001"
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
            required
          />
        </label>
        <p className="hint">
          Use 2 if the same speech starts at 00:02 in the dub and 00:00 in the
          original. Negative values mean the dub starts earlier. Exported dub
          timestamps stay unchanged.
        </p>
        <div className="section-heading">
          <h3>Your terminology</h3>
          <span>{terms.length}/100 terms</span>
        </div>
        <p className="hint">
          Include names or concepts that must survive translation. Separate
          acceptable variants with |. This is a phrase check, not a translation
          dictionary.
        </p>
        <div className="glossary-list">
          {terms.map((term, i) => (
            <div className="term-row" key={term.id}>
              <label className="field">
                {LANGUAGES[project.source.language]} term {i + 1}
                <input
                  value={term.source}
                  required
                  maxLength={100}
                  onChange={(e) =>
                    setTerms((ts) =>
                      ts.map((t) =>
                        t.id === term.id ? { ...t, source: e.target.value } : t,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                {LANGUAGES[project.target.language]} variants {i + 1}
                <input
                  value={term.aliases}
                  required
                  maxLength={1220}
                  onChange={(e) =>
                    setTerms((ts) =>
                      ts.map((t) =>
                        t.id === term.id
                          ? { ...t, aliases: e.target.value }
                          : t,
                      ),
                    )
                  }
                />
              </label>
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove term ${i + 1}`}
                onClick={() =>
                  setTerms((ts) => ts.filter((t) => t.id !== term.id))
                }
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="secondary"
          type="button"
          disabled={terms.length >= 100}
          onClick={() =>
            setTerms((ts) => [
              ...ts,
              {
                id: `term-${crypto.randomUUID()}`,
                source: "",
                translations: [],
                aliases: "",
              },
            ])
          }
        >
          <Plus size={16} />
          Add term
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button className="secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary">Save settings</button>
        </div>
      </form>
    </Modal>
  );
}
