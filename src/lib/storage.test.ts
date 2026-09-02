import assert from "node:assert/strict";
import test from "node:test";
import { parseSnapshotJson } from "./storage.ts";

test("rejects invalid bullet selection profiles", () => {
  const snapshot = {
    schemaVersion: 2,
    masterRevision: "abc",
    id: "x",
    name: "Bad",
    jd: "JD",
    locale: "zh",
    selection: {
      bullet: { enabled: true, profile: "invented-profile" },
    },
  };
  assert.equal(parseSnapshotJson(JSON.stringify(snapshot)), null);
});

test("rejects non-boolean enabled states", () => {
  const snapshot = {
    schemaVersion: 2,
    masterRevision: "abc",
    id: "x",
    name: "Bad",
    jd: "JD",
    locale: "en",
    selection: {
      bullet: { enabled: "yes", profile: "ai_product" },
    },
  };
  assert.equal(parseSnapshotJson(JSON.stringify(snapshot)), null);
});

test("accepts a structurally valid local snapshot", () => {
  const snapshot = {
    schemaVersion: 2,
    masterRevision: "abc",
    id: "x",
    name: "Valid",
    jd: "AI product role",
    locale: "en",
    selection: {
      bullet: { enabled: true, profile: "ai_product", score: 88 },
    },
    renderedText: { bullet: "Historical wording" },
  };
  const parsed = parseSnapshotJson(JSON.stringify(snapshot));
  assert.ok(parsed);
  assert.equal(parsed?.name, "Valid imported");
  assert.equal(parsed?.selection.bullet.profile, "ai_product");
});
