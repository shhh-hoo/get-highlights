import assert from "node:assert/strict";
import test from "node:test";
import { defaultSelections, evidenceStrength, recommendSelections } from "./matcher.ts";
import type { Bullet, Entry, ResumeMaster } from "./types.ts";

const text = (value: string) => ({ zh: value, en: value });

function bullet(id: string, tags: string[], facts: string[] = ["generic responsibility"]): Bullet {
  return {
    id,
    facts,
    default_profile: "ai_product",
    variants: [{ profile: "ai_product", tags, text: text(`${id} product delivery`) }],
  };
}

function entry(id: string, bullets: Bullet[]): Entry {
  return { id, title: text(id), bullets };
}

function master(projectEntries: Entry[]): ResumeMaster {
  return {
    revision: "test",
    identity: { name: "Test", headline: text("Product"), contact: [] },
    metrics: [],
    sections: [
      { id: "work", title: text("Work"), entries: [entry("work", [bullet("work-outcome", ["outcomes"], ["200+ real users", "production result"])])] },
      { id: "education", title: text("Education"), entries: [entry("education", [bullet("education-1", ["education"])])] },
      { id: "projects", title: text("Projects"), entries: projectEntries },
    ],
    about: { title: text("About"), paragraphs: [text("About")] },
    skills: [],
  };
}

test("evidence strength rewards measurable outcomes", () => {
  const strong = bullet("strong", ["outcomes", "deployed"], ["20+ real users", "deployed product"]);
  const weak = bullet("weak", ["product"], ["participated in product work"]);
  assert.ok(evidenceStrength(strong) > evidenceStrength(weak));
});

test("project recommendations respect one global eight-bullet budget and three-per-entry cap", () => {
  const projects = Array.from({ length: 4 }, (_, entryIndex) => entry(
    `project-${entryIndex}`,
    Array.from({ length: 4 }, (_, bulletIndex) => bullet(
      `p${entryIndex}-${bulletIndex}`,
      ["ai", "product", "llm", "eval", `keyword-${bulletIndex}`],
      [`${20 + bulletIndex}+ users`, "deployed result"],
    )),
  ));
  const resume = master(projects);
  const selection = recommendSelections(resume, "AI product LLM eval product delivery");
  const selected = projects.flatMap((project) => project.bullets.filter((item) => selection[item.id]?.enabled));
  assert.ok(selected.length <= 8);
  for (const project of projects) {
    assert.ok(project.bullets.filter((item) => selection[item.id]?.enabled).length <= 3);
    assert.ok(project.bullets.some((item) => selection[item.id]?.enabled));
  }
});

test("default selection also obeys document-level project budget", () => {
  const projects = Array.from({ length: 4 }, (_, entryIndex) => entry(
    `project-${entryIndex}`,
    Array.from({ length: 4 }, (_, bulletIndex) => bullet(`d${entryIndex}-${bulletIndex}`, ["product"])),
  ));
  const selection = defaultSelections(master(projects));
  const selectedCount = projects.flatMap((project) => project.bullets).filter((item) => selection[item.id]?.enabled).length;
  assert.equal(selectedCount, 8);
});
