import { describe, expect, it } from "vitest";
import { createDemo } from "../../src/data/demo";
import { analyze } from "../../src/domain/alignment";
import {
  currentDecision,
  handoffCaptions,
  parseBackup,
  recordDecision,
  reviewCSV,
  reviewReport,
  reviewState,
  summarize,
} from "../../src/domain/review";
import {
  readWorkspace,
  saveWorkspace,
  STORAGE_KEY,
} from "../../src/domain/storage";
import {
  ProjectSchema,
  validateProject,
  type Decision,
} from "../../src/domain/types";

const accepted: Omit<Decision, "groupId" | "basis" | "decidedAt"> = {
  status: "accepted",
  reviewer: "Test Reviewer",
  note: "Checked both passages; wording is equivalent.",
  audioChecked: false,
  corrections: {},
};
describe("human decisions bound to exact evidence", () => {
  it("does not approve unflagged passages automatically", () =>
    expect(summarize(createDemo()).reviewed).toBe(0));
  it("saves a decision, a reviewer and an audit event", () => {
    let p = createDemo();
    const g = analyze(p)[0];
    p = recordDecision(p, g, accepted);
    expect(currentDecision(p, g)?.reviewer).toBe("Test Reviewer");
    expect(summarize(p).reviewed).toBe(1);
    p = recordDecision(p, g, { ...accepted, status: "uncertain" });
    expect(p.decisions).toHaveLength(2);
    expect(summarize(p).reviewed).toBe(0);
  });
  it("invalidates a prior decision when its text changes and excludes the old correction from exports", () => {
    let p = createDemo();
    const g = analyze(p)[0];
    p = recordDecision(p, g, {
      ...accepted,
      status: "correction",
      corrections: { c1: "इस अध्ययन में 24 लोग भाग लेते हैं।" },
    });
    expect(handoffCaptions(p, "srt")).toContain("24 लोग");
    p.target.cues[0].text = "इस अध्ययन में 72 लोग भाग लेते हैं।";
    expect(reviewState(p, analyze(p)[0])).toBe("stale");
    expect(handoffCaptions(p, "srt")).toContain("72 लोग");
    expect(summarize(p).reviewed).toBe(0);
  });
  it("keeps an unrelated decision current on a local transcript edit", () => {
    let p = createDemo();
    p = recordDecision(p, analyze(p)[0], accepted);
    p.target.cues[1].text += " नया वाक्य।";
    expect(reviewState(p, analyze(p)[0])).toBe("accepted");
  });
  it("invalidates decisions when the glossary, language, timing or pairing changes", () => {
    const base = createDemo();
    const p = recordDecision(base, analyze(base)[0], accepted);
    for (const change of [
      (q: typeof p) => {
        q.glossary = [];
      },
      (q: typeof p) => {
        q.target.language = "ta";
      },
      (q: typeof p) => {
        q.offsetMs = 100;
      },
      (q: typeof p) => {
        q.manualGroups = [{ id: "m1", sourceIds: ["c1"], targetIds: ["c1"] }];
      },
    ]) {
      const copy = structuredClone(p);
      change(copy);
      expect(currentDecision(copy, analyze(copy)[0])).toBeUndefined();
    }
  });
  it("rejects editing a stale passage", () => {
    const p = createDemo(),
      group = analyze(p)[0];
    p.target.cues[0].text = "Changed";
    expect(() => recordDecision(p, group, accepted)).toThrow("changed");
  });
  it("requires a real text change for a correction and rejects cross-passage edits", () => {
    const p = createDemo(),
      g = analyze(p)[0];
    expect(() =>
      recordDecision(p, g, { ...accepted, status: "correction" }),
    ).toThrow("Edit at least");
    expect(() =>
      recordDecision(p, g, {
        ...accepted,
        status: "correction",
        corrections: { c2: "Wrong cue" },
      }),
    ).toThrow("outside");
    expect(() =>
      recordDecision(p, g, { ...accepted, corrections: { c1: "Edited" } }),
    ).toThrow("Only a correction");
  });
  it("round-trips complete backup history and refuses corrupt/unknown schemas", () => {
    let p = createDemo();
    p = recordDecision(p, analyze(p)[0], accepted);
    expect(parseBackup(JSON.stringify(p))).toEqual(p);
    expect(() => parseBackup("{broken")).toThrow("valid JSON");
    expect(() =>
      parseBackup(JSON.stringify({ ...p, schemaVersion: 2 })),
    ).toThrow("Invalid");
    expect(() =>
      parseBackup(JSON.stringify({ ...p, secretField: true })),
    ).toThrow("Invalid");
  });
  it("rejects forged current corrections and malformed manual links on restore", () => {
    let p = createDemo();
    p = recordDecision(p, analyze(p)[0], accepted);
    p.decisions[0].corrections = { c100: "Bogus correction" };
    expect(() => parseBackup(JSON.stringify(p))).toThrow("unknown");
    const clean = createDemo();
    clean.manualGroups = [
      { id: "m", sourceIds: ["c1", "c1"], targetIds: ["c1"] },
    ];
    expect(ProjectSchema.safeParse(clean).success).toBe(false);
  });
  it("clearly labels draft exports, preserves captions and neutralizes spreadsheet formulas", () => {
    const p = createDemo();
    p.source.cues[0].text = '=HYPERLINK("bad")';
    expect(reviewReport(p)).toContain("Status: DRAFT");
    expect(reviewReport(p)).toContain("not a guarantee");
    expect(reviewCSV(p)).toContain("'=HYPERLINK");
    expect(handoffCaptions(p, "vtt")).toContain("WEBVTT");
  });
  it("requires every passage for transcript-reviewed status and does not imply audio approval", () => {
    let p = createDemo();
    for (const g of analyze(p)) p = recordDecision(p, g, accepted);
    expect(summarize(p)).toMatchObject({
      status: "transcript-reviewed",
      remaining: 0,
      audioChecked: 0,
    });
    expect(reviewReport(p)).toContain(
      "not a guarantee of translation quality or an edited audio track",
    );
  });
  it("does not create workspaces whose own formatted backup would be too large to restore", () => {
    const p = createDemo(),
      group = analyze(p)[0];
    p.decisions = Array.from({ length: 100 }, () => ({
      ...accepted,
      groupId: group.id,
      basis: "x".repeat(90_000),
      decidedAt: new Date().toISOString(),
    }));
    expect(() => validateProject(p)).toThrow("8 MB");
  });
  it("neutralizes spreadsheet formulas preceded by whitespace", () => {
    const p = createDemo();
    p.source.cues[0].text = "  =SUM(1,2)";
    expect(reviewCSV(p)).toContain("'  =SUM");
  });
});
describe("local persistence without silent overwrites", () => {
  function memory(initial: string | null = null) {
    let value = initial;
    return {
      getItem: (_key: string) => value,
      setItem: (_key: string, raw: string) => {
        value = raw;
      },
    };
  }
  it("saves and validates the full workspace", () => {
    const s = memory();
    const p = createDemo();
    saveWorkspace(s, p, null);
    expect(readWorkspace(s).project).toEqual(p);
  });
  it("preserves unreadable data for recovery", () => {
    const s = memory("{broken");
    expect(readWorkspace(s)).toMatchObject({ raw: "{broken" });
    expect(readWorkspace(s).error).toBeTruthy();
  });
  it("prevents two tabs from overwriting each other", () => {
    const s = memory();
    saveWorkspace(s, createDemo(), null);
    expect(() => saveWorkspace(s, createDemo("ta"), null)).toThrow(
      "Another tab",
    );
  });
  it("surfaces browser quota/privacy failures", () => {
    const s = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveWorkspace(s, createDemo(), null)).toThrow("Quota");
    expect(
      readWorkspace({
        ...s,
        getItem: () => {
          throw new Error("Denied");
        },
      }).error,
    ).toContain("Denied");
  });
});
