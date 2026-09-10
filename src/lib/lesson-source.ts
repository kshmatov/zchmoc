/**
 * Выбор содержимого редактора при открытии урока.
 *
 * Правила (контекст: черновик сохраняется автоматически при каждой правке,
 * а файл Проекта трека — только при «Запустить», смене урока и выходе из трека):
 *
 * 1. Черновик — источник правды: если он есть, всегда берём его. Устаревший
 *    файл Проекта не должен «откатывать» свежие правки при переключении уроков
 *    или перезапуске.
 * 2. Файл Проекта рассматривается только для урока без черновика: это первичное
 *    содержимое из внешней работы (готовый Проект трека / внешний редактор).
 *    Файл берём, только если он отличается от стартового кода.
 * 3. Иначе — стартовый код.
 */

export interface LessonSourceInput {
  draft: string | undefined;
  fileCode: string | null;
  starter: string;
  /** Есть ли доступ к файлам Проекта трека (иначе файл читать нельзя). */
  projectAvailable: boolean;
}

export function chooseLessonSource(input: LessonSourceInput): string {
  const { draft, fileCode, starter, projectAvailable } = input;
  if (draft !== undefined) return draft;
  if (projectAvailable && fileCode !== null && fileCode.trim() !== starter.trim()) {
    return fileCode;
  }
  return starter;
}