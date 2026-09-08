import { parseLesson, type Lesson } from "./lesson-parser";

const lessonModules = import.meta.glob("../lessons/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export const lessons: Lesson[] = Object.entries(lessonModules)
  .map(([path, source]) => parseLesson(source))
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "ru"));

export const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));