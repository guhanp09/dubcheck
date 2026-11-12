import {
  DecisionSchema,
  ProjectSchema,
  validateProject,
  MAX_BACKUP_BYTES,
  type Decision,
  type Group,
  type Project,
} from "./types";
import { analyze } from "./alignment";
import { exportCaptions, timestamp } from "./captions";

export function latestDecision(
  project: Project,
  group: Group,
): Decision | undefined {
  return project.decisions.findLast((d) => d.groupId === group.id);
}
export function currentDecision(
  project: Project,
  group: Group,
): Decision | undefined {
  const d = latestDecision(project, group);
  return d?.basis === group.basis ? d : undefined;
}
export function reviewState(
  project: Project,
  group: Group,
): "unreviewed" | "stale" | Decision["status"] {
  const d = latestDecision(project, group);
  return d ? (d.basis === group.basis ? d.status : "stale") : "unreviewed";
}
export function recordDecision(
  project: Project,
  group: Group,
  input: Omit<Decision, "groupId" | "basis" | "decidedAt">,
): Project {
  const live = analyze(project).find(
    (g) => g.id === group.id && g.basis === group.basis,
  );
  if (!live)
    throw new Error(
      "This passage changed. Open it again before saving a decision.",
    );
  const decision = DecisionSchema.parse({
    ...input,
    groupId: group.id,
    basis: group.basis,
    decidedAt: new Date().toISOString(),
  });
  const targetIds = new Set(group.target.map((c) => c.id));
  for (const id of Object.keys(decision.corrections))
    if (!targetIds.has(id))
      throw new Error("Correction refers to a cue outside this passage.");
  const changed = group.target.some(
    (c) => decision.corrections[c.id] && decision.corrections[c.id] !== c.text,
  );
  if (decision.status === "correction" && !changed)
    throw new Error(
      "Edit at least one dub caption before recording a correction.",
    );
  if (
    decision.status !== "correction" &&
    Object.keys(decision.corrections).length
  )
    throw new Error("Only a correction decision can change the handoff text.");
  if (project.decisions.length >= 2000)
    throw new Error(
      "This workspace has reached 2,000 review events. Export its backup and start a new workspace.",
    );
  return validateProject({
    ...project,
    decisions: [...project.decisions, decision],
    updatedAt: new Date().toISOString(),
  });
}

export function summarize(project: Project, groups = analyze(project)) {
  const reviewed = groups.filter((g) =>
    ["accepted", "correction"].includes(reviewState(project, g)),
  );
  const corrections = groups.filter(
    (g) => reviewState(project, g) === "correction",
  );
  const flagged = groups.filter((g) => g.risks.length > 0);
  return {
    total: groups.length,
    reviewed: reviewed.length,
    remaining: groups.length - reviewed.length,
    corrections: corrections.length,
    flagged: flagged.length,
    audioChecked: reviewed.filter(
      (g) => currentDecision(project, g)?.audioChecked,
    ).length,
    status:
      reviewed.length === groups.length
        ? ("transcript-reviewed" as const)
        : ("draft" as const),
  };
}

export function handoffCaptions(
  project: Project,
  format: "srt" | "vtt",
): string {
  const corrections: Record<string, string> = {};
  for (const group of analyze(project)) {
    const decision = currentDecision(project, group);
    if (decision?.status === "correction")
      Object.assign(corrections, decision.corrections);
  }
  return exportCaptions(
    project.target.cues.map((c) => ({
      ...c,
      text: corrections[c.id] || c.text,
    })),
    format,
  );
}

export function reviewReport(project: Project): string {
  const groups = analyze(project),
    summary = summarize(project, groups);
  const lines = [
    `# DubCheck review handoff: ${project.title.replace(/[\r\n]/g, " ")}`,
    "",
    `Exported: ${new Date().toISOString()}`,
    `Status: ${summary.status.toUpperCase()}`,
    `Pair: ${project.source.language} → ${project.target.language}`,
    `Source: ${project.source.name}`,
    `Dub transcript: ${project.target.name}`,
    `Coverage: ${summary.reviewed}/${summary.total} passages reviewed; ${summary.remaining} outstanding; ${summary.audioChecked} marked audio-checked.`,
    "",
    "This is a transcript review and production handoff, not a guarantee of translation quality or an edited audio track. Corrected scripts require a new recording or audio-production step. Publish/replacement decisions remain in YouTube Studio. No-flag passages still require review.",
    project.sample
      ? "\nIllustrative authored sample; translations have not been independently validated."
      : "",
    "",
    "## Passage decisions",
    "",
  ];
  for (const group of groups) {
    const d = currentDecision(project, group);
    lines.push(
      `### ${timestamp(group.startMs, true)}–${timestamp(group.endMs, true)} · ${reviewState(project, group)}`,
      `Pairing: ${group.manual ? "manual" : "timestamp"}; overlap ${Math.round(group.coverage * 100)}%`,
      `Checks: ${group.risks.map((r) => r.title).join("; ") || "No supported checks triggered"}`,
      "",
      "Source:",
      ...group.source.map((c) => `[${c.id}] ${c.text}`),
      "",
      "Original dub transcript:",
      ...group.target.map((c) => `[${c.id}] ${c.text}`),
    );
    if (d)
      lines.push(
        "",
        `Reviewer: ${d.reviewer} · ${d.decidedAt}`,
        `Audio checked: ${d.audioChecked ? "yes — reviewer attestation" : "no"}`,
        `Reason: ${d.note}`,
        ...Object.entries(d.corrections).map(
          ([id, text]) => `Proposed script [${id}]: ${text}`,
        ),
      );
    lines.push("");
  }
  lines.push(
    "## Audit trail",
    "",
    `Total recorded decisions: ${project.decisions.length}. Full original evidence and review history are included in the JSON backup. Decisions become stale when their exact passage/configuration basis changes.`,
    "",
    "## Limits",
    "",
    "Checks cover a limited set of numbers, units, negation cues and creator-supplied terms. They miss errors in causality, roles, cultural meaning, delivery and many grammatical constructions. Hindi/Tamil word-number and morphology coverage is limited. Timing overlap is not semantic alignment. A bilingual reviewer must compare the actual audio before release.",
  );
  return lines.join("\n");
}

export function reviewCSV(project: Project): string {
  const cell = (s: string) =>
    `"${(/^(?:\s*[=+\-@]|[\t\r\n])/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`;
  const rows = [
    [
      "passage",
      "source_start",
      "source",
      "original_dub",
      "checks",
      "state",
      "reviewer",
      "note",
      "proposed_script",
      "audio_checked",
    ],
  ];
  for (const g of analyze(project)) {
    const d = currentDecision(project, g);
    rows.push([
      g.id,
      timestamp(g.startMs, true),
      g.source.map((c) => c.text).join("\n"),
      g.target.map((c) => c.text).join("\n"),
      g.risks.map((r) => r.kind).join("; "),
      reviewState(project, g),
      d?.reviewer || "",
      d?.note || "",
      Object.values(d?.corrections || {}).join("\n"),
      d?.audioChecked ? "yes" : "no",
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

export function parseBackup(raw: string): Project {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES)
    throw new Error("Workspace backup must be smaller than 8 MB.");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const result = ProjectSchema.safeParse(data);
  if (!result.success)
    throw new Error(
      `Invalid DubCheck v1 workspace: ${result.error.issues[0]?.message || "schema mismatch"}`,
    );
  const project = result.data;
  // Do not accept forged current decisions containing nonexistent cues or contradictory corrections.
  for (const g of analyze(project)) {
    const d = currentDecision(project, g);
    if (!d) continue;
    const ids = new Set(g.target.map((c) => c.id));
    if (Object.keys(d.corrections).some((id) => !ids.has(id)))
      throw new Error("A review correction refers to an unknown caption.");
    const changed = g.target.some(
      (c) => d.corrections[c.id] && d.corrections[c.id] !== c.text,
    );
    if (
      (d.status === "correction" && !changed) ||
      (d.status !== "correction" && Object.keys(d.corrections).length)
    )
      throw new Error("A review decision contains inconsistent corrections.");
  }
  return project;
}
