import { describe, expect, it } from "vitest";
import type { Lesson } from "./lesson-parser";
import { tracks } from "./tracks";
import {
  accumulatedSkills,
  trackSkills,
  recommendedTrackOrder,
} from "./recommendation";

function lesson(
  id: string,
  track: string,
  order: number,
  skills: string[]
): Lesson {
  return {
    id,
    title: id,
    track,
    order,
    skills,
    theory: "",
    starter: "",
    tests: "",
  };
}

const allLessons: Lesson[] = [
  lesson("base-1", "base", 1, ["strings", "output"]),
  lesson("base-2", "base", 2, ["procedures"]),
  lesson("net-1", "network", 1, ["tcp", "sockets"]),
  lesson("net-2", "network", 2, ["udp"]),
  lesson("conc-1", "concurrency", 1, ["threads", "tcp"]),
];

describe("accumulatedSkills", () => {
  it("собирает навыки всех пройденных уроков", () => {
    const skills = accumulatedSkills(["base-1", "net-1"], allLessons);
    expect(skills).toEqual(new Set(["strings", "output", "tcp", "sockets"]));
  });

  it("не учитывает непройденные уроки", () => {
    const skills = accumulatedSkills(["base-1"], allLessons);
    expect(skills).not.toContain("procedures");
  });
});

describe("trackSkills", () => {
  it("собирает навыки всех уроков трека", () => {
    const network = tracks.find((t) => t.id === "network")!;
    expect(trackSkills(network, allLessons)).toEqual(
      new Set(["tcp", "sockets", "udp"])
    );
  });

  it("пустой для трека без уроков", () => {
    const interpreter = tracks.find((t) => t.id === "interpreter")!;
    expect(trackSkills(interpreter, allLessons).size).toBe(0);
  });
});

describe("recommendedTrackOrder", () => {
  it("сначала рекомендует незавершённую базу", () => {
    const order = recommendedTrackOrder([], allLessons, tracks);
    expect(order[0].id).toBe("base");
  });

  it("после базы рекомендует трек с максимумом накопленных навыков", () => {
    // Пройдена вся база + навык tcp из сетевого урока.
    const completed = ["base-1", "base-2", "net-1"];
    const order = recommendedTrackOrder(completed, allLessons, tracks);
    expect(order.map((t) => t.id)).toEqual([
      "network",
      "concurrency",
      "interpreter",
    ]);
  });

  it("при равенстве пересечений сохраняет внутренний порядок", () => {
    // Ни одной базы — навыков накоплено немного: подсеть и concurrency оба 0.
    const order = recommendedTrackOrder(["base-1"], allLessons, tracks);
    const projectOrder = order
      .filter((t) => t.id !== "base")
      .map((t) => t.id);
    expect(projectOrder).toEqual([
      "interpreter",
      "network",
      "concurrency",
    ]);
  });

  it("возвращает все треки (не блокирует выбор)", () => {
    const order = recommendedTrackOrder([], allLessons, tracks);
    expect(order.map((t) => t.id).sort()).toEqual(
      tracks.map((t) => t.id).sort()
    );
  });
});