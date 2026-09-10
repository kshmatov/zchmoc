import { Store } from "@tauri-apps/plugin-store";

const STORE_FILE = "progress.json";
const KEY_COMPLETED = "completedLessons";
const KEY_DRAFTS = "drafts";

// Веб-запасной вариант: plugin-store доступен только внутри Tauri, а в обычном
// браузере (make dev) сейвы молча проваливались бы и прогресс терялся при
// перезапуске. localStorage позволяет переживать перезагрузку в обоих режимах.
export const LS_COMPLETED = "zchemer.progress.completedLessons";
export const LS_DRAFTS = "zchemer.progress.drafts";

let store: Store | null = null;

async function openStore(): Promise<Store> {
  if (store === null) store = await Store.load(STORE_FILE);
  return store;
}

/** true — приложение запущено внутри Tauri (IPC доступен), false — браузер. */
function inTauri(): boolean {
  // В Tauri v2 ядро всегда инжектит __TAURI_INTERNALS__ в окно.
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface LoadedProgress {
  completedLessons: string[];
  drafts: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Оставляет только пары со строковым значением, повреждённые отбрасывает. */
function filterStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") out[key] = item;
  }
  return out;
}

async function loadTauriProgress(): Promise<LoadedProgress> {
  const s = await openStore();
  const completed = (await s.get<string[]>(KEY_COMPLETED)) ?? [];
  const draftsRaw = (await s.get<Record<string, string>>(KEY_DRAFTS)) ?? {};
  return {
    completedLessons: Array.isArray(completed)
      ? completed.filter((item): item is string => typeof item === "string")
      : [],
    drafts: filterStringRecord(draftsRaw),
  };
}

function loadWebProgress(): LoadedProgress {
  const completedRaw = JSON.parse(localStorage.getItem(LS_COMPLETED) ?? "[]");
  const draftsRaw = JSON.parse(localStorage.getItem(LS_DRAFTS) ?? "{}");
  return {
    completedLessons: Array.isArray(completedRaw)
      ? completedRaw.filter((item): item is string => typeof item === "string")
      : [],
    drafts: filterStringRecord(draftsRaw),
  };
}

export async function loadProgress(): Promise<LoadedProgress> {
  try {
    return inTauri() ? await loadTauriProgress() : loadWebProgress();
  } catch {
    return { completedLessons: [], drafts: {} };
  }
}

export async function saveCompletedLessons(ids: string[]): Promise<void> {
  try {
    if (inTauri()) {
      const s = await openStore();
      await s.set(KEY_COMPLETED, ids);
      await s.save();
    } else {
      localStorage.setItem(LS_COMPLETED, JSON.stringify(ids));
    }
  } catch {
    // Хранилище недоступно (приватный режим, сбой IPC) — молча пропускаем.
  }
}

export async function saveDraftsMap(drafts: Record<string, string>): Promise<void> {
  try {
    if (inTauri()) {
      const s = await openStore();
      await s.set(KEY_DRAFTS, drafts);
      await s.save();
    } else {
      localStorage.setItem(LS_DRAFTS, JSON.stringify(drafts));
    }
  } catch {
    // см. выше
  }
}