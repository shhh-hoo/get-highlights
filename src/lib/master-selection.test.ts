import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import YAML from "yaml";
import { defaultSelections, recommendSelections } from "./matcher.ts";
import type { ResumeMaster } from "./types.ts";

function loadMaster(): ResumeMaster {
  const parsed = YAML.parse(fs.readFileSync("content/resume.master.yaml", "utf8")) as Omit<ResumeMaster, "revision">;
  return { ...parsed, revision: "test" };
}

function countSection(master: ResumeMaster, selection: ReturnType<typeof defaultSelections>, sectionId: string) {
  const section = master.sections.find((item) => item.id === sectionId);
  if (!section) return 0;
  return section.entries.flatMap((entry) => entry.bullets).filter((bullet) => selection[bullet.id]?.enabled).length;
}

test("real master default composition obeys section budgets", () => {
  const master = loadMaster();
  const selection = defaultSelections(master);
  assert.ok(countSection(master, selection, "work") <= 7);
  assert.ok(countSection(master, selection, "education") <= 1);
  assert.ok(countSection(master, selection, "projects") <= 8);
  assert.equal(selection["hailiang-outcomes"]?.enabled, true);
});

test("generic AI PM matching still retains strong outcome evidence", () => {
  const master = loadMaster();
  const selection = recommendSelections(master, "AI product manager responsible for user research, product strategy, LLM evaluation, cross-functional delivery and roadmap prioritization");
  assert.equal(selection["hailiang-outcomes"]?.enabled, true);
  assert.ok(countSection(master, selection, "projects") <= 8);
});
