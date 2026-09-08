import type { Lesson } from "./lesson-parser";
import { lessons } from "./lessons";

export interface Track {
  id: string;
  title: string;
  description: string;
  order: number;
  /** Стартовый трек-проект (интерпретатор, сеть, многозадачность). */
  starter: boolean;
}

export const tracks: Track[] = [
  {
    id: "base",
    title: "База",
    description:
      "Вводная часть: основы языка Scheme в стандарте R6RS. Обязательна перед треками-проектами.",
    order: 0,
    starter: false,
  },
  {
    id: "interpreter",
    title: "Интерпретатор",
    description:
      "Напиши собственный интерпретатор Scheme: от разбора выражений до вычисления программ.",
    order: 1,
    starter: true,
  },
  {
    id: "network",
    title: "Сеть",
    description:
      "Работа с сетью: TCP и UDP-сокеты, клиент-серверные программы на Scheme.",
    order: 2,
    starter: true,
  },
  {
    id: "concurrency",
    title: "Многозадачность",
    description:
      "Параллельное и конкурентное программирование: процессы, потоки, синхронизация.",
    order: 3,
    starter: true,
  },
];

export function lessonsOfTrack(trackId: string): Lesson[] {
  return lessons.filter((lesson) => lesson.track === trackId);
}

export const trackById = new Map(tracks.map((track) => [track.id, track]));