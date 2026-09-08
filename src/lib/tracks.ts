import type { Lesson } from "./lesson-parser";
import { lessons } from "./lessons";

export interface Track {
  id: string;
  title: string;
  description: string;
  order: number;
  /** Стартовый трек-проект (интерпретатор, сеть, многозадачность). */
  starter: boolean;
  /** Трек требует системных возможностей (сеть, процессы) — исполняется sidecar-Chez, а не WASM. */
  systemAccess: boolean;
}

export type SchemeRuntime = "wasm" | "sidecar";

/** Выбор исполнителя: WASM для базы и интерпретатора, sidecar для системных треков. */
export function runtimeFor(trackId: string): SchemeRuntime {
  return trackById.get(trackId)?.systemAccess ? "sidecar" : "wasm";
}

export const tracks: Track[] = [
  {
    id: "base",
    title: "База",
    description:
      "Вводная часть: основы языка Scheme в стандарте R6RS. Обязательна перед треками-проектами.",
    order: 0,
    starter: false,
    systemAccess: false,
  },
  {
    id: "interpreter",
    title: "Интерпретатор",
    description:
      "Напиши собственный интерпретатор Scheme: от разбора выражений до вычисления программ.",
    order: 1,
    starter: true,
    systemAccess: false,
  },
  {
    id: "network",
    title: "Сеть",
    description:
      "Работа с сетью: TCP и UDP-сокеты, клиент-серверные программы на Scheme.",
    order: 2,
    starter: true,
    systemAccess: true,
  },
  {
    id: "concurrency",
    title: "Многозадачность",
    description:
      "Параллельное и конкурентное программирование: процессы, потоки, синхронизация.",
    order: 3,
    starter: true,
    systemAccess: true,
  },
];

export function lessonsOfTrack(trackId: string): Lesson[] {
  return lessons.filter((lesson) => lesson.track === trackId);
}

export const trackById = new Map(tracks.map((track) => [track.id, track]));