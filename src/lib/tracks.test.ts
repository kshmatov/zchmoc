import { describe, expect, it } from "vitest";
import { tracks, lessonsOfTrack, runtimeFor } from "./tracks";

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

  it("помечает только системные треки как требующие sidecar", () => {
    const byId = new Map(tracks.map((t) => [t.id, t]));
    expect(byId.get("base")?.systemAccess).toBe(false);
    expect(byId.get("interpreter")?.systemAccess).toBe(false);
    expect(byId.get("network")?.systemAccess).toBe(true);
    expect(byId.get("concurrency")?.systemAccess).toBe(true);
  });

  it("выбирает WASM для базы и интерпретатора, sidecar для сети и многозадачности", () => {
    expect(runtimeFor("base")).toBe("wasm");
    expect(runtimeFor("interpreter")).toBe("wasm");
    expect(runtimeFor("network")).toBe("sidecar");
    expect(runtimeFor("concurrency")).toBe("sidecar");
  });
});

describe("lessonsOfTrack", () => {
  it("возвращает уроки трека в порядке order", () => {
    const baseLessons = lessonsOfTrack("base");
    const ids = baseLessons.map((l) => l.id);
    expect(ids).toEqual(["hello-world"]);

    const interpreterLessons = lessonsOfTrack("interpreter");
    const interpreterIds = interpreterLessons.map((l) => l.id);
    expect(interpreterIds).toEqual([
      "interp-atoms",
      "interp-env",
      "interp-lists",
      "interp-if",
      "interp-call",
      "interp-lambda",
      "interp-define",
    ]);
  });

  it("не смешивает уроки разных треков", () => {
    for (const track of tracks) {
      for (const lesson of lessonsOfTrack(track.id)) {
        expect(lesson.track).toBe(track.id);
      }
    }
  });

  it("возвращает пустой список для трека без уроков (сеть ещё пуста)", () => {
    expect(lessonsOfTrack("network")).toEqual([]);
  });

  it("содержит уроки многозадачности в порядке order", () => {
    const ids = lessonsOfTrack("concurrency").map((l) => l.id);
    expect(ids).toEqual([
      "conc-threads",
      "conc-mutex",
      "conc-condition",
      "conc-params",
      "conc-process",
      "conc-queue",
    ]);
  });
});