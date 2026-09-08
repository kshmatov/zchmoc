import { invoke } from "@tauri-apps/api/core";

export interface ProjectLesson {
  id: string;
  starter: string;
}

export interface TrackProject {
  path: string;
}

/**
 * Создаёт Проект трека на диске (appData/projects/<track>) со стартовым кодом
 * уроков, если файлов ещё нет. Возвращает путь к проекту.
 */
export async function ensureTrackProject(
  trackId: string,
  lessons: ProjectLesson[]
): Promise<string> {
  return invoke<string>("ensure_track_project", { trackId, lessons });
}

/** Читает код урока из Проекта трека (не удалось прочитать / нет файла — null). */
export async function readTrackLessonCode(
  trackId: string,
  lessonId: string
): Promise<string | null> {
  const code = await invoke<string | null>("read_track_lesson", {
    trackId,
    lessonId,
  });
  return code;
}

/** Синхронизирует код урока обратно в файл Проекта трека. */
export async function writeTrackLessonCode(
  trackId: string,
  lessonId: string,
  code: string
): Promise<void> {
  await invoke<void>("write_track_lesson", { trackId, lessonId, code });
}

/** Открывает Проект трека в редакторе по умолчанию. */
export async function openExternalEditor(trackId: string): Promise<void> {
  await invoke<void>("open_external_editor", { trackId });
}

export interface LoadedProjectLesson {
  id: string;
  code: string;
}

/** Загружает готовый Проект трека из каталога файловой системы. */
export async function loadTrackProjectFiles(
  dirPath: string
): Promise<LoadedProjectLesson[]> {
  return invoke<LoadedProjectLesson[]>("load_track_project_files", {
    dirPath,
  });
}