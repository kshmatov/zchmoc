import { describe, expect, it } from "vitest";
import {
  ProgressParseError,
  parseProgressFile,
  serializeProgress,
} from "./progress-file";

describe("serializeProgress", () => {
  it("сериализует прогресс с версией и обеими секциями", () => {
    const json = serializeProgress({
      completedLessons: ["hello-world", "closures"],
      drafts: { lambda: "(define (f x) x)" },
    });
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({
      version: 1,
      completedLessons: ["hello-world", "closures"],
      drafts: { lambda: "(define (f x) x)" },
    });
  });

  it("не мутирует входные массивы при сериализации", () => {
    const completed = ["hello-world"];
    const drafts = { hello: "code" };
    serializeProgress({ completedLessons: completed, drafts });
    expect(completed).toEqual(["hello-world"]);
    expect(drafts).toEqual({ hello: "code" });
  });
});

describe("parseProgressFile", () => {
  it("круговая сериализация возвращает эквивалентные данные", () => {
    const progress = {
      completedLessons: ["hello-world"],
      drafts: { hello: "(display 1)" },
    };
    const json = serializeProgress(progress);
    expect(parseProgressFile(json)).toEqual(progress);
  });

  it("принимает пустой прогресс", () => {
    const json = JSON.stringify({
      version: 1,
      completedLessons: [],
      drafts: {},
    });
    expect(parseProgressFile(json)).toEqual({
      completedLessons: [],
      drafts: {},
    });
  });

  it("отбрасывает дубликаты пройденных уроков", () => {
    const json = JSON.stringify({
      version: 1,
      completedLessons: ["a", "a", "b"],
      drafts: {},
    });
    expect(parseProgressFile(json).completedLessons).toEqual(["a", "b"]);
  });

  it("отбрасывает неизвестные id уроков при переданном knownLessonIds", () => {
    const json = JSON.stringify({
      version: 1,
      completedLessons: ["hello-world", "ghost"],
      drafts: { "hello-world": "code", ghost: "nope" },
    });
    const result = parseProgressFile(json, {
      knownLessonIds: new Set(["hello-world"]),
    });
    expect(result.completedLessons).toEqual(["hello-world"]);
    expect(result.drafts).toEqual({ "hello-world": "code" });
  });

  it("отклоняет не-JSON строку", () => {
    expect(() => parseProgressFile("не json")).toThrow(ProgressParseError);
  });

  it("отклоняет JSON-примитив вместо объекта", () => {
    expect(() => parseProgressFile("42")).toThrow(ProgressParseError);
    expect(() => parseProgressFile('"строка"')).toThrow(ProgressParseError);
  });

  it("отклоняет неподдерживаемую версию", () => {
    const json = JSON.stringify({ version: 999, completedLessons: [], drafts: {} });
    expect(() => parseProgressFile(json)).toThrow(/версия/);
  });

  it("отклоняет отсутствующую версию", () => {
    const json = JSON.stringify({ completedLessons: [], drafts: {} });
    expect(() => parseProgressFile(json)).toThrow(/версия/);
  });

  it("отклоняет completedLessons не из строк", () => {
    const json = JSON.stringify({ version: 1, completedLessons: [1], drafts: {} });
    expect(() => parseProgressFile(json)).toThrow(/completedLessons/);
  });

  it("отклоняет drafts со нестроковыми значениями", () => {
    const json = JSON.stringify({ version: 1, completedLessons: [], drafts: { a: 5 } });
    expect(() => parseProgressFile(json)).toThrow(/drafts/);
  });
});