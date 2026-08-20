const aliases: Record<string, string> = {
  "react.js": "React",
  reactjs: "React",
  "react js": "React",
  node: "Node.js",
  "node.js": "Node.js",
  nodejs: "Node.js",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  "next.js": "Next.js",
  nextjs: "Next.js",
  "vue.js": "Vue.js",
  vuejs: "Vue.js",
  "express.js": "Express",
  expressjs: "Express",
  "postgresql": "PostgreSQL",
  postgres: "PostgreSQL",
  "mongo db": "MongoDB",
  mongodb: "MongoDB",
  "amazon web services": "AWS",
  aws: "AWS",
  "google cloud platform": "GCP",
  gcp: "GCP",
  "c sharp": "C#",
  csharp: "C#",
  "c plus plus": "C++",
  cpp: "C++",
};

function key(value: string) {
  return value.trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
}

export function normaliseSkill(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  return aliases[key(cleaned)] ?? cleaned;
}

export function normaliseSkills(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map(normaliseSkill)
    .filter(value => value.length > 0)
    .filter(value => {
      const normalized = key(value);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

export function skillKey(value: string): string {
  return key(normaliseSkill(value));
}
