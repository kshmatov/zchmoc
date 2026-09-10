import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadProgress,
  saveCompletedLessons,
  saveDraftsMap,
  LS_COMPLETED,
  LS_DRAFTS,
} from "./progress-store";
import {
  clearLocalStorage,
  installLocalStorage,
  removeTauriWindow,
  setTauriWindow,
} from "./testing/web";

// Прозрачная замена plugin-store: прогресс пишется в in-memory Map,
// которую тесты могут читать напрямую.
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

describe("веб-режим (браузер, localStorage)", () => {
  beforeEach(() => {
    memoryStore.data.clear();
    removeTauriWindow();
    installLocalStorage();
  });

  afterEach(() => {
    clearLocalStorage();
  });

  it("первый запуск без сохранённых данных — пустой прогресс", async () => {
    const progress = await loadProgress();
    expect(progress).toEqual({ completedLessons: [], drafts: {} });
  });

  it("статусы пройденных уроков переживают перезапуск", async () => {
    await saveCompletedLessons(["hello-world", "closures"]);

    expect(JSON.parse(localStorage.getItem(LS_COMPLETED) ?? "[]")).toEqual([
      "hello-world",
      "closures",
    ]);

    const progress = await loadProgress();
    expect(progress.completedLessons).toEqual(["hello-world", "closures"]);
  });

  it("черновики кода упражнений переживают перезапуск", async () => {
    await saveDraftsMap({
      "hello-world": "(display 42)",
      lambda: "(define (id x) x)",
    });

    const progress = await loadProgress();
    expect(progress.drafts).toEqual({
      "hello-world": "(display 42)",
      lambda: "(define (id x) x)",
    });
  });

  it("статусы и черновики восстанавливаются вместе", async () => {
    await saveCompletedLessons(["hello-world"]);
    await saveDraftsMap({ "hello-world": "(display 42)" });

    const progress = await loadProgress();
    expect(progress).toEqual({
      completedLessons: ["hello-world"],
      drafts: { "hello-world": "(display 42)" },
    });
  });

  it("повторная запись статусов заменяет предыдущее значение", async () => {
    await saveCompletedLessons(["a"]);
    await saveCompletedLessons(["a", "b"]);

    const progress = await loadProgress();
    expect(progress.completedLessons).toEqual(["a", "b"]);
  });

  it("отбрасывает повреждённые записи в localStorage", async () => {
    localStorage.setItem(LS_COMPLETED, JSON.stringify(["good", 5, null]));
    localStorage.setItem(LS_DRAFTS, JSON.stringify({ ok: "code", bad: 5 }));

    const progress = await loadProgress();
    expect(progress.completedLessons).toEqual(["good"]);
    expect(progress.drafts).toEqual({ ok: "code" });
  });

  it("не падает на невалидном JSON в localStorage", async () => {
    localStorage.setItem(LS_COMPLETED, "не json{");
    localStorage.setItem(LS_DRAFTS, "<html>");

    const progress = await loadProgress();
    expect(progress).toEqual({ completedLessons: [], drafts: {} });
  });
});

describe("внутри Tauri (plugin-store)", () => {
  beforeEach(() => {
    memoryStore.data.clear();
    installLocalStorage();
    setTauriWindow();
  });

  afterEach(() => {
    clearLocalStorage();
    removeTauriWindow();
  });

  it("статусы и черновики сохраняются в store и читаются обратно", async () => {
    await saveCompletedLessons(["hello-world"]);
    await saveDraftsMap({ "hello-world": "(display 42)" });

    expect(memoryStore.data.get("completedLessons")).toEqual(["hello-world"]);
    expect(memoryStore.data.get("drafts")).toEqual({
      "hello-world": "(display 42)",
    });

    const progress = await loadProgress();
    expect(progress).toEqual({
      completedLessons: ["hello-world"],
      drafts: { "hello-world": "(display 42)" },
    });
  });

  it("внутри Tauri данные пишутся в store, а не в localStorage", async () => {
    await saveCompletedLessons(["x"]);

    expect(localStorage.getItem(LS_COMPLETED)).toBeNull();
  });

  it("пустой store — пустой прогресс", async () => {
    const progress = await loadProgress();
    expect(progress).toEqual({ completedLessons: [], drafts: {} });
  });
});