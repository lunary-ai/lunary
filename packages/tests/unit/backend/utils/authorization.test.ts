import { beforeEach, describe, expect, mock, test } from "bun:test";

import { resetSqlMock, setSqlResolver } from "../utils/mockSql";
import { checkAccess } from "@/src/utils/authorization";

function createCtx(stateOverrides: Partial<any> = {}) {
  return {
    state: {
      userId: "user-1",
      privateKey: false,
      ...stateOverrides,
    },
    request: {
      headers: {},
      ip: "localhost",
    },
    status: undefined,
    body: undefined,
  } as any;
}

describe("checkAccess middleware", () => {
  beforeEach(() => {
    resetSqlMock();
  });

  test("grants full access when request is authenticated with a private API key", async () => {
    setSqlResolver(() => {
      throw new Error("Database lookup should be skipped for private keys");
    });

    const ctx = createCtx({ privateKey: true });
    const next = mock(async () => {});

    await checkAccess("projects", "read")(ctx, next);

    expect(next.mock.calls.length).toBe(1);
    expect(ctx.status).toBeUndefined();
  });

  test("allows owner roles to proceed when they have explicit permission", async () => {
    setSqlResolver((query) => {
      if (query.includes("from account where id")) {
        return [{ role: "owner" }];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const ctx = createCtx({ privateKey: false });
    const next = mock(async () => {});

    await checkAccess("projects", "read")(ctx, next);

    expect(next.mock.calls.length).toBe(1);
    expect(ctx.status).toBeUndefined();
  });

  test("blocks viewer roles from private key operations", async () => {
    setSqlResolver((query) => {
      if (query.includes("from account where id")) {
        return [{ role: "viewer" }];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const ctx = createCtx({ privateKey: false });
    const next = mock(async () => {});

    await checkAccess("privateKeys", "read")(ctx, next);

    expect(ctx.status).toBe(403);
    expect(ctx.body).toEqual({
      error: "Forbidden",
      message: "You don't have access to this resource",
    });
    expect(next.mock.calls.length).toBe(0);
  });
});
