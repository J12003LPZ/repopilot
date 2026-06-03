export type ReadmeSectionKey =
  | "setup"
  | "usage"
  | "environment variables"
  | "screenshots or demo"
  | "license"
  | "tech stack";

export type ReadmeSectionAnalysis = {
  score: number;
  presentSections: ReadmeSectionKey[];
  missingSections: ReadmeSectionKey[];
};

const SECTION_WEIGHTS: Record<ReadmeSectionKey, number> = {
  setup: 15,
  usage: 15,
  "environment variables": 15,
  "screenshots or demo": 15,
  license: 10,
  "tech stack": 10,
};

const SECTION_ORDER = Object.keys(SECTION_WEIGHTS) as ReadmeSectionKey[];

export function analyzeReadmeSections(readme: string): ReadmeSectionAnalysis {
  const presentSections = SECTION_ORDER.filter((section) =>
    hasReadmeSection(readme, section)
  );
  const missingSections = SECTION_ORDER.filter(
    (section) => !presentSections.includes(section)
  );
  const lengthScore = readme.length > 300 ? 20 : 0;
  const sectionScore = presentSections.reduce(
    (score, section) => score + SECTION_WEIGHTS[section],
    0
  );

  return {
    score: Math.min(lengthScore + sectionScore, 100),
    presentSections,
    missingSections,
  };
}

function hasReadmeSection(readme: string, section: ReadmeSectionKey): boolean {
  switch (section) {
    case "setup":
      return /\b(install|installation|setup|getting started|quick start)\b/i.test(
        readme
      );
    case "usage":
      return /\b(usage|how to use)\b/i.test(readme) ||
        /^#{1,6}\s*(using|examples?)\b/im.test(readme);
    case "environment variables":
      return /\b(env|environment|configuration)\b/i.test(readme) || /\.env\b/i.test(readme);
    case "screenshots or demo":
      return /\b(screenshot|demo|preview|video|gif)\b/i.test(readme) ||
        /!\[[^\]]*\]\([^)]+\)/.test(readme);
    case "license":
      return /\blicense\b/i.test(readme);
    case "tech stack":
      return /\b(tech stack|built with|how it works|architecture|react|next\.js|vue|svelte|tailwind|vite|express|vercel|serverless|openrouter|node\.js|typescript)\b/i.test(
        readme
      );
  }
}
