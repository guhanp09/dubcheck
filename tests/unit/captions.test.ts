import { describe, expect, it } from "vitest";
import {
  exportCaptions,
  parseCaptions,
  parseTimestamp,
  timestamp,
} from "../../src/domain/captions";

const SRT =
  "1\n00:00:00,000 --> 00:00:04,500\nThis & that.\nA second line.\n\n2\n00:00:04,500 --> 00:00:08,000\nनतीजा देखें।\n";
describe("caption import and production handoff", () => {
  it("imports SRT with Unicode, CRLF and a BOM", () => {
    const { track, warnings } = parseCaptions(
      "\uFEFF" + SRT.replaceAll("\n", "\r\n"),
      "example.srt",
      "hi",
    );
    expect(track.cues).toHaveLength(2);
    expect(track.cues[1].text).toBe("नतीजा देखें।");
    expect(warnings).toEqual([]);
  });
  it("reads WebVTT identifiers, short timestamps, notes and formatting", () => {
    const { track, warnings } = parseCaptions(
      "WEBVTT\n\nNOTE editorial note\nnot a cue\n\nhello\n00:00.000 --> 00:03.000 align:start\n<v Speaker><b>Welcome</b> &amp; hello\n",
      "example.vtt",
      "en",
    );
    expect(track.cues[0].text).toBe("Welcome & hello");
    expect(warnings).toHaveLength(3);
  });
  it("round-trips text, Unicode and timestamps through SRT and VTT", () => {
    const original = parseCaptions(SRT, "a.srt", "hi").track;
    for (const format of ["srt", "vtt"] as const)
      expect(
        parseCaptions(
          exportCaptions(original.cues, format),
          `b.${format}`,
          "hi",
        ).track.cues,
      ).toEqual(original.cues);
  });
  it("preserves literal angle brackets without creating HTML", () => {
    const cue = {
      id: "c1",
      startMs: 0,
      endMs: 2000,
      text: "If x < 5 & y > 2, use <script> as literal text.",
    };
    const saved = exportCaptions([cue], "vtt");
    expect(saved).not.toContain("<script>");
    expect(parseCaptions(saved, "a.vtt", "en").track.cues[0].text).toBe(
      cue.text,
    );
  });
  it("does not erase unescaped numerical inequalities in educational captions", () => {
    const text = "If x < 5 and y > 2, proceed.";
    expect(
      parseCaptions(`1\n00:00.000 --> 00:01.000\n${text}`, "math.srt", "en")
        .track.cues[0].text,
    ).toBe(text);
  });
  it("sorts cues and warns about overlap instead of silently dropping captions", () => {
    const parsed = parseCaptions(
      "2\n00:02.000 --> 00:04.000\nLater\n\n1\n00:00.000 --> 00:03.000\nEarlier",
      "a.srt",
      "en",
    );
    expect(parsed.track.cues.map((c) => c.text)).toEqual(["Earlier", "Later"]);
    expect(parsed.warnings).toHaveLength(2);
  });
  it.each([
    "",
    "random plain text",
    "1\n00:60:00,000 --> 00:61:00,000\nInvalid",
    "1\n00:00.000 --> 00:00.000\nZero duration",
    "1\n00:04.000 --> 00:02.000\nReversed",
    "1\n00:00.000 --> 00:02.000\n<i></i>",
    "WEBVTT\n00:00.000 --> 00:01.000\nNo blank header",
  ])("rejects malformed input: %s", (text) =>
    expect(() => parseCaptions(text, "a.srt", "en")).toThrow(),
  );
  it("rejects segmented VTT timestamp mappings instead of aligning the wrong timeline", () =>
    expect(() =>
      parseCaptions(
        "WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00.000,MPEGTS:900000\n\n00:00.000 --> 00:01.000\nHello",
        "a.vtt",
        "en",
      ),
    ).toThrow("timestamp maps"));
  it("bounds file bytes, cue lengths and total duration", () => {
    expect(() => parseCaptions("अ".repeat(700_000), "a.srt", "hi")).toThrow(
      "2 MB",
    );
    expect(() =>
      parseCaptions(
        `1\n00:00.000 --> 00:01.000\n${"a".repeat(4001)}`,
        "a.srt",
        "en",
      ),
    ).toThrow("too long");
    expect(() => parseTimestamp("05:00:00.000")).toThrow("4-hour");
  });
  it("formats fractional times without losing milliseconds", () => {
    expect(timestamp(3_661_023, true)).toBe("01:01:01.023");
    expect(timestamp(73_000)).toBe("01:13");
  });
});
