import type { Locale, LocalizedText } from "./types";

export const BULLET_SUMMARIES: Record<string, LocalizedText> = {
  "hailiang-rollout": { zh: "课程体系落地", en: "Curriculum rollout" },
  "hailiang-assets": { zh: "课程资产产品化", en: "Reusable curriculum assets" },
  "hailiang-lifecycle": { zh: "学生全周期决策", en: "Student lifecycle decisions" },
  "hailiang-chem-system": { zh: "0→1 教学体系", en: "0→1 learning system" },
  "hailiang-enablement": { zh: "教师赋能与实验交付", en: "Teacher enablement" },
  "hailiang-outcomes": { zh: "结果闭环", en: "Outcomes & iteration" },
  "emq-production": { zh: "生产级工程交付", en: "Production engineering" },
  "emq-collaboration": { zh: "跨团队技术协作", en: "Cross-functional delivery" },
  "bristol-scaffolding": { zh: "自适应支架", en: "Adaptive scaffolding" },
  "bristol-research": { zh: "用户研究", en: "User research" },
  "cuelayer-thesis": { zh: "产品原则", en: "Product thesis" },
  "cuelayer-grammar": { zh: "AI 与执行边界", en: "AI/runtime boundary" },
  "cuelayer-architecture": { zh: "实时架构与验证", en: "Realtime architecture" },
  "p9701-real-use": { zh: "0→1 产品落地", en: "0→1 product delivery" },
  "p9701-tradeoff": { zh: "产品取舍", en: "Product trade-off" },
  "p9701-ai-boundary": { zh: "AI 使用边界", en: "AI boundary" },
  "raku-problem": { zh: "学习问题建模", en: "Learning problem framing" },
  "raku-boundary": { zh: "Agent 行为边界", en: "Agent boundary" },
  "raku-eval": { zh: "Eval 与迭代", en: "Evaluation loop" },
  "foundry-lifecycle": { zh: "平台生命周期", en: "Platform lifecycle" },
  "foundry-ai-boundary": { zh: "AI 治理边界", en: "AI governance" },
};

export function getBulletSummary(bulletId: string, locale: Locale) {
  return BULLET_SUMMARIES[bulletId]?.[locale] ?? "";
}

export function formatBulletWithSummary(bulletId: string, body: string, locale: Locale) {
  const summary = getBulletSummary(bulletId, locale);
  if (!summary) return body;
  return locale === "zh" ? `${summary}｜${body}` : `${summary} — ${body}`;
}
