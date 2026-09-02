import assert from "node:assert/strict";
import test from "node:test";
import { buildRenderedDocument, reconcileRenderedDocument } from "./rendered-document.ts";
import type { ResumeMaster, SelectionState } from "./types.ts";

const text = (value: string) => ({ zh: value, en: value });

function master(): ResumeMaster {
  return {
    revision: "new-master",
    identity: { name: "Test", headline: text("Headline"), contact: ["test@example.com"] },
    metrics: [],
    sections: [{
      id: "work",
      title: text("Work"),
      entries: [{
        id: "entry",
        title: text("Entry"),
        bullets: [{
          id: "bullet",
          facts: ["fact"],
          default_profile: "ai_product",
          variants: [
            { profile: "ai_product", tags: ["product"], text: text("NEW PRODUCT WORDING") },
            { profile: "solutions", tags: ["delivery"], text: text("NEW SOLUTIONS WORDING") },
          ],
        }],
      }],
    }],
    about: { title: text("About"), paragraphs: [text("About text")] },
    skills: [],
  };
}

test("keeps historical wording when the selected profile has not changed", () => {
  const resume = master();
  const selection: SelectionState = { bullet: { enabled: true, profile: "ai_product" } };
  const previous = buildRenderedDocument(resume, selection, "en");
  previous.sections[0].entries[0].bullets[0].text = "HISTORICAL WORDING";

  const reconciled = reconcileRenderedDocument({
    master: resume,
    previousDocument: previous,
    previousSelection: selection,
    nextSelection: selection,
    locale: "en",
  });

  assert.equal(reconciled.sections[0].entries[0].bullets[0].text, "HISTORICAL WORDING");
});

test("uses current master wording when the user explicitly changes profile", () => {
  const resume = master();
  const previousSelection: SelectionState = { bullet: { enabled: true, profile: "ai_product" } };
  const nextSelection: SelectionState = { bullet: { enabled: true, profile: "solutions" } };
  const previous = buildRenderedDocument(resume, previousSelection, "en");
  previous.sections[0].entries[0].bullets[0].text = "HISTORICAL WORDING";

  const reconciled = reconcileRenderedDocument({
    master: resume,
    previousDocument: previous,
    previousSelection,
    nextSelection,
    locale: "en",
  });

  assert.equal(reconciled.sections[0].entries[0].bullets[0].text, "NEW SOLUTIONS WORDING");
});
