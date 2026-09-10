import { describe, expect, it } from "vitest";
import { chooseLessonSource } from "./lesson-source";

const base = {
  starter: "(define (main) (display \"Привет\"))",
};

describe("выбор содержимого редактора при открытии урока", () => {
  it("черновик побеждает устаревший файл Проекта трека (регресс «код сбрасывался») ", () => {
    const source = chooseLessonSource({
      draft: "(define (main) (display 42))",
      fileCode: "(define (main) (display 1))",
      starter: base.starter,
      projectAvailable: true,
    });

    expect(source).toBe("(define (main) (display 42))");
  });

  it("черновик берётся даже когда файл совпадает со стартовым", () => {
    const source = chooseLessonSource({
      draft: "(display 42)",
      fileCode: base.starter,
      starter: base.starter,
      projectAvailable: true,
    });

    expect(source).toBe("(display 42)");
  });

  it("черновик пустой строки тоже источник правды", () => {
    const source = chooseLessonSource({
      draft: "",
      fileCode: null,
      starter: base.starter,
      projectAvailable: false,
    });

    expect(source).toBe("");
  });

  it("без черновика берётся внешний файл Проекта трека", () => {
    const source = chooseLessonSource({
      draft: undefined,
      fileCode: "; external edit\n(display 42)",
      starter: base.starter,
      projectAvailable: true,
    });

    expect(source).toBe("; external edit\n(display 42)");
  });

  it("без черновика файл, равный стартовому, не перетирает старт", () => {
    const source = chooseLessonSource({
      draft: undefined,
      fileCode: base.starter,
      starter: base.starter,
      projectAvailable: true,
    });

    expect(source).toBe(base.starter);
  });

  it("без черновика и файла — стартовый код", () => {
    const source = chooseLessonSource({
      draft: undefined,
      fileCode: null,
      starter: base.starter,
      projectAvailable: true,
    });

    expect(source).toBe(base.starter);
  });

  it("проект недоступен — только черновик или старт", () => {
    const source = chooseLessonSource({
      draft: undefined,
      fileCode: "; external",
      starter: base.starter,
      projectAvailable: false,
    });

    expect(source).toBe(base.starter);
  });
});