import YAML from "yaml";

export interface Lesson {
  id: string;
  title: string;
  track: string;
  order: number;
  skills: string[];
  theory: string;
  starter: string;
  tests: string;
  /** Рассказ без проверки: нет starter/tests, не отмечается в прогрессе. */
  lecture: boolean;
}

const FRONTMATTER_RE = /^---\r?\n?([\s\S]*?)\r?\n---\r?\n?/;

function splitBody(body: string): Pick<Lesson, "theory" | "starter" | "tests"> {
  const normalized = body.replace(/\r\n/g, "\n");
  const starterMatch = /^---starter\s*$/m.exec(normalized);
  const theory = starterMatch
    ? normalized.slice(0, starterMatch.index).trim()
    : normalized.trim();
  const rest = starterMatch
    ? normalized.slice(starterMatch.index + starterMatch[0].length).replace(/^\n/, "")
    : "";
  const testsMatch = /^---tests\s*$/m.exec(rest);
  const starter = testsMatch ? rest.slice(0, testsMatch.index).trim() : rest.trim();
  const tests = testsMatch
    ? rest.slice(testsMatch.index + testsMatch[0].length).replace(/^\n/, "").trim()
    : "";
  return { theory, starter, tests };
}

export function parseLesson(source: string): Lesson {
  const frontmatter = FRONTMATTER_RE.exec(source);
  if (!frontmatter) {
    throw new Error("Урок должен начинаться с YAML-frontmatter (--- … ---).");
  }
  const data = YAML.parse(frontmatter[1]);
  if (typeof data?.id !== "string" || data.id === "") {
    throw new Error("В frontmatter урока обязательно поле id.");
  }
  if (typeof data?.title !== "string" || data.title === "") {
    throw new Error("В frontmatter урока обязательно поле title.");
  }
  if (typeof data?.track !== "string" || data.track === "") {
    throw new Error("В frontmatter урока обязательно поле track.");
  }
  const body = source.slice(frontmatter[0].length);
  return {
    id: data.id,
    title: data.title,
    track: data.track,
    order: typeof data.order === "number" ? data.order : 0,
    skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
    lecture: data?.lecture === true,
    ...splitBody(body),
  };
}