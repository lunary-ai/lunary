import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

import { resetSqlMock, setSqlResolver } from "../utils/mockSql";
import { IDs } from "../../_helpers/ids";
import { validateUUID } from "@/src/utils/misc";

type ProjectsRouterModule = typeof import("@/src/api/v1/projects/index");

const recordAuditLogMock = mock(async () => {});

mock.module("@/src/api/v1/audit-logs/utils", () => ({
  recordAuditLog: recordAuditLogMock,
}));

let projectsRouter: ProjectsRouterModule["default"];

beforeAll(async () => {
  projectsRouter = (await import("@/src/api/v1/projects/index")).default;
});

beforeEach(() => {
  resetSqlMock();
  recordAuditLogMock.mockReset();
});

function normalizeRoutePath(routePath: string) {
  if (routePath.length > 1 && routePath.endsWith("/")) {
    return routePath.slice(0, -1);
  }
  return routePath;
}

function findRouteHandler(path: string, method: string) {
  const prefix = projectsRouter.opts?.prefix ?? "";
  const desiredPaths = new Set(
    [path, `${prefix}${path === "/" ? "" : path}`].map(normalizeRoutePath),
  );

  const layer = projectsRouter.stack.find((candidate) => {
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

function createSequenceResolver(
  steps: {
    match?: string | RegExp;
    handle: (query: string, values: unknown[]) => unknown[];
  }[],
) {
  const queue = [...steps];

  return (query: string, values: unknown[]) => {
    const next = queue.shift();
    if (!next) {
      throw new Error(`Unexpected query: ${query}`);
    }

    if (next.match) {
      const matches =
        typeof next.match === "string"
          ? query.includes(next.match)
          : next.match.test(query);

      if (!matches) {
        throw new Error(
          `Query mismatch. Expected "${next.match}", received "${query}"`,
        );
      }
    }

    return next.handle(query, values);
  };
}

test("POST /projects seeds both public and private keys", async () => {
  const handler = findRouteHandler("/", "POST");
  const inserted: unknown[] = [];

  setSqlResolver(
    createSequenceResolver([
      {
        match: "select plan from org",
        handle: () => [{ plan: "pro" }],
      },
      {
        match: "select count(*)::int from project",
        handle: () => [{ count: 1 }],
      },
      {
        match: "insert into project",
        handle: () => [
          { id: IDs.project1, name: "Observability", orgId: IDs.org1 },
        ],
      },
      {
        match: "insert into account_project",
        handle: () => [],
      },
      {
        match: /insert into\s+evaluator/i,
        handle: () => [],
      },
      {
        match: "insert into api_key",
        handle: (_query, values) => {
          const payload = Array.isArray(values[0]) ? values[0][0] : values[0];
          inserted.push(payload);
          return [];
        },
      },
      {
        match: "insert into api_key",
        handle: (_query, values) => {
          const payload = Array.isArray(values[0])
            ? { ...values[0][0], apiKey: crypto.randomUUID() }
            : values[0];
          inserted.push(payload);
          return [];
        },
      },
    ]),
  );

  const ctx: any = {
    state: { orgId: IDs.org1, userId: IDs.user99, projectId: IDs.project1 },
    request: {
      body: { name: "Observability" },
      headers: {},
      ip: "localhost",
    },
    throw(status: number, message?: string) {
      const error: any = new Error(message);
      error.status = status;
      throw error;
    },
  };

  await handler(ctx);

  expect(ctx.body).toEqual({
    id: IDs.project1,
    name: "Observability",
    orgId: IDs.org1,
  });

  expect(inserted.length).toBe(2);
  const [publicInsert, privateInsert] = inserted as any[];

  expect(publicInsert.type).toBe("public");
  expect(publicInsert.projectId).toBe(IDs.project1);
  expect(publicInsert.apiKey).toBe(IDs.project1);
  expect(publicInsert.orgId).toBe(IDs.org1);

  expect(privateInsert.type).toBe("private");
  expect(privateInsert.projectId).toBe(IDs.project1);
  expect(privateInsert.orgId).toBe(IDs.org1);
  expect(validateUUID(privateInsert.apiKey)).toBe(true);

  expect(recordAuditLogMock.mock.calls.length).toBe(1);
  const [resourceType, action, ctxArg, resourceId] =
    recordAuditLogMock.mock.calls[0];
  expect(resourceType).toBe("project");
  expect(action).toBe("create");
  expect(ctxArg.state.orgId).toBe(IDs.org1);
  expect(resourceId).toBe(IDs.project1);
});

test("POST /:projectId/regenerate-key rotates private keys", async () => {
  const handler = findRouteHandler("/:projectId/regenerate-key", "POST");
  let updatedKey: string | undefined;

  setSqlResolver((query, values) => {
    if (query.includes("select * from account_project")) {
      return [{ project_id: IDs.project1, account_id: IDs.user1 }];
    }
    if (query.includes("select exists")) {
      return [{ exists: true }];
    }
    if (query.includes("update api_key")) {
      updatedKey = values[0] as string;
      return [];
    }
    if (query.includes("SELECT name FROM project")) {
      return [{ name: "Observability" }];
    }
    throw new Error(`Unexpected query: ${query}`);
  });

  const ctx: any = {
    params: { projectId: IDs.project1 },
    state: { orgId: IDs.org1, userId: IDs.user1, projectId: IDs.project1 },
    request: {
      body: { type: "private" },
      headers: {},
      ip: "localhost",
    },
    throw(status: number, message?: string) {
      const error: any = new Error(message);
      error.status = status;
      throw error;
    },
  };

  await handler(ctx);

  expect(ctx.status).toBe(200);
  expect(ctx.body).toEqual({});
  expect(updatedKey).toBeDefined();
  expect(validateUUID(updatedKey!)).toBe(true);
  expect(recordAuditLogMock.mock.calls.length).toBe(1);
  const [resourceType, action, ctxArg] = recordAuditLogMock.mock.calls[0];
  expect(resourceType).toBe("api_key");
  expect(action).toBe("regenerate");
  expect(ctxArg.state.projectId).toBe(IDs.project1);
});
