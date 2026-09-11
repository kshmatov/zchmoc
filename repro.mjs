import { buildTestProgram, parseTestReport } from "./src/lib/test-harness.ts";
import { parseLesson } from "./src/lib/lesson-parser.ts";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const lesson = parseLesson(readFileSync("./src/lessons/base/base-values.md", "utf8"));
const program = buildTestProgram(lesson.starter, lesson.tests);
const dir = mkdtempSync(join(tmpdir(), "zchm-repro-"));
try {
  const file = join(dir, "p.sps");
  writeFileSync(file, program, "utf8");
  const out = execFileSync("C:/Program Files (x86)/Chez Scheme 10.4.1/bin/ti3nt/scheme.exe", ["--script", file], { encoding: "utf8" });
  console.log("=== OUTPUT ===");
  console.log(out);
  console.log("=== REPORT ===");
  console.log(JSON.stringify(parseTestReport(out), null, 2));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
