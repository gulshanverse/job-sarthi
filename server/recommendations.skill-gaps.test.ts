import { describe, expect, it } from "vitest";
import { calculateSkillGapFrequencies } from "./routers/recommendations";

const recommendations = [
  { job: { id: 1, requirements: ["React", "GraphQL"] } },
  { job: { id: 2, requirements: ["TypeScript", "Python"] } },
  { job: { id: 3, requirements: ["TypeScript", "Go"] } },
];

describe("calculateSkillGapFrequencies", () => {
  it("uses only explicitly selected recommended jobs when IDs are supplied", () => {
    expect(calculateSkillGapFrequencies(["React"], recommendations, [2])).toEqual([
      { skill: "Python", count: 1 },
      { skill: "TypeScript", count: 1 },
    ]);
  });

  it("ignores foreign IDs and falls back to the bounded recommendation context", () => {
    expect(calculateSkillGapFrequencies(["React"], recommendations, [999])).toEqual([
      { skill: "TypeScript", count: 2 },
      { skill: "Go", count: 1 },
      { skill: "GraphQL", count: 1 },
      { skill: "Python", count: 1 },
    ]);
  });
});
