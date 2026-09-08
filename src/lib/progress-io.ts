import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import type { ProgressData } from "./progress-file";
import {
  serializeProgress,
  parseProgressFile,
  ProgressParseError,
} from "./progress-file";

export interface ExportResult {
  cancelled: boolean;
  error?: string;
}

export async function exportProgress(progress: ProgressData): Promise<ExportResult> {
  const path = await save({
    title: "Экспорт прогресса",
    defaultPath: "zchemer-progress.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (path === null) return { cancelled: true };
  try {
    await writeTextFile(path, serializeProgress(progress));
    return { cancelled: false };
  } catch (err) {
    return { cancelled: false, error: describeError(err, "Не удалось сохранить файл прогресса.") };
  }
}

export interface ImportResult {
  cancelled: boolean;
  progress?: ProgressData;
  error?: string;
}

export async function importProgress(
  knownLessonIds: ReadonlySet<string>
): Promise<ImportResult> {
  const path = await open({
    title: "Импорт прогресса",
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (path === null) return { cancelled: true };
  const filePath = typeof path === "string" ? path : path[0];
  if (!filePath) return { cancelled: true };
  try {
    const text = await readTextFile(filePath);
    const progress = parseProgressFile(text, { knownLessonIds });
    return { cancelled: false, progress };
  } catch (err) {
    return { cancelled: false, error: describeError(err, "Не удалось прочитать файл прогресса.") };
  }
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof ProgressParseError) return err.message;
  if (err instanceof Error) return `${fallback} ${err.message}`;
  return `${fallback} ${String(err)}`;
}