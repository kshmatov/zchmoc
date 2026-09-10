import { loadProgress, saveCompletedLessons, saveDraftsMap } from "./progress-store";

export const completedLessons = $state<string[]>([]);
export const drafts = $state<Record<string, string>>({});

let hydrated = false;
let loading = false;

export async function hydrateProgress(): Promise<void> {
  if (hydrated || loading) return;
  loading = true;
  try {
    const loaded = await loadProgress();
    replaceAllProgress(loaded.completedLessons, loaded.drafts);
    hydrated = true;
  } finally {
    loading = false;
  }
}

export function isLessonDone(id: string): boolean {
  return completedLessons.includes(id);
}

export function markLessonDone(id: string): void {
  if (completedLessons.includes(id)) return;
  completedLessons.push(id);
  if (hydrated) void saveCompletedLessons([...completedLessons]);
}

export function getDraft(id: string): string | undefined {
  return drafts[id];
}

export function saveDraft(id: string, code: string): void {
  drafts[id] = code;
  if (hydrated) void saveDraftsMap({ ...drafts });
}

export function clearDraft(id: string): void {
  delete drafts[id];
  if (hydrated) void saveDraftsMap({ ...drafts });
}

export function replaceAllProgress(
  nextCompleted: string[],
  nextDrafts: Record<string, string>
): void {
  completedLessons.length = 0;
  for (const id of nextCompleted) completedLessons.push(id);
  for (const key of Object.keys(drafts)) delete drafts[key];
  for (const [id, code] of Object.entries(nextDrafts)) drafts[id] = code;
  if (hydrated) {
    void saveCompletedLessons([...completedLessons]);
    void saveDraftsMap({ ...drafts });
  }
}