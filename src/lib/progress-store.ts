import { Store } from "@tauri-apps/plugin-store";
import { isStringRecord } from "./progress-file";

const STORE_FILE = "progress.json";
const KEY_COMPLETED = "completedLessons";
const KEY_DRAFTS = "drafts";

let store: Store | null = null;

async function openStore(): Promise<Store> {
  if (store === null) store = await Store.load(STORE_FILE);
  return store;
}

export interface LoadedProgress {
  completedLessons: string[];
  drafts: Record<string, string>;
}

export async function loadProgress(): Promise<LoadedProgress> {
  try {
    const s = await openStore();
    const completed = (await s.get<string[]>(KEY_COMPLETED)) ?? [];
    const draftsRaw = (await s.get<Record<string, string>>(KEY_DRAFTS)) ?? {};
    return {
      completedLessons: Array.isArray(completed) ? completed : [],
      drafts: isStringRecord(draftsRaw) ? draftsRaw : {},
    };
  } catch {
    return { completedLessons: [], drafts: {} };
  }
}

export async function saveCompletedLessons(ids: string[]): Promise<void> {
  try {
    const s = await openStore();
    await s.set(KEY_COMPLETED, ids);
    await s.save();
  } catch {
    // Хранилище недоступно (например, в веб-режиме без Tauri) — молча пропускаем.
  }
}

export async function saveDraftsMap(drafts: Record<string, string>): Promise<void> {
  try {
    const s = await openStore();
    await s.set(KEY_DRAFTS, drafts);
    await s.save();
  } catch {
    // см. выше
  }
}