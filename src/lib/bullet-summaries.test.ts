import assert from "node:assert/strict";
import test from "node:test";
import { BULLET_SUMMARIES, formatBulletWithSummary } from "./bullet-summaries.ts";
import { defaultSelections } from "./matcher.ts";
import { buildRenderedDocument } from "./rendered-document.ts";
import { loadResumeMaster } from "./resume.ts";

const master = loadResumeMaster();

test("every master bullet has a concise bilingual summary phrase", () => {
  const bulletIds = master.sections.flatMap((section) => section.entries.flatMap((entry) => entry.bullets.map((bullet) => bullet.id)));
  assert.equal(Object.keys(BULLET_SUMMARIES).length, bulletIds.length);

  for (const bulletId of bulletIds) {
    const summary = BULLET_SUMMARIES[bulletId];
    assert.ok(summary, `missing summary for ${bulletId}`);
    assert.ok(summary.zh.trim().length > 0, `missing zh summary for ${bulletId}`);
    assert.ok(summary.en.trim().length > 0, `missing en summary for ${bulletId}`);
    assert.ok(summary.zh.length <= 14, `zh summary is too long for ${bulletId}`);
    assert.ok(summary.en.length <= 28, `en summary is too long for ${bulletId}`);
  }
});

test("new rendered resume bullets start with their summary phrase", () => {
  const selection = defaultSelections(master);

  for (const locale of ["zh", "en"] as const) {
    const document = buildRenderedDocument(master, selection, locale);
    for (const section of document.sections) {
      for (const entry of section.entries) {
        for (const bullet of entry.bullets) {
          const expected = BULLET_SUMMARIES[bullet.id][locale];
          assert.ok(bullet.text.startsWith(expected), `${bullet.id} should start with ${expected}`);
        }
      }
    }
  }
});

test("summary formatter keeps the evidence sentence unchanged", () => {
  assert.equal(
    formatBulletWithSummary("p9701-tradeoff", "保留正文。", "zh"),
    "产品取舍｜保留正文。",
  );
  assert.equal(
    formatBulletWithSummary("p9701-tradeoff", "Keep the evidence sentence.", "en"),
    "Product trade-off — Keep the evidence sentence.",
  );
});
