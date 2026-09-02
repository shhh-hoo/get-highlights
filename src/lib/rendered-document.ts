import type { Locale, RenderedResumeDocument, ResumeMaster, SelectionState } from "./types";

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

export function renderedTextMap(document: RenderedResumeDocument) {
  const rendered: Record<string, string> = {};
  for (const section of document.sections) {
    for (const entry of section.entries) {
      for (const bullet of entry.bullets) rendered[bullet.id] = bullet.text;
    }
  }
  return rendered;
}
