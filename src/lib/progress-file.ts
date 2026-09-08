export interface ProgressData {
  completedLessons: string[];
  drafts: Record<string, string>;
}

export const PROGRESS_FILE_VERSION = 1;

export interface ProgressFile {
  version: number;
  completedLessons: string[];
  drafts: Record<string, string>;
}

export function makeProgressFile(progress: ProgressData): ProgressFile {
  return {
    version: PROGRESS_FILE_VERSION,
    completedLessons: [...progress.completedLessons],
    drafts: { ...progress.drafts },
  };
}

export function serializeProgress(progress: ProgressData): string {
  return JSON.stringify(makeProgressFile(progress), null, 2);
}

export class ProgressParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressParseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

export interface ParseProgressOptions {
  /** Контрольный набор допустимых id уроков; неизвестные id отбрасываются. */
  knownLessonIds?: ReadonlySet<string>;
}

export function parseProgressFile(
  json: string,
  options: ParseProgressOptions = {}
): ProgressData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ProgressParseError("Файл не является корректным JSON.");
  }
  if (!isRecord(raw)) {
    throw new ProgressParseError("Файл прогресса должен быть объектом JSON.");
  }
  if (raw.version !== PROGRESS_FILE_VERSION) {
    throw new ProgressParseError(
      `Неподдерживаемая версия файла прогресса: ${String(raw.version ?? "отсутствует")}.`
    );
  }
  if (!isStringArray(raw.completedLessons)) {
    throw new ProgressParseError(
      "Поле completedLessons должно быть массивом строк."
    );
  }
  if (!isStringRecord(raw.drafts)) {
    throw new ProgressParseError(
      "Поле drafts должно быть объектом со строковыми значениями."
    );
  }

  const known = options.knownLessonIds;
  const completedLessons = known
    ? [...new Set(raw.completedLessons.filter((id) => known.has(id)))]
    : [...new Set(raw.completedLessons)];

  const drafts: Record<string, string> = {};
  for (const [id, code] of Object.entries(raw.drafts)) {
    if (!known || known.has(id)) drafts[id] = code;
  }

  return { completedLessons, drafts };
}