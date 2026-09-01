import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { ResumeMaster } from "./types";

export function loadResumeMaster(): ResumeMaster {
  const filePath = path.join(process.cwd(), "content", "resume.master.yaml");
  const source = fs.readFileSync(filePath, "utf8");
  return YAML.parse(source) as ResumeMaster;
}
