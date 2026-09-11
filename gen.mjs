import { buildTestProgram } from "./src/lib/test-harness.ts";
import { parseLesson } from "./src/lib/lesson-parser.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const lesson = parseLesson(readFileSync("./src/lessons/base/base-values.md", "utf8"));
const program = buildTestProgram(lesson.starter, lesson.tests);
writeFileSync("C:/Users/kis/AppData/Local/Temp/opencode/pg.sps", program + "\n", "utf8");
console.log(program);
