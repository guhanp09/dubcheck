import {
  MAX_CUES,
  MAX_IMPORT_BYTES,
  MAX_TIME,
  TrackSchema,
  type Cue,
  type Language,
  type Track,
} from "./types";

export function timestamp(ms: number, full = false): string {
  const n = Math.max(0, Math.round(ms));
  const h = Math.floor(n / 3_600_000),
    m = Math.floor(n / 60_000) % 60,
    s = Math.floor(n / 1000) % 60;
  if (!full)
    return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(n % 1000).padStart(3, "0")}`;
}

export function parseTimestamp(raw: string): number {
  const match = raw.match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/);
  if (!match || +match[2] > 59 || +match[3] > 59)
    throw new Error(`Invalid caption timestamp: ${raw}`);
  const n =
    (+(match[1] || 0) * 3600 + +match[2] * 60 + +match[3]) * 1000 + +match[4];
  if (n > MAX_TIME)
    throw new Error("Caption exceeds the 4-hour workspace limit.");
  return n;
}

export function plainCaption(raw: string): string {
  // Caption markup is treated as formatting, never as executable HTML.
  return raw
    .replace(/<\/?[a-z][^>]*>|<\d{2}:\d{2}(?::\d{2})?\.\d{3}>/gi, "")
    .replace(
      /&(amp|lt|gt|nbsp|quot|apos);/g,
      (_, name: string) =>
        ({ amp: "&", lt: "<", gt: ">", nbsp: " ", quot: '"', apos: "'" })[
          name
        ] || "",
    )
    .trim();
}

export function parseCaptions(
  input: string,
  name: string,
  language: Language,
): { track: Track; warnings: string[] } {
  if (new TextEncoder().encode(input).length > MAX_IMPORT_BYTES)
    throw new Error("Caption file must be smaller than 2 MB.");
  const normalized = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!normalized) throw new Error("The caption file is empty.");
  const isVtt = normalized.startsWith("WEBVTT");
  const blocks = normalized.split(/\n[\t ]*\n/);
  const cues: Cue[] = [],
    warnings = new Set<string>();
  if (isVtt) {
    const header = blocks.shift()!;
    if (header.includes("-->"))
      throw new Error("WEBVTT requires a blank line after the header.");
    if (/X-TIMESTAMP-MAP/.test(header))
      throw new Error(
        "Segmented VTT timestamp maps are not supported. Export a complete transcript first.",
      );
  }
  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split("\n");
    if (isVtt && /^(NOTE(?:\s|$)|STYLE\s*$|REGION\s*$)/.test(lines[0])) {
      warnings.add(
        "VTT notes, regions and styles are omitted from the plain-text handoff.",
      );
      continue;
    }
    const timeLine = lines[0].includes("-->") ? 0 : 1;
    const match = lines[timeLine]?.match(
      /^(\S+)\s+-->\s+(\S+)(?:[ \t]+(.*))?$/,
    );
    if (!match)
      throw new Error(
        `Caption block ${i + 1} has no valid timestamp line. Import SRT or WebVTT.`,
      );
    const startMs = parseTimestamp(match[1]),
      endMs = parseTimestamp(match[2]);
    if (endMs <= startMs)
      throw new Error(`Caption block ${i + 1} ends before it starts.`);
    if (match[3])
      warnings.add(
        "Caption positioning is omitted; text and timestamps are preserved.",
      );
    const original = lines.slice(timeLine + 1).join("\n");
    if (/<\/?[a-z][^>]*>|<\d{2}:\d{2}(?::\d{2})?\.\d{3}>/i.test(original))
      warnings.add(
        "Caption formatting tags are removed for transcript comparison.",
      );
    const text = plainCaption(original);
    if (!text)
      throw new Error(`Caption block ${i + 1} contains no spoken text.`);
    if (text.length > 4000)
      throw new Error(
        `Caption block ${i + 1} is too long (4,000 characters maximum).`,
      );
    cues.push({ id: `c${cues.length + 1}`, startMs, endMs, text });
    if (cues.length > MAX_CUES)
      throw new Error(`Use at most ${MAX_CUES} captions per track.`);
  }
  if (!cues.length) throw new Error("No captions were found.");
  if (cues.some((c, i) => i && c.startMs < cues[i - 1].startMs))
    warnings.add("Out-of-order captions were sorted by start time.");
  cues.sort((a, b) => a.startMs - b.startMs);
  if (cues.some((c, i) => i && c.startMs < cues[i - 1].endMs))
    warnings.add(
      "Overlapping captions may form larger review passages; check the pairing.",
    );
  const track = TrackSchema.parse({
    name: name.slice(0, 180) || "Imported captions",
    language,
    cues,
  });
  return { track, warnings: [...warnings] };
}

export function exportCaptions(cues: Cue[], format: "srt" | "vtt"): string {
  const encode = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const time = (n: number) =>
    format === "srt"
      ? timestamp(n, true).replace(".", ",")
      : timestamp(n, true);
  return (
    (format === "vtt" ? "WEBVTT\n\n" : "") +
    cues
      .map(
        (c, i) =>
          `${i + 1}\n${time(c.startMs)} --> ${time(c.endMs)}\n${encode(c.text).replace(/\n\s*\n/g, "\n")}`,
      )
      .join("\n\n") +
    "\n"
  );
}
