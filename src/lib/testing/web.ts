// Тестовые хелперы: подмена браузерного окружения, чтобы проверять
// хранение прогресса (localStorage и детекция Tauri) без настоящего Tauri.

export type MemoryStorageData = Map<string, string>;

/** Устанавливает глобальный localStorage на основе in-memory Map. */
export function installLocalStorage(
  data: MemoryStorageData = new Map()
): Storage {
  const mock: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => {
      const keys = [...data.keys()];
      return keys[index] ?? null;
    },
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = mock;
  return mock;
}

export function clearLocalStorage(): void {
  delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
}

/** Убирает window — имитация обычного браузера без Tauri. */
export function removeTauriWindow(): void {
  delete (globalThis as unknown as { window?: unknown }).window;
}

/** Подделывает окружение Tauri v2 (инжектит __TAURI_INTERNALS__). */
export function setTauriWindow(): void {
  (globalThis as unknown as { window: unknown }).window = {
    __TAURI_INTERNALS__: {},
  };
}