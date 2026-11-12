import { useEffect, useRef, useState } from "react";
import { createDemo } from "./data/demo";
import { parseBackup } from "./domain/review";
import { readWorkspace, saveWorkspace, STORAGE_KEY } from "./domain/storage";
import { validateProject, type Project } from "./domain/types";

export function useWorkspace() {
  const [initial] = useState(() => {
    try {
      return readWorkspace(window.localStorage);
    } catch {
      return {
        raw: null,
        error:
          "Browser storage is unavailable. Export a backup to keep your work.",
      };
    }
  });
  const [project, setProject] = useState<Project>(
    () => initial.project || createDemo(),
  );
  const [warning, setWarning] = useState(initial.error || "");
  const [saved, setSaved] = useState(!!initial.project);
  const [conflict, setConflict] = useState(false);
  const expected = useRef(initial.raw);
  const blocked = useRef(!!initial.error);
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue !== expected.current) {
        setConflict(true);
        setSaved(false);
        setWarning(
          "Another tab changed this workspace. Load its copy, or export yours before replacing it.",
        );
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  function update(next: Project) {
    const validated = validateProject({
      ...next,
      updatedAt: new Date().toISOString(),
    });
    setProject(validated);
    setSaved(false);
    if (blocked.current || conflict) return;
    try {
      expected.current = saveWorkspace(
        window.localStorage,
        validated,
        expected.current,
      );
      setSaved(true);
      setWarning("");
    } catch (error) {
      setWarning(
        `Not saved in this browser. ${error instanceof Error ? error.message : "Export a backup to keep your work."}`,
      );
    }
  }
  function loadOther() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw)
        throw new Error(
          "No saved workspace remains. Export your current copy before saving it here.",
        );
      const next = parseBackup(raw);
      expected.current = raw;
      blocked.current = false;
      setProject(next);
      setSaved(true);
      setWarning("");
      setConflict(false);
    } catch (error) {
      setWarning(
        error instanceof Error
          ? error.message
          : "Could not open the saved workspace.",
      );
    }
  }
  function saveCurrent() {
    try {
      const raw = JSON.stringify(project);
      window.localStorage.setItem(STORAGE_KEY, raw);
      expected.current = raw;
      blocked.current = false;
      setSaved(true);
      setWarning("");
      setConflict(false);
    } catch {
      setWarning(
        "Browser storage is unavailable or full. Export a JSON backup to keep your work.",
      );
    }
  }
  return {
    project,
    update,
    warning,
    saved,
    conflict,
    loadOther,
    saveCurrent,
    unreadableRaw: initial.error ? initial.raw : null,
  };
}
