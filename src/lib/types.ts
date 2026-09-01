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

export type ApplicationSnapshot = {
  schemaVersion: 1;
  masterRevision: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  jd: string;
  locale: Locale;
  selection: SelectionState;
  renderedText: Record<string, string>;
};

export type SnapshotStore = {
  schemaVersion: 1;
  activeId: string | null;
  applications: ApplicationSnapshot[];
};
