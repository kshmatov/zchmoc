import { describe, expect, it } from "vitest";
import { buildTestProgram, parseTestReport } from "./test-harness";

describe("buildTestProgram", () => {
  it("собирает преамбулу, код игрока, тесты и финиш", () => {
    const program = buildTestProgram(
      "(define (main) (display \"hi\"))",
      "(zchm-check \"x\" #t)"
    );
    expect(program).toContain("(define (zchm-ok! name)");
    expect(program).toContain('(define (main) (display "hi"))');
    expect(program).toContain('(zchm-check "x" #t)');
    expect(program).toContain("(zchm-finish)");
  });
});

describe("parseTestReport", () => {
  it("признаёт PASS", () => {
    const report = parseTestReport("__ZCHM__ PASS 0/3\n");
    expect(report).toEqual({
      passed: true,
      failedCount: 0,
      count: 3,
      failures: [],
    });
  });

  it("признаёт FAIL и собирает строки провалов", () => {
    const output = [
      "FAIL: main — процедура",
      "FAIL: вывод содержит «Привет»",
      "__ZCHM__ FAIL 2/3",
    ].join("\n");
    const report = parseTestReport(output);
    expect(report).toMatchObject({
      passed: false,
      failedCount: 2,
      count: 3,
    });
    expect(report?.failures).toEqual([
      "main — процедура",
      "вывод содержит «Привет»",
    ]);
  });

  it("игнорирует произвольный вывод до отчёта", () => {
    const output = ["Привет!", "__ZCHM__ PASS 0/1", ""].join("\n");
    expect(parseTestReport(output)?.passed).toBe(true);
  });

  it("возвращает null без финальной строки отчёта", () => {
    expect(parseTestReport("просто вывод")).toBeNull();
    expect(parseTestReport("")).toBeNull();
  });
});