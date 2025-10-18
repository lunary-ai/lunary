import { beforeAll, beforeEach, expect, test } from "bun:test";

import { resetSqlMock, setSqlResolver } from "../utils/mockSql";
import { IDs } from "../../_helpers/ids";

type AnalyticsRouterModule = typeof import("@/src/api/v1/analytics/index");

let analyticsRouter: AnalyticsRouterModule["default"];

beforeAll(async () => {
  analyticsRouter = (await import("@/src/api/v1/analytics/index")).default;
});

beforeEach(() => {
  resetSqlMock();
});

function normalizeRoutePath(routePath: string) {
  if (routePath.length > 1 && routePath.endsWith("/")) {
    return routePath.slice(0, -1);
  }
  return routePath;
}

function findRouteHandler(path: string, method: string) {
  const prefix = analyticsRouter.opts?.prefix ?? "";
  const desiredPaths = new Set(
    [path, `${prefix}${path === "/" ? "" : path}`].map(normalizeRoutePath),
  );

  const layer = analyticsRouter.stack.find((candidate) => {
    const candidatePath = normalizeRoutePath(candidate.path);
    return (
      desiredPaths.has(candidatePath) &&
      candidate.methods.includes(method.toUpperCase())
    );
  });

  if (!layer) {
    throw new Error(`Route not found for ${method} ${path}`);
  }

  return layer.stack[layer.stack.length - 1];
}

test("GET /analytics/org/models/top requires an org API key", async () => {
  const handler = findRouteHandler("/org/models/top", "GET");

  setSqlResolver(() => {
    throw new Error("Database query should not execute for unauthorized calls");
  });

  const ctx: any = {
    state: {
      apiKeyType: "private",
      orgId: IDs.org123,
    },
    request: {
      query: {},
      headers: {},
      ip: "localhost",
    },
    querystring: "",
    throw(status: number, message?: string) {
      const error: any = new Error(message);
      error.status = status;
      throw error;
    },
  };

  let thrown;
  try {
    await handler(ctx);
  } catch (error) {
    thrown = error as any;
  }

  expect(thrown).toBeDefined();
  expect(thrown.status).toBe(401);
  expect(thrown.message).toBe("Org API key required");
});

test("GET /analytics/org/models/top aggregates across the entire org", async () => {
  const handler = findRouteHandler("/org/models/top", "GET");

  const expectedRows = [
    {
      name: "gpt-4",
      prompt_tokens: 120n,
      completion_tokens: 80n,
      total_tokens: 200n,
      cost: 9.99,
      projectName: "Observability",
    },
  ];

  let callIndex = 0;
  setSqlResolver((query, values) => {
    callIndex += 1;

    if (callIndex === 1) {
      expect(query.trim()).toBe("1 = 1");
      expect(values).toEqual([]);
      return [];
    }

    if (query === "") {
      expect(values).toEqual([]);
      return [];
    }

    expect(query.toLowerCase()).toContain("with filtered_runs as");
    expect(query).toContain("and p.org_id = ?");
    expect(values).toContain(IDs.org123);
    return expectedRows;
  });

  const ctx: any = {
    state: {
      apiKeyType: "org_private",
      orgId: IDs.org123,
    },
    request: {
      query: {},
      headers: {},
      ip: "localhost",
    },
    querystring: "",
    throw(status: number, message?: string) {
      const error: any = new Error(message);
      error.status = status;
      throw error;
    },
  };

  await handler(ctx);

  expect(ctx.body).toEqual(expectedRows);
});
