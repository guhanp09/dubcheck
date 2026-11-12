import { Download, FileJson, FileText, Table2 } from "lucide-react";
import { Modal } from "./Modal";
import {
  handoffCaptions,
  reviewCSV,
  reviewReport,
  summarize,
} from "../domain/review";
import type { Project } from "../domain/types";

export function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
export function ExportDialog({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const summary = summarize(project),
    prefix = `dubcheck-${summary.status}-${project.target.language}`;
  return (
    <Modal title="Hand off the review" onClose={onClose}>
      <div className="export-summary">
        <span className="eyebrow">
          {summary.status === "draft" ? "DRAFT HANDOFF" : "TRANSCRIPT REVIEWED"}
        </span>
        <h3>
          {summary.reviewed} of {summary.total} passages reviewed
        </h3>
        <p>
          {summary.remaining
            ? `${summary.remaining} passages still need a decision, including unflagged passages.`
            : "Every passage has a current decision."}{" "}
          {summary.audioChecked} marked audio-checked. {summary.corrections}{" "}
          passages have script corrections.
        </p>
      </div>
      <p className="modal-intro">
        The subtitle files contain saved, current corrections; unsaved form
        edits are excluded. They do not change the audio. Re-record or produce
        corrected audio, then review it before publishing in Studio.
      </p>
      <div className="export-options">
        <button
          onClick={() =>
            download(
              handoffCaptions(project, "srt"),
              `${prefix}.srt`,
              "application/x-subrip;charset=utf-8",
            )
          }
        >
          <FileText />
          <span>
            <strong>Corrected script · SRT</strong>
            <small>Original dub timing, current corrections only</small>
          </span>
          <Download size={17} />
        </button>
        <button
          onClick={() =>
            download(
              handoffCaptions(project, "vtt"),
              `${prefix}.vtt`,
              "text/vtt;charset=utf-8",
            )
          }
        >
          <FileText />
          <span>
            <strong>Corrected script · WebVTT</strong>
            <small>Plain captions, without styling or positioning</small>
          </span>
          <Download size={17} />
        </button>
        <button
          onClick={() =>
            download(
              reviewReport(project),
              `${prefix}-review.md`,
              "text/markdown;charset=utf-8",
            )
          }
        >
          <FileText />
          <span>
            <strong>Reviewer handoff · Markdown</strong>
            <small>Evidence, decisions, remaining work and limitations</small>
          </span>
          <Download size={17} />
        </button>
        <button
          onClick={() =>
            download(
              reviewCSV(project),
              `${prefix}-review.csv`,
              "text/csv;charset=utf-8",
            )
          }
        >
          <Table2 />
          <span>
            <strong>Review log · CSV</strong>
            <small>One row per passage, ready for a spreadsheet</small>
          </span>
          <Download size={17} />
        </button>
        <button
          onClick={() =>
            download(
              JSON.stringify(project, null, 2),
              "dubcheck-workspace.json",
              "application/json",
            )
          }
        >
          <FileJson />
          <span>
            <strong>Workspace backup · JSON</strong>
            <small>
              Transcripts, settings and full decision history; no media
            </small>
          </span>
          <Download size={17} />
        </button>
      </div>
      <p className="hint">
        Backups contain your transcript text and reviewer names. Share them only
        with the people who should see that information. Local storage is not
        encrypted.
      </p>
    </Modal>
  );
}
