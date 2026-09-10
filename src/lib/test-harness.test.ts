import { describe, expect, it } from "vitest";
// Типы Node.js не подключены (@types/node не установлен) — нужны только
// для e2e-проверки преамбулы настоящим Chez; в рантайме всё работает.
// @ts-expect-error type error without @types/node package
import { existsSync } from "node:fs";
// @ts-expect-error type error without @types/node package
import { execFileSync } from "node:child_process";
// @ts-expect-error type error without @types/node package
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
// @ts-expect-error type error without @types/node package
import { tmpdir } from "node:os";
// @ts-expect-error type error without @types/node package
import { join } from "node:path";
import { buildTestProgram, parseTestReport } from "./test-harness";

const CHEZ_CANDIDATES = [
  "C:/Program Files (x86)/Chez Scheme 10.4.1/bin/ti3nt/scheme.exe",
  "C:/Program Files (x86)/Chez Scheme 10.4.1/bin/i3nt/scheme.exe",
  "C:/Program Files/Chez Scheme/bin/ti3nt/scheme.exe",
  "C:/Program Files/Chez Scheme/bin/i3nt/scheme.exe",
];

const CHEZ_EXE = CHEZ_CANDIDATES.find((p) => existsSync(p));

function runChez(program: string): string {
  const dir = mkdtempSync(join(tmpdir(), "zchm-harness-"));
  try {
    const file = join(dir, "program.sps");
    writeFileSync(file, program, "utf8");
    return execFileSync(CHEZ_EXE!, ["--script", file], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

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

describe("исполнение преамбулы (требуется установленный Chez)", () => {
  it.skipIf(!CHEZ_EXE)("неопределённая переменная форматируется с именем", () => {
    const out = runChez(
      buildTestProgram("(undefined-var)", "(zchm-check 'ok #t)")
    );

    expect(out).not.toContain("~:s");
    const report = parseTestReport(out);
    expect(report?.failures).toContain(
      "исключение при проверке — variable undefined-var is not bound"
    );
  });

  it.skipIf(!CHEZ_EXE)("пройденные тесты дают PASS без провалов", () => {
    const out = runChez(
      buildTestProgram(
        "(define (square x) (* x x))",
        "(zchm-check-equal \"square\" (square 6) 36)"
      )
    );
    expect(parseTestReport(out)).toMatchObject({
      passed: true,
      failedCount: 0,
      count: 1,
    });
  });
});