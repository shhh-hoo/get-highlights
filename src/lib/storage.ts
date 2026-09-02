import type {
  ApplicationSnapshot,
  Locale,
  Profile,
  RenderedResumeDocument,
  SelectionState,
  SnapshotStore,
} from "@/lib/types";

const STORAGE_KEY = "get-highlights:applications:v2";
const LEGACY_STORAGE_KEY = "get-highlights:applications:v1";
const VALID_PROFILES = new Set<Profile>(["ai_product", "education_product", "solutions", "technical"]);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `application-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validSelection(value: unknown): value is SelectionState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const candidate = item as { enabled?: unknown; profile?: unknown; score?: unknown };
    return (
      typeof candidate.enabled === "boolean" &&
      typeof candidate.profile === "string" &&
      VALID_PROFILES.has(candidate.profile as Profile) &&
      (candidate.score === undefined || typeof candidate.score === "number")
    );
  });
}

function validRenderedDocument(value: unknown): value is RenderedResumeDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<RenderedResumeDocument>;
  return Boolean(
    candidate.identity &&
    typeof candidate.identity.name === "string" &&
    typeof candidate.identity.headline === "string" &&
    Array.isArray(candidate.identity.contact) &&
    Array.isArray(candidate.metrics) &&
    Array.isArray(candidate.sections) &&
    candidate.about &&
    typeof candidate.about.title === "string" &&
    Array.isArray(candidate.about.paragraphs) &&
    candidate.skills &&
    typeof candidate.skills.title === "string" &&
    Array.isArray(candidate.skills.groups)
  );
}

function normalizeImportedSnapshot(parsed: Record<string, unknown>, suffix: string): ApplicationSnapshot | null {
  if (
    typeof parsed.id !== "string" ||
    typeof parsed.name !== "string" ||
    typeof parsed.jd !== "string" ||
    (parsed.locale !== "zh" && parsed.locale !== "en") ||
    !validSelection(parsed.selection)
  ) return null;

  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    masterRevision: typeof parsed.masterRevision === "string" ? parsed.masterRevision : "legacy-unknown",
    id: createId(),
    name: `${parsed.name}${suffix}`,
    createdAt: now,
    updatedAt: now,
    jd: parsed.jd,
    locale: parsed.locale as Locale,
    selection: parsed.selection,
    renderedText: parsed.renderedText && typeof parsed.renderedText === "object" && !Array.isArray(parsed.renderedText)
      ? parsed.renderedText as Record<string, string>
      : {},
    renderedDocument: validRenderedDocument(parsed.renderedDocument) ? parsed.renderedDocument : undefined,
  };
}

function parseStore(raw: string): SnapshotStore | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!Array.isArray(parsed.applications)) return null;

    const applications = parsed.applications
      .map((application) => normalizeImportedSnapshot(application as Record<string, unknown>, ""))
      .filter((application): application is ApplicationSnapshot => Boolean(application));

    if (!applications.length) return null;
    const requestedActive = typeof parsed.activeId === "string" ? parsed.activeId : null;
    const activeId = applications.some((application) => application.id === requestedActive)
      ? requestedActive
      : applications[0].id;

    return { schemaVersion: 2, activeId, applications };
  } catch {
    return null;
  }
}

export function loadSnapshotStore(): SnapshotStore | null {
  if (typeof window === "undefined") return null;
  const current = window.localStorage.getItem(STORAGE_KEY);
  if (current) {
    try {
      const parsed = JSON.parse(current) as SnapshotStore;
      if (
        parsed.schemaVersion === 2 &&
        Array.isArray(parsed.applications) &&
        parsed.applications.every((application) => validSelection(application.selection))
      ) return parsed;
    } catch {
      // fall through to legacy migration
    }
  }

  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return null;
  const migrated = parseStore(legacy);
  if (migrated) saveSnapshotStore(migrated);
  return migrated;
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
  renderedDocument,
  masterRevision,
}: {
  name: string;
  jd: string;
  locale: Locale;
  selection: SelectionState;
  renderedText: Record<string, string>;
  renderedDocument: RenderedResumeDocument;
  masterRevision: string;
}): ApplicationSnapshot {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    masterRevision,
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    jd,
    locale,
    selection,
    renderedText,
    renderedDocument,
  };
}

export function duplicateSnapshot(snapshot: ApplicationSnapshot): ApplicationSnapshot {
  const now = new Date().toISOString();
  return {
    ...snapshot,
    schemaVersion: 2,
    id: createId(),
    name: `${snapshot.name} copy`,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseSnapshotJson(raw: string): ApplicationSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return normalizeImportedSnapshot(parsed, " imported");
  } catch {
    return null;
  }
}
