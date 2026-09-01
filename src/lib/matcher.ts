import type { Bullet, Profile, ResumeMaster, SelectionState } from "./types";

const PROFILE_HINTS: Record<Profile, string[]> = {
  ai_product: ["ai", "llm", "agent", "product", "eval", "evaluation", "prompt", "rag", "workflow", "guardrail", "用户", "产品", "人工智能", "模型", "评测"],
  education_product: ["education", "learning", "curriculum", "student", "teacher", "assessment", "edtech", "教育", "学习", "课程", "学生", "教师", "测评"],
  solutions: ["solution", "implementation", "stakeholder", "delivery", "customer", "rollout", "adoption", "实施", "交付", "客户", "协调", "落地"],
  technical: ["technical", "engineering", "api", "system", "architecture", "typescript", "react", "sql", "技术", "工程", "系统", "架构"],
};

const STOP = new Set(["and", "the", "with", "for", "you", "our", "are", "will", "that", "from", "this", "have", "your", "及", "与", "和", "的", "在", "为", "对", "将", "等", "具备", "负责"]);

function tokens(input: string): string[] {
  return Array.from(new Set(input.toLowerCase().replace(/[，。；、：:()（）/\\|]+/g, " ").split(/\s+/).map((token) => token.trim()).filter((token) => token.length > 1 && !STOP.has(token))));
}

function overlapScore(jd: Set<string>, terms: string[]) {
  if (!terms.length) return 0;
  let hits = 0;
  for (const term of terms) {
    const normalized = term.toLowerCase();
    if (jd.has(normalized)) hits += 1;
    else if ([...jd].some((token) => normalized.includes(token) || token.includes(normalized))) hits += 0.55;
  }
  return hits;
}

export function scoreBullet(bullet: Bullet, jdText: string) {
  const jdTokens = new Set(tokens(jdText));
  const variants = bullet.variants.map((variant) => {
    const contentTerms = tokens(`${variant.text.zh} ${variant.text.en} ${variant.tags.join(" ")}`);
    const direct = overlapScore(jdTokens, contentTerms);
    const profile = overlapScore(jdTokens, PROFILE_HINTS[variant.profile]);
    return { profile: variant.profile, raw: direct * 4 + profile * 2.5 };
  });
  const best = [...variants].sort((a, b) => b.raw - a.raw)[0];
  const score = Math.min(99, Math.round(22 + best.raw * 7));
  return { score, profile: best.profile };
}

export function recommendSelections(master: ResumeMaster, jdText: string): SelectionState {
  const result: SelectionState = {};
  for (const section of master.sections) {
    for (const entry of section.entries) {
      const scored = entry.bullets.map((bullet) => ({ bullet, ...scoreBullet(bullet, jdText) }));
      const maxSelected = section.id === "projects" ? 3 : 5;
      const rankedIds = new Set([...scored].sort((a, b) => b.score - a.score).slice(0, maxSelected).filter((item) => item.score >= 42).map((item) => item.bullet.id));
      scored.forEach(({ bullet, score, profile }) => {
        result[bullet.id] = { enabled: rankedIds.has(bullet.id), profile, score };
      });
    }
  }
  return result;
}

export function defaultSelections(master: ResumeMaster): SelectionState {
  const result: SelectionState = {};
  for (const section of master.sections) {
    for (const entry of section.entries) {
      entry.bullets.forEach((bullet, index) => {
        const limit = section.id === "projects" ? 3 : 5;
        result[bullet.id] = { enabled: index < limit, profile: bullet.default_profile ?? bullet.variants[0].profile };
      });
    }
  }
  return result;
}
