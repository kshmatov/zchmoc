import { describe, expect, it } from "vitest";
import { parseLesson } from "./lesson-parser";

describe("parseLesson", () => {
  it("по умолчанию урок — не лекция", () => {
    const lesson = parseLesson(`---
id: x
title: X
track: base
---
Теория

---starter
(define x 1)
---tests
(zchm-check "x" (= x 1))
`);
    expect(lesson.lecture).toBe(false);
    expect(lesson.starter).not.toBe("");
    expect(lesson.tests).not.toBe("");
  });

  it("помечает лекцию без starter/tests", () => {
    const lesson = parseLesson(`---
id: x
title: X
track: base
order: 2
lecture: true
skills:
  - modules
---
Читайте рассказ.
`);
    expect(lesson.lecture).toBe(true);
    expect(lesson.theory).toContain("Читайте");
    expect(lesson.starter).toBe("");
    expect(lesson.tests).toBe("");
  });
});