import type { Bullet, Entry, Profile, ResumeMaster, SelectionState } from "./types";

const PROFILE_HINTS: Record<Profile, string[]> = {
  ai_product: ["ai", "llm", "agent", "product", "eval", "evaluation", "prompt", "rag", "workflow", "guardrail", "用户", "产品", "人工智能", "模型", "评测"],
  education_product: ["education", "learning", "curriculum", "student", "teacher", "assessment", "edtech", "教育", "学习", "课程", "学生", "教师", "测评"],
  solutions: ["solution", "implementation", "stakeholder", "delivery", "customer", "rollout", "adoption", "实施", "交付", "客户", "协调", "落地"],
  technical: ["technical", "engineering", "api", "system", "architecture", "typescript", "react", "sql", "技术", "工程", "系统", "架构"],
};

const STOP = new Set(["and", "the", "with", "for", "you", "our", "are", "will", "that", "from", "this", "have", "your", "及", "与", "和", "的", "在", "为", "对", "将", "等", "具备", "负责"]);
const STRONG_EVIDENCE_TERMS = [
  "outcome", "outcomes", "result", "results", "metric", "metrics", "award", "deployed", "production", "release",
  "real users", "adoption", "used", "领先", "真实用户", "上线", "获奖", "结果", "成绩", "生产", "发布",
];

const SECTION_BUDGETS: Record<string, number> = {
  work: 7,
  education: 1,
  projects: 8,
};

function tokens(input: string): string[] {
  return Array.from(new Set(
    input
      .toLowerCase()
      .replace(/[，。；、：:()（）/\\|]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1 && !STOP.has(token)),
  ));
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

export function evidenceStrength(bullet: Bullet) {
  const text = `${bullet.facts.join(" ")} ${bullet.variants.flatMap((variant) => variant.tags).join(" ")}`.toLowerCase();
  let score = Math.max(0, Math.min(1, bullet.priority ?? 0.5)) * 8;
  if (/\d/.test(text)) score += 5;
  if (/[+%*]/.test(text)) score += 2;
  for (const term of STRONG_EVIDENCE_TERMS) {
    if (text.includes(term)) score += 2.5;
  }
  return Math.min(24, score);
}

export function scoreBullet(bullet: Bullet, jdText: string) {
  const jdTokens = new Set(tokens(jdText));
  const evidence = evidenceStrength(bullet);
  const variants = bullet.variants.map((variant) => {
    const contentTerms = tokens(`${variant.text.zh} ${variant.text.en} ${variant.tags.join(" ")}`);
    const direct = overlapScore(jdTokens, contentTerms);
    const profile = overlapScore(jdTokens, PROFILE_HINTS[variant.profile]);
    const relevance = direct * 4 + profile * 2.5;
    return { profile: variant.profile, raw: relevance };
  });
  const best = [...variants].sort((a, b) => b.raw - a.raw)[0];
  const score = Math.min(99, Math.round(18 + best.raw * 6 + evidence));
  return { score, profile: best.profile, evidence };
}

type RankedBullet = {
  bullet: Bullet;
  entry: Entry;
  score: number;
  profile: Profile;
  evidence: number;
};

function selectWithinSection(sectionId: string, ranked: RankedBullet[]) {
  const budget = SECTION_BUDGETS[sectionId] ?? 6;
  const selected = new Set<string>();
  const perEntry = new Map<string, number>();
  const maxPerEntry = sectionId === "projects" ? 3 : budget;

  const add = (item: RankedBullet) => {
    if (selected.size >= budget || selected.has(item.bullet.id)) return false;
    const count = perEntry.get(item.entry.id) ?? 0;
    if (count >= maxPerEntry) return false;
    selected.add(item.bullet.id);
    perEntry.set(item.entry.id, count + 1);
    return true;
  };

  const evidenceAnchors = [...ranked]
    .filter((item) => item.evidence >= 18)
    .sort((a, b) => b.evidence - a.evidence || b.score - a.score)
    .slice(0, Math.min(2, budget));
  for (const item of evidenceAnchors) add(item);

  if (sectionId === "projects") {
    const entryIds = Array.from(new Set(ranked.map((item) => item.entry.id)));
    for (const entryId of entryIds) {
      const best = ranked
        .filter((item) => item.entry.id === entryId)
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score >= 38) add(best);
    }
  }

  for (const item of [...ranked].sort((a, b) => b.score - a.score)) {
    if (item.score >= 42 || item.evidence >= 18) add(item);
  }

  return selected;
}

export function recommendSelections(master: ResumeMaster, jdText: string): SelectionState {
  const result: SelectionState = {};

  for (const section of master.sections) {
    const ranked: RankedBullet[] = [];
    for (const entry of section.entries) {
      for (const bullet of entry.bullets) {
        ranked.push({ bullet, entry, ...scoreBullet(bullet, jdText) });
      }
    }

    const selected = selectWithinSection(section.id, ranked);
    for (const item of ranked) {
      result[item.bullet.id] = {
        enabled: selected.has(item.bullet.id),
        profile: item.profile,
        score: item.score,
      };
    }
  }

  return result;
}

function defaultRank(bullet: Bullet, index: number) {
  return evidenceStrength(bullet) + Math.max(0, 5 - index) * 0.8;
}

export function defaultSelections(master: ResumeMaster): SelectionState {
  const result: SelectionState = {};

  for (const section of master.sections) {
    const ranked: RankedBullet[] = [];
    for (const entry of section.entries) {
      entry.bullets.forEach((bullet, index) => {
        ranked.push({
          bullet,
          entry,
          score: defaultRank(bullet, index) + 40,
          profile: bullet.default_profile ?? bullet.variants[0].profile,
          evidence: evidenceStrength(bullet),
        });
      });
    }

    const selected = selectWithinSection(section.id, ranked);
    for (const item of ranked) {
      result[item.bullet.id] = {
        enabled: selected.has(item.bullet.id),
        profile: item.profile,
      };
    }
  }

  return result;
}
