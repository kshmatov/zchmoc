import type { Lesson } from "./lesson-parser";
import type { Track } from "./tracks";

/** Навыки, накопленные игроком из пройденных уроков. */
export function accumulatedSkills(
  completedLessonIds: readonly string[],
  allLessons: readonly Lesson[]
): Set<string> {
  const completed = new Set(completedLessonIds);
  const skills = new Set<string>();
  for (const lesson of allLessons) {
    if (completed.has(lesson.id)) {
      for (const skill of lesson.skills) skills.add(skill);
    }
  }
  return skills;
}

/** Навыки, которые даёт трек в целом (все его уроки). */
export function trackSkills(track: Track, allLessons: readonly Lesson[]): Set<string> {
  const skills = new Set<string>();
  for (const lesson of allLessons) {
    if (lesson.track === track.id) {
      for (const skill of lesson.skills) skills.add(skill);
    }
  }
  return skills;
}

/** Сколько навыков трека уже покрыто накопленными навыками игрока. */
function skillOverlapCount(
  track: Track,
  accumulated: Set<string>,
  allLessons: readonly Lesson[]
): number {
  let count = 0;
  for (const skill of trackSkills(track, allLessons)) {
    if (accumulated.has(skill)) count += 1;
  }
  return count;
}

/**
 * Рекомендуемый порядок треков: незавершённая база всегда первой, дальше
 * треки по убыванию числа уже накопленных навыков (мягкий вход), при равенстве
 * — по внутреннему порядку (order). Рекомендация не блокирует выбор.
 */
export function recommendedTrackOrder(
  completedLessonIds: readonly string[],
  allLessons: readonly Lesson[],
  trackList: readonly Track[]
): Track[] {
  const accumulated = accumulatedSkills(completedLessonIds, allLessons);

  const base = trackList.find((t) => t.id === "base");
  const baseLessons = allLessons.filter((l) => l.track === "base");
  // База завершена, когда все её уроки пройдены (пустая база = нечего рекомендовать).
  const baseDone = baseLessons.length > 0 && baseLessons.every((l) => completedLessonIds.includes(l.id));

  const sorted = [...trackList].sort((a, b) => {
    if (a.id === "base") return 1;
    if (b.id === "base") return -1;
    const byOverlap = skillOverlapCount(b, accumulated, allLessons) - skillOverlapCount(a, accumulated, allLessons);
    if (byOverlap !== 0) return byOverlap;
    return a.order - b.order;
  });

  if (!baseDone && base !== undefined) {
    const withoutBase = sorted.filter((t) => t.id !== "base");
    return [base, ...withoutBase];
  }
  // База пройдена — выбрасываем её из рекомендации, чтобы она не мешала.
  return sorted.filter((t) => t.id !== "base");
}