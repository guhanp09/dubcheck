import { z } from "zod";

export const LANGUAGES = { en: "English", hi: "Hindi", ta: "Tamil" } as const;
export const LanguageSchema = z.enum(["en", "hi", "ta"]);
export type Language = z.infer<typeof LanguageSchema>;
export const MAX_CUES = 1000;
export const MAX_IMPORT_BYTES = 2_000_000;
export const MAX_BACKUP_BYTES = 8_000_000;
export const MAX_TIME = 14_400_000;
const Id = z.string().regex(/^[a-zA-Z0-9_.:-]{1,100}$/);
export const CueSchema = z
  .object({
    id: Id,
    startMs: z.number().int().min(0).max(MAX_TIME),
    endMs: z.number().int().min(1).max(MAX_TIME),
    text: z.string().trim().min(1).max(4000),
  })
  .strict()
  .refine((c) => c.endMs > c.startMs, "Cue end must follow its start");
export type Cue = z.infer<typeof CueSchema>;
export const TrackSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    language: LanguageSchema,
    cues: z.array(CueSchema).min(1).max(MAX_CUES),
  })
  .strict()
  .superRefine((track, ctx) => {
    const ids = new Set<string>();
    track.cues.forEach((cue, i) => {
      if (ids.has(cue.id))
        ctx.addIssue({ code: "custom", message: "Duplicate cue ID" });
      ids.add(cue.id);
      if (i && cue.startMs < track.cues[i - 1].startMs)
        ctx.addIssue({
          code: "custom",
          message: "Cues must be in chronological order",
        });
    });
    if (track.cues.reduce((n, c) => n + c.text.length, 0) > 500_000)
      ctx.addIssue({ code: "custom", message: "Transcript text is too large" });
  });
export type Track = z.infer<typeof TrackSchema>;
export const GlossarySchema = z
  .object({
    id: Id,
    source: z.string().trim().min(1).max(100),
    translations: z.array(z.string().trim().min(1).max(100)).min(1).max(12),
  })
  .strict();
export type GlossaryEntry = z.infer<typeof GlossarySchema>;
export const DecisionSchema = z
  .object({
    groupId: z.string().min(1).max(100),
    basis: z.string().max(1_200_000),
    status: z.enum(["accepted", "correction", "uncertain"]),
    reviewer: z.string().trim().min(1).max(100),
    note: z.string().trim().min(3).max(2000),
    corrections: z.record(Id, z.string().trim().min(1).max(4000)),
    audioChecked: z.boolean(),
    decidedAt: z.iso.datetime(),
  })
  .strict();
export type Decision = z.infer<typeof DecisionSchema>;
export const ProjectSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: Id,
    title: z.string().trim().min(1).max(180),
    source: TrackSchema,
    target: TrackSchema,
    offsetMs: z.number().int().min(-600_000).max(600_000),
    glossary: z.array(GlossarySchema).max(100),
    manualGroups: z
      .array(
        z
          .object({
            id: Id,
            sourceIds: z.array(Id).min(1).max(MAX_CUES),
            targetIds: z.array(Id).max(MAX_CUES),
          })
          .strict(),
      )
      .max(MAX_CUES),
    decisions: z.array(DecisionSchema).max(2000),
    updatedAt: z.iso.datetime(),
    sample: z.boolean(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.source.language === p.target.language)
      ctx.addIssue({
        code: "custom",
        message: "Choose different source and target languages",
      });
    const src = new Set(p.source.cues.map((c) => c.id));
    const dst = new Set(p.target.cues.map((c) => c.id));
    const usedS = new Set<string>(),
      usedT = new Set<string>(),
      usedM = new Set<string>();
    for (const g of p.manualGroups) {
      if (usedM.has(g.id))
        ctx.addIssue({
          code: "custom",
          message: "Duplicate manual pairing ID",
        });
      usedM.add(g.id);
      for (const id of g.sourceIds) {
        if (!src.has(id) || usedS.has(id))
          ctx.addIssue({
            code: "custom",
            message: "Manual pairing has missing or reused source cues",
          });
        usedS.add(id);
      }
      for (const id of g.targetIds) {
        if (!dst.has(id) || usedT.has(id))
          ctx.addIssue({
            code: "custom",
            message: "Manual pairing has missing or reused dub cues",
          });
        usedT.add(id);
      }
    }
    if (new Set(p.glossary.map((g) => g.id)).size !== p.glossary.length)
      ctx.addIssue({ code: "custom", message: "Duplicate glossary ID" });
  });
export type Project = z.infer<typeof ProjectSchema>;
export function validateProject(data: unknown): Project {
  const project = ProjectSchema.parse(data);
  if (
    new TextEncoder().encode(JSON.stringify(project, null, 2)).length >
    MAX_BACKUP_BYTES
  )
    throw new Error(
      "This workspace would exceed the 8 MB backup limit. Export its current backup and start a new workspace before adding more history.",
    );
  return project;
}
export type RiskKind =
  "quantity" | "negation" | "glossary" | "alignment" | "number-format";
export interface Risk {
  kind: RiskKind;
  severity: "high" | "medium";
  title: string;
  detail: string;
  sourceEvidence: string[];
  targetEvidence: string[];
}
export interface Group {
  id: string;
  source: Cue[];
  target: Cue[];
  startMs: number;
  endMs: number;
  coverage: number;
  manual: boolean;
  risks: Risk[];
  basis: string;
}
