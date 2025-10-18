import { describe, expect, test } from "bun:test";

import {
  applyHeuristicClauses,
  compilePlanToCheckLogic,
  type NormalizedPlan,
} from "@/src/api/v1/filters/naturalLanguageToFilters";
import { serializeLogic } from "shared";

const extractLeaf = (logic: any[], id: string) => {
  return logic
    .slice(1)
    .flatMap((item: any) =>
      Array.isArray(item) && typeof item[0] === "string"
        ? item
        : [item],
    )
    .find((leaf: any) => leaf?.id === id);
};

describe("compilePlanToCheckLogic", () => {
  test("translates duration and negative feedback into logic and serialized query", () => {
    const plan: NormalizedPlan = {
      op: "AND",
      clauses: [
        { id: "duration", op: "gt", value: 2, unit: "seconds" },
        { id: "feedback", thumbs: ["down"] },
      ],
      groups: [],
      unmatched: [],
    };

    const { logic, unmatched } = compilePlanToCheckLogic(plan, "llm");
    const logicArray = logic as unknown as any[];

    expect(unmatched.length).toBe(0);
    expect(logicArray[0]).toBe("AND");

    const typeLeaf = extractLeaf(logicArray, "type");
    expect(typeLeaf).toBeTruthy();
    expect(typeLeaf.params.type).toBe("llm");

    const durationLeaf = extractLeaf(logicArray, "duration");
    expect(durationLeaf).toBeTruthy();
    expect(durationLeaf.params.operator).toBe("gt");
    expect(durationLeaf.params.duration).toBe(2);

    const feedbackLeaf = extractLeaf(logicArray, "feedback");
    expect(feedbackLeaf).toBeTruthy();
    expect(feedbackLeaf.params.types).toContain(
      JSON.stringify({ thumb: "down" }),
    );

    const query = serializeLogic(logic);
    expect(query).toContain("type=llm");
    expect(query).toMatch(/duration=.*gt/);
    expect(query).toMatch(/feedback=/);
});

test("applyHeuristicClauses infers expensive cost filter", () => {
  const plan: NormalizedPlan = {
    op: "AND",
    clauses: [],
    groups: [],
    unmatched: [],
  };

  const { plan: updatedPlan, descriptions } = applyHeuristicClauses(
    "show me the expensive runs",
    plan,
  );

  expect(updatedPlan.clauses.some((clause) => clause.id === "cost")).toBe(true);
  const costClause = updatedPlan.clauses.find((clause) => clause.id === "cost");
  expect(costClause?.op).toBe("gt");
  expect(costClause?.value).toBe(1);
  expect(descriptions[0]).toContain("cost >");
});

  test("creates bounded groups for between clauses", () => {
    const plan: NormalizedPlan = {
      op: "AND",
      clauses: [{ id: "duration", op: "between", range: [1, 4] }],
      groups: [],
      unmatched: [],
    };

    const { logic, unmatched } = compilePlanToCheckLogic(plan, "llm");
    const logicArray = logic as unknown as any[];
    expect(unmatched.length).toBe(0);
    expect(logicArray[0]).toBe("AND");

    const group = logicArray.find(
      (item: any) =>
        Array.isArray(item) && item[0] === "AND" && item !== logicArray[0],
    ) as any[];

    expect(group).toBeTruthy();
    const greater = group.find((leaf: any) => leaf?.params?.operator === "gt");
    const less = group.find((leaf: any) => leaf?.params?.operator === "lt");

    expect(greater?.params?.duration).toBe(1);
    expect(less?.params?.duration).toBe(4);
  });

  test("sets default language field and preserves values", () => {
    const plan: NormalizedPlan = {
      op: "AND",
      clauses: [
        {
          id: "languages",
          values: ["en", "fr"],
        },
      ],
      groups: [],
      unmatched: [],
    };

    const { logic, unmatched } = compilePlanToCheckLogic(plan, "llm");
    const logicArray = logic as unknown as any[];
    expect(unmatched.length).toBe(0);

    const languageLeaf = extractLeaf(logicArray, "languages");
    expect(languageLeaf.params.field).toBe("any");
    expect(languageLeaf.params.codes).toEqual(["en", "fr"]);
  });

  test("records unmatched clauses when filter id is unknown", () => {
    const plan: NormalizedPlan = {
      op: "AND",
      clauses: [{ id: "not-a-real-filter", value: "noop" }],
      groups: [],
      unmatched: [],
    };

    const { logic, unmatched } = compilePlanToCheckLogic(plan, "llm");
    const logicArray = logic as unknown as any[];

    expect(unmatched.some((item) => item.includes("Unsupported filter id"))).toBe(
      true,
    );
    expect(logicArray[0]).toBe("AND");
    expect(extractLeaf(logicArray, "type")).toBeTruthy();
  expect(
    logicArray.some((leaf: any) => leaf?.id === "not-a-real-filter"),
  ).toBe(false);
});

test("model clause respects project allowed models", () => {
  const plan: NormalizedPlan = {
    op: "AND",
    clauses: [{ id: "models", values: ["openai"] }],
    groups: [],
    unmatched: [],
  };

  const { logic, unmatched } = compilePlanToCheckLogic(plan, "llm", {
    models: ["gpt-4o", "gpt-4o-mini"],
    tags: [],
    templates: [],
  });

  expect(unmatched.some((item) => item.includes("ignored model values"))).toBe(
    true,
  );
  const remainingLeaves = (logic as any[]).slice(1);
  expect(remainingLeaves.length).toBe(1);
  expect(remainingLeaves[0].id).toBe("type");

  const familyPlan: NormalizedPlan = {
    op: "AND",
    clauses: [{ id: "models", values: ["gpt"] }],
    groups: [],
    unmatched: [],
  };

  const { logic: familyLogic, unmatched: familyUnmatched } =
    compilePlanToCheckLogic(familyPlan, "llm", {
      models: ["gpt-4o", "gpt-4o-mini"],
      tags: [],
      templates: [],
    });

  expect(familyUnmatched.length).toBe(0);
  const modelsLeaf = (familyLogic as any[]).slice(1).find((leaf) => leaf?.id === "models");
  expect(modelsLeaf).toBeTruthy();
  expect(modelsLeaf.params.models).toEqual(["gpt-4o", "gpt-4o-mini"]);
});
});
