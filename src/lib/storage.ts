import type { ApplicationSnapshot, Locale, SelectionState, SnapshotStore } from "@/lib/types";

const STORAGE_KEY = "get-highlights:applications:v1";
export const MASTER_REVISION = "resume.master.v0";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `application-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSnapshotStore(): SnapshotStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SnapshotStore;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.applications)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSnapshotStore(store: SnapshotStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function makeSnapshot({
  name,
  jd,
  locale,
  selection,
  renderedText,
}: {
  name: string;
  jd: string;
  locale: Locale;
  selection: SelectionState;
  renderedText: Record<string, string>;
}): ApplicationSnapshot {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    masterRevision: MASTER_REVISION,
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    jd,
    locale,
    selection,
    renderedText,
  };
}

export function duplicateSnapshot(snapshot: ApplicationSnapshot): ApplicationSnapshot {
  return makeSnapshot({
    name: `${snapshot.name} copy`,
    jd: snapshot.jd,
    locale: snapshot.locale,
    selection: snapshot.selection,
    renderedText: snapshot.renderedText,
  });
}

export function parseSnapshotJson(raw: string): ApplicationSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as ApplicationSnapshot;
    if (
      parsed.schemaVersion !== 1 ||
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.jd !== "string" ||
      (parsed.locale !== "zh" && parsed.locale !== "en") ||
      !parsed.selection ||
      typeof parsed.selection !== "object"
    ) return null;
    return {
      ...parsed,
      id: createId(),
      name: `${parsed.name} imported`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      masterRevision: parsed.masterRevision || MASTER_REVISION,
      renderedText: parsed.renderedText ?? {},
    };
  } catch {
    return null;
  }
}
