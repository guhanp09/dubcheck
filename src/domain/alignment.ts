import { checkMeaning } from "./checks";
import type { Cue, Group, Project } from "./types";

const overlap = (a: [number, number], b: [number, number]) =>
  Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
function unionDuration(intervals: [number, number][]): number {
  let total = 0,
    end = -Infinity;
  for (const [start, nextEnd] of intervals.sort((a, b) => a[0] - b[0])) {
    total += Math.max(0, nextEnd - Math.max(start, end));
    end = Math.max(end, nextEnd);
  }
  return total;
}
function coverage(source: Cue[], target: Cue[], offset: number): number {
  if (!source.length || !target.length) return 0;
  const s: [number, number][] = source.map((c) => [c.startMs, c.endMs]);
  const t: [number, number][] = target.map((c) => [
    c.startMs - offset,
    c.endMs - offset,
  ]);
  const intersections: [number, number][] = [];
  for (const a of s)
    for (const b of t)
      if (overlap(a, b))
        intersections.push([Math.max(a[0], b[0]), Math.min(a[1], b[1])]);
  return (
    unionDuration(intersections) / Math.max(unionDuration(s), unionDuration(t))
  );
}
function groupId(source: Cue[], target: Cue[]): string {
  // IDs are navigation keys only. Decisions are bound to the full exact basis below.
  const input = JSON.stringify([
    source.map((c) => c.id),
    target.map((c) => c.id),
  ]);
  let h = 2166136261;
  for (let i = 0; i < input.length; i++)
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return `g${(h >>> 0).toString(16)}`;
}

export function analyze(project: Project): Group[] {
  const { source, target, offsetMs, manualGroups } = project;
  const usedS = new Set(manualGroups.flatMap((m) => m.sourceIds)),
    usedT = new Set(manualGroups.flatMap((m) => m.targetIds));
  const s = source.cues.filter((c) => !usedS.has(c.id)),
    t = target.cues.filter((c) => !usedT.has(c.id));
  const parent = Array.from({ length: s.length + t.length }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < s.length; i++)
    for (let j = 0; j < t.length; j++) {
      if (t[j].endMs - offsetMs <= s[i].startMs) continue;
      if (t[j].startMs - offsetMs >= s[i].endMs) break;
      const common = overlap(
        [s[i].startMs, s[i].endMs],
        [t[j].startMs - offsetMs, t[j].endMs - offsetMs],
      );
      const shortest = Math.min(
        s[i].endMs - s[i].startMs,
        t[j].endMs - t[j].startMs,
      );
      if (common / shortest >= 0.35) parent[find(s.length + j)] = find(i);
    }
  const components = new Map<
    number,
    { source: Cue[]; target: Cue[]; manual: boolean }
  >();
  [...s, ...t].forEach((cue, i) => {
    const root = find(i);
    if (!components.has(root))
      components.set(root, { source: [], target: [], manual: false });
    components.get(root)![i < s.length ? "source" : "target"].push(cue);
  });
  const raw = [
    ...components.values(),
    ...manualGroups.map((m) => ({
      source: source.cues.filter((c) => m.sourceIds.includes(c.id)),
      target: target.cues.filter((c) => m.targetIds.includes(c.id)),
      manual: true,
    })),
  ];
  return raw
    .map((g) => {
      const cov = coverage(g.source, g.target, offsetMs);
      const risks =
        g.source.length && g.target.length
          ? checkMeaning(
              g.source.map((c) => c.text).join(" "),
              g.target.map((c) => c.text).join(" "),
              source.language,
              target.language,
              project.glossary,
            )
          : [];
      const missing = !g.source.length || !g.target.length;
      if (
        missing ||
        (!g.manual &&
          (cov < 0.65 || g.source.length > 4 || g.target.length > 4))
      )
        risks.unshift({
          kind: "alignment",
          severity: "medium",
          title: missing ? "Unpaired speech" : "Check the timestamp pairing",
          detail: missing
            ? "One transcript has no paired passage. Check for a timing offset, omitted speech or an extra caption before judging meaning."
            : "Timing overlap is limited or many cues were grouped. Confirm these passages belong together before judging meaning.",
          sourceEvidence: [],
          targetEvidence: [],
        });
      const startMs = Math.min(
        ...g.source.map((c) => c.startMs),
        ...g.target.map((c) => Math.max(0, c.startMs - offsetMs)),
      );
      const endMs = Math.max(
        ...g.source.map((c) => c.endMs),
        ...g.target.map((c) => Math.max(0, c.endMs - offsetMs)),
      );
      return {
        ...g,
        id: groupId(g.source, g.target),
        startMs,
        endMs,
        coverage: cov,
        risks,
        basis: JSON.stringify({
          source: g.source,
          target: g.target,
          sourceLanguage: source.language,
          targetLanguage: target.language,
          offsetMs,
          glossary: project.glossary,
          manual: g.manual,
        }),
      };
    })
    .sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
}

export const riskScore = (group: Group): number =>
  group.risks.reduce(
    (score, r) =>
      score + (r.kind === "alignment" ? 6 : r.severity === "high" ? 4 : 2),
    0,
  );
