import type {
  Locale,
  RenderedResumeDocument,
  ResumeMaster,
  SelectionState,
} from "./types";

export function getBulletText(master: ResumeMaster, bulletId: string, selection: SelectionState[string], locale: Locale) {
  for (const section of master.sections) {
    for (const entry of section.entries) {
      const bullet = entry.bullets.find((item) => item.id === bulletId);
      if (!bullet) continue;
      const variant = bullet.variants.find((item) => item.profile === selection.profile) ?? bullet.variants[0];
      return variant.text[locale];
    }
  }
  return "";
}

export function buildRenderedDocument(
  master: ResumeMaster,
  selection: SelectionState,
  locale: Locale,
): RenderedResumeDocument {
  const sections = master.sections.map((section) => ({
    id: section.id,
    title: section.title[locale],
    entries: section.entries
      .map((entry) => ({
        id: entry.id,
        title: entry.title[locale],
        subtitle: entry.subtitle?.[locale],
        meta: entry.meta?.[locale],
        bullets: entry.bullets
          .filter((bullet) => selection[bullet.id]?.enabled)
          .map((bullet) => ({
            id: bullet.id,
            text: getBulletText(master, bullet.id, selection[bullet.id], locale),
          })),
      }))
      .filter((entry) => entry.bullets.length > 0),
  }));

  return {
    identity: {
      name: master.identity.name,
      headline: master.identity.headline[locale],
      contact: [...master.identity.contact],
    },
    metrics: master.metrics.map((metric) => ({ value: metric.value, label: metric.label[locale] })),
    sections,
    about: {
      title: master.about.title[locale],
      paragraphs: master.about.paragraphs.map((paragraph) => paragraph[locale]),
    },
    skills: {
      title: locale === "zh" ? "核心能力" : "CORE CAPABILITIES",
      groups: master.skills.map((skill) => ({ label: skill.label[locale], items: [...skill.items] })),
    },
  };
}

export function reconcileRenderedDocument({
  master,
  previousDocument,
  previousSelection,
  nextSelection,
  locale,
}: {
  master: ResumeMaster;
  previousDocument: RenderedResumeDocument;
  previousSelection: SelectionState;
  nextSelection: SelectionState;
  locale: Locale;
}) {
  const next = buildRenderedDocument(master, nextSelection, locale);
  const previousSections = new Map(previousDocument.sections.map((section) => [section.id, section]));
  const previousBulletText = renderedTextMap(previousDocument);

  next.identity = previousDocument.identity;
  next.metrics = previousDocument.metrics;
  next.about = previousDocument.about;
  next.skills = previousDocument.skills;

  next.sections = next.sections.map((section) => {
    const oldSection = previousSections.get(section.id);
    const oldEntries = new Map(oldSection?.entries.map((entry) => [entry.id, entry]) ?? []);
    return {
      ...section,
      title: oldSection?.title ?? section.title,
      entries: section.entries.map((entry) => {
        const oldEntry = oldEntries.get(entry.id);
        return {
          ...entry,
          title: oldEntry?.title ?? entry.title,
          subtitle: oldEntry?.subtitle ?? entry.subtitle,
          meta: oldEntry?.meta ?? entry.meta,
          bullets: entry.bullets.map((bullet) => {
            const before = previousSelection[bullet.id];
            const after = nextSelection[bullet.id];
            const canPreserve = Boolean(
              before?.enabled &&
              after?.enabled &&
              before.profile === after.profile &&
              previousBulletText[bullet.id],
            );
            return canPreserve ? { ...bullet, text: previousBulletText[bullet.id] } : bullet;
          }),
        };
      }),
    };
  });

  return next;
}

export function renderedTextMap(document: RenderedResumeDocument) {
  const rendered: Record<string, string> = {};
  for (const section of document.sections) {
    for (const entry of section.entries) {
      for (const bullet of entry.bullets) rendered[bullet.id] = bullet.text;
    }
  }
  return rendered;
}
