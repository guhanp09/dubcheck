import { describe, expect, it } from "vitest";
import { analyze } from "../../src/domain/alignment";
import { createDemo } from "../../src/data/demo";
import type { Cue, Project } from "../../src/domain/types";
const cue = (
  id: string,
  startMs: number,
  endMs: number,
  text = "Hello",
): Cue => ({ id, startMs, endMs, text });
function project(source: Cue[], target: Cue[]): Project {
  const p = createDemo();
  return {
    ...p,
    source: { ...p.source, cues: source },
    target: { ...p.target, cues: target },
    glossary: [],
  };
}

describe("timestamp alignment with complete coverage", () => {
  it("groups split dub cues without duplicating the source quantity", () => {
    const p = project(
      [cue("s1", 0, 5000, "24 people")],
      [cue("t1", 0, 2000, "24"), cue("t2", 2000, 5000, "लोग")],
    );
    const g = analyze(p);
    expect(g).toHaveLength(1);
    expect(g[0].target).toHaveLength(2);
    expect(g[0].risks).toEqual([]);
    expect(g[0].coverage).toBe(1);
  });
  it("groups a dub caption spanning multiple original captions", () => {
    const g = analyze(
      project(
        [cue("s1", 0, 2000), cue("s2", 2000, 4000)],
        [cue("t1", 0, 4000)],
      ),
    );
    expect(g).toHaveLength(1);
    expect(g[0].source).toHaveLength(2);
  });
  it("keeps orphan source and target cues visible", () => {
    const g = analyze(project([cue("s1", 0, 1000)], [cue("t1", 5000, 6000)]));
    expect(g).toHaveLength(2);
    expect(g.every((g) => g.risks.some((r) => r.kind === "alignment"))).toBe(
      true,
    );
  });
  it("corrects a global positive or negative dub offset without changing exported timings", () => {
    const p = project([cue("s1", 0, 3000)], [cue("t1", 5000, 8000)]);
    p.offsetMs = 5000;
    expect(analyze(p)).toHaveLength(1);
    expect(analyze(p)[0].coverage).toBe(1);
    expect(p.target.cues[0].startMs).toBe(5000);
    const reverse = project([cue("s1", 5000, 8000)], [cue("t1", 0, 3000)]);
    reverse.offsetMs = -5000;
    expect(analyze(reverse)[0].coverage).toBe(1);
  });
  it("flags low coverage and large connected passages as alignment uncertainty", () => {
    const g = analyze(project([cue("s1", 0, 10_000)], [cue("t1", 0, 1000)]));
    expect(g[0].risks.map((r) => r.kind)).toContain("alignment");
    const large = analyze(
      project(
        Array.from({ length: 6 }, (_, i) =>
          cue(`s${i}`, i * 1000, (i + 1) * 1000),
        ),
        [cue("t1", 0, 6000)],
      ),
    );
    expect(large[0].risks.map((r) => r.kind)).toContain("alignment");
  });
  it("respects manual pairings and leaves all remaining cues in the queue", () => {
    const p = project(
      [cue("s1", 0, 1000), cue("s2", 1000, 2000)],
      [cue("t1", 10_000, 11_000), cue("t2", 11_000, 12_000)],
    );
    p.manualGroups = [{ id: "manual", sourceIds: ["s1"], targetIds: ["t1"] }];
    const groups = analyze(p);
    expect(groups).toHaveLength(3);
    expect(groups.find((g) => g.manual)?.risks).toEqual([]);
    expect(
      groups
        .flatMap((g) => g.source)
        .map((c) => c.id)
        .sort(),
    ).toEqual(["s1", "s2"]);
    expect(
      groups
        .flatMap((g) => g.target)
        .map((c) => c.id)
        .sort(),
    ).toEqual(["t1", "t2"]);
  });
  it("does not merge adjacent cues because they touch at an endpoint", () =>
    expect(
      analyze(project([cue("s1", 0, 1000)], [cue("t1", 1000, 2000)])),
    ).toHaveLength(2));
  it.each(["hi", "ta"] as const)(
    "provides a complete ten-passage %s demonstration",
    (language) => {
      const p = createDemo(language),
        groups = analyze(p);
      expect(groups).toHaveLength(10);
      expect(groups.filter((g) => g.risks.length)).toHaveLength(4);
      expect(groups.at(-1)?.target).toHaveLength(2);
    },
  );
});
