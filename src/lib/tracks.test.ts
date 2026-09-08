import { describe, expect, it } from "vitest";
import { tracks, lessonsOfTrack } from "./tracks";

describe("tracks", () => {
  it("содержит базу и три стартовых трека в правильном порядке", () => {
    expect(tracks.map((t) => t.id)).toEqual([
      "base",
      "interpreter",
      "network",
      "concurrency",
    ]);
  });

  it("помечает только стартовые треки трека-проектов", () => {
    const starter = tracks.filter((t) => t.starter);
    expect(starter.map((t) => t.id).sort()).toEqual([
      "concurrency",
      "interpreter",
      "network",
    ]);
    expect(tracks.find((t) => t.id === "base")?.starter).toBe(false);
  });

  it("имеет название и описание у каждого трека", () => {
    for (const t of tracks) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });
});

describe("lessonsOfTrack", () => {
  it("возвращает уроки трека в порядке order", () => {
    const baseLessons = lessonsOfTrack("base");
    const ids = baseLessons.map((l) => l.id);
    expect(ids).toEqual(["hello-world"]);
  });

  it("не смешивает уроки разных треков", () => {
    for (const track of tracks) {
      for (const lesson of lessonsOfTrack(track.id)) {
        expect(lesson.track).toBe(track.id);
      }
    }
  });

  it("возвращает пустой список для трека без уроков", () => {
    expect(lessonsOfTrack("interpreter")).toEqual([]);
  });
});