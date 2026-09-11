import Scheme from "chez-scheme-js";
import { buildTestProgram, parseTestReport } from "../src/lib/test-harness.ts";
import { parseLesson } from "../src/lib/lesson-parser.ts";
import freshLessonSource from "../src/lessons/base/base-values.md?raw";

const outEl = document.getElementById("out");
const logs = [];
function log(x) {
  logs.push(x);
  outEl.textContent = logs.join("\n");
}

const lesson = parseLesson(freshLessonSource);

const cases = {
  correct: `(define (fahrenheit->celsius f) (* (- f 32) 5/9))
(define (average a b) (/ (+ a b) 2))`,
  unbalanced: `(define (fahrenheit->celsius f) ( + f 1`,
  floatAnswer: `(define (fahrenheit->celsius f) (* (- f 32) 0.5555))
(define (average a b) (/ (+ a b) 2))`,
};

(async () => {
  const errs = [];
  const scheme = new Scheme({ workerUrl: "/chez-dist/worker.js", error: (e) => errs.push(e) });
  try {
    await scheme.init();
    log("init ok");
  } catch (e) {
    log("INIT THREW: " + e.message);
    return;
  }

  for (const [name, code] of Object.entries(cases)) {
    log("RUN case: " + name);
    const program = buildTestProgram(code, lesson.tests);
    try {
      const results = await scheme.runExpression(program);
      const output = results.join("\n");
      const report = parseTestReport(output);
      log("  results: " + JSON.stringify(results));
      log("  has __ZCHM__: " + output.includes("__ZCHM__"));
      log("  report: " + JSON.stringify(report));
    } catch (e) {
      log("  RUN THREW: " + e.message);
    }
    log("  errs: " + JSON.stringify(errs));
  }
  // Also test a persistent poison: run unbalanced first, then correct
  log("POISON TEST: unbalanced then correct on same REPL");
  {
    const results = await scheme.runExpression(buildTestProgram(cases.unbalanced, lesson.tests));
    log("  unbalanced results: " + JSON.stringify(results.join("\n")));
    const results2 = await scheme.runExpression(buildTestProgram(cases.correct, lesson.tests));
    log("  correct-after results: " + JSON.stringify(results2.join("\n")));
    log("  after has __ZCHM__: " + results2.join("\n").includes("__ZCHM__"));
  }
  log("DONE");
})();