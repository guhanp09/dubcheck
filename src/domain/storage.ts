import { parseBackup } from "./review";
import type { Project } from "./types";

export const STORAGE_KEY = "dubcheck.workspace.v1";
export type Store = Pick<Storage, "getItem" | "setItem">;
export interface StoredWorkspace {
  project?: Project;
  raw: string | null;
  error?: string;
}
export function readWorkspace(storage: Store): StoredWorkspace {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    return { raw, project: raw ? parseBackup(raw) : undefined };
  } catch (error) {
    return {
      raw,
      error: `Saved workspace could not be opened. ${error instanceof Error ? error.message : "Browser storage is unavailable."}`,
    };
  }
}
export function saveWorkspace(
  storage: Store,
  project: Project,
  expectedRaw: string | null,
): string {
  const actual = storage.getItem(STORAGE_KEY);
  if (actual !== expectedRaw)
    throw new Error(
      "Another tab changed this workspace. Load its copy, or export yours before replacing it.",
    );
  const raw = JSON.stringify(project);
  storage.setItem(STORAGE_KEY, raw);
  return raw;
}
