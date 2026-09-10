import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDraft,
  getDraft,
  hydrateProgress,
  isLessonDone,
  markLessonDone,
  replaceAllProgress,
  saveDraft,
} from "./progress.svelte";
import { LS_COMPLETED, LS_DRAFTS } from "./progress-store";
import {
  clearLocalStorage,
  installLocalStorage,
  removeTauriWindow,
} from "./testing/web";

// Веб-режим по умолчанию: window без __TAURI_INTERNALS__, прогресс живёт
// в localStorage — ровно тот сценарий, в котором всё «сбрасывалось».
const { memoryStore } = vi.hoisted(() => ({
  memoryStore: { data: new Map<string, unknown>() },
}));

vi.mock("@tauri-apps/plugin-store", () => {
  class FakeStore {
    async get<T>(key: string): Promise<T | undefined> {
      return memoryStore.data.get(key) as T | undefined;
    }
    async set(key: string, value: unknown): Promise<void> {
      memoryStore.data.set(key, value);
    }
    async save(): Promise<void> {
      // no-op
    }
    static async load(_path: string): Promise<FakeStore> {
      return new FakeStore();
    }
  }
  return { Store: FakeStore };
});

describe("автосохранение и восстановление прогресса (браузер)", () => {
  beforeEach(async () => {
    memoryStore.data.clear();
    removeTauriWindow();
    installLocalStorage();
    replaceAllProgress([], {});
    await hydrateProgress();
  });

  afterEach(() => {
    clearLocalStorage();
  });

  it("статус пройденного урока автоматически сохраняется в localStorage", () => {
    markLessonDone("hello-world");

    expect(JSON.parse(localStorage.getItem(LS_COMPLETED) ?? "[]")).toContain(
      "hello-world"
    );
  });

  it("черновик кода автоматически сохраняется в localStorage", () => {
    saveDraft("lambda", "(define (id x) x)");

    expect(JSON.parse(localStorage.getItem(LS_DRAFTS) ?? "{}")).toEqual({
      lambda: "(define (id x) x)",
    });
  });

  it("clearDraft удаляет черновик и сохраняет изменение", () => {
    saveDraft("lambda", "(define (id x) x)");
    clearDraft("lambda");

    expect(JSON.parse(localStorage.getItem(LS_DRAFTS) ?? "{}")).toEqual({});
    expect(getDraft("lambda")).toBeUndefined();
  });

  it("пройденный урок сохраняет и статус, и код решения", () => {
    saveDraft("hello-world", "(display 42)");
    markLessonDone("hello-world");

    expect(JSON.parse(localStorage.getItem(LS_COMPLETED) ?? "[]")).toContain(
      "hello-world"
    );
    expect(JSON.parse(localStorage.getItem(LS_DRAFTS) ?? "{}")).toEqual({
      "hello-world": "(display 42)",
    });
    expect(getDraft("hello-world")).toBe("(display 42)");
  });

  it("статусы и черновики переживают перезапуск (новый экземпляр модулей)", async () => {
    markLessonDone("hello-world");
    saveDraft("lambda", "(define (id x) x)");

    // «Перезапуск»: переимпортируем модули прогресса с чистого листа —
    // хранилище (localStorage) остаётся тем же.
    vi.resetModules();
    const restarted = await import("./progress.svelte");
    await restarted.hydrateProgress();

    expect(restarted.isLessonDone("hello-world")).toBe(true);
    expect(restarted.getDraft("lambda")).toBe("(define (id x) x)");
  });

  it("гидратация восстанавливает сохранённые статусы и черновики", async () => {
    // «Предыдущая сессия» уже сохранилась в localStorage.
    localStorage.setItem(LS_COMPLETED, JSON.stringify(["hello-world"]));
    localStorage.setItem(
      LS_DRAFTS,
      JSON.stringify({ lambda: "(define (id x) x)" })
    );

    vi.resetModules();
    const fresh = await import("./progress.svelte");
    await fresh.hydrateProgress();

    expect(fresh.isLessonDone("hello-world")).toBe(true);
    expect(fresh.getDraft("lambda")).toBe("(define (id x) x)");
  });
});