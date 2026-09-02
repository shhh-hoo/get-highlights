import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { BULLET_SUMMARIES } from "./bullet-summaries.ts";
import type { ResumeMaster } from "./types";

export function loadResumeMaster(): ResumeMaster {
  const filePath = path.join(process.cwd(), "content", "resume.master.yaml");
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = YAML.parse(source) as Omit<ResumeMaster, "revision">;
  const revision = createHash("sha256")
    .update(source)
    .update(JSON.stringify(BULLET_SUMMARIES))
    .digest("hex")
    .slice(0, 12);
  return { ...parsed, revision };
}
