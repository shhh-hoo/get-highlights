export type Locale = "zh" | "en";
export type Profile = "ai_product" | "education_product" | "solutions" | "technical";

export type LocalizedText = {
  zh: string;
  en: string;
};

export type BulletVariant = {
  profile: Profile;
  text: LocalizedText;
  tags: string[];
};

export type Bullet = {
  id: string;
  facts: string[];
  variants: BulletVariant[];
  default_profile?: Profile;
  priority?: number;
};

export type Entry = {
  id: string;
  title: LocalizedText;
  subtitle?: LocalizedText;
  meta?: LocalizedText;
  bullets: Bullet[];
};

export type Section = {
  id: string;
  title: LocalizedText;
  entries: Entry[];
};

export type ResumeMaster = {
  revision: string;
  identity: {
    name: string;
    headline: LocalizedText;
    contact: string[];
  };
  metrics: Array<{ value: string; label: LocalizedText }>;
  sections: Section[];
  about: {
    title: LocalizedText;
    paragraphs: LocalizedText[];
  };
  skills: Array<{ label: LocalizedText; items: string[] }>;
};

export type BulletSelection = {
  enabled: boolean;
  profile: Profile;
  score?: number;
};

export type SelectionState = Record<string, BulletSelection>;

export type RenderedEntry = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  bullets: Array<{ id: string; text: string }>;
};

export type RenderedSection = {
  id: string;
  title: string;
  entries: RenderedEntry[];
};

export type RenderedResumeDocument = {
  identity: {
    name: string;
    headline: string;
    contact: string[];
  };
  metrics: Array<{ value: string; label: string }>;
  sections: RenderedSection[];
  about: {
    title: string;
    paragraphs: string[];
  };
  skills: {
    title: string;
    groups: Array<{ label: string; items: string[] }>;
  };
};

export type ApplicationSnapshot = {
  schemaVersion: 2;
  masterRevision: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  jd: string;
  locale: Locale;
  selection: SelectionState;
  renderedText: Record<string, string>;
  renderedDocument?: RenderedResumeDocument;
};

export type SnapshotStore = {
  schemaVersion: 2;
  activeId: string | null;
  applications: ApplicationSnapshot[];
};
