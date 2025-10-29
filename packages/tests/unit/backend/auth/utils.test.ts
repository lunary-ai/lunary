import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { SignJWT } from "jose";

import { IDs } from "../../_helpers/ids";
import { resetSqlMock, setSqlResolver } from "../utils/mockSql";

const bunPasswordVerifyMock = mock(async () => true);
const bunPasswordHashMock = mock(
  async (password: string) => `$argon$${password}`,
);

mock.module("bun", () => ({
  password: {
    verify: bunPasswordVerifyMock,
    hash: bunPasswordHashMock,
  },
}));

const sendEmailMock = mock(async () => {});
const resetPasswordTemplateMock = mock((email: string, link: string) => ({
  email,
  link,
}));

mock.module("@/src/emails", () => ({
  sendEmail: sendEmailMock,
  RESET_PASSWORD: resetPasswordTemplateMock,
}));

type AuthUtilsModule = typeof import("@/src/api/v1/auth/utils");

let verifyPassword: AuthUtilsModule["verifyPassword"];
let hashPassword: AuthUtilsModule["hashPassword"];
let signJWT: AuthUtilsModule["signJWT"];
let verifyJWT: AuthUtilsModule["verifyJWT"];
let authMiddleware: AuthUtilsModule["authMiddleware"];
let requestPasswordReset: AuthUtilsModule["requestPasswordReset"];
let isJWTExpired: AuthUtilsModule["isJWTExpired"];

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.APP_URL = "https://app.lunary.test";

  ({
    verifyPassword,
    hashPassword,
    signJWT,
    verifyJWT,
    authMiddleware,
    requestPasswordReset,
    isJWTExpired,
  } = await import("@/src/api/v1/auth/utils"));
});

beforeEach(() => {
  resetSqlMock();
  bunPasswordVerifyMock.mockReset();
  bunPasswordHashMock.mockReset();
  sendEmailMock.mockReset();
  resetPasswordTemplateMock.mockReset();
});

function createMockCtx(overrides: Partial<any> = {}) {
  const ctx: any = {
    path: "/",
    request: {
      headers: {},
      query: {},
      ip: "localhost",
      ...(overrides.request || {}),
    },
    state: { projectId: IDs.projectCtx, ...(overrides.state || {}) },
    body: undefined,
    status: undefined,
    throw(status: number, message?: string) {
      const error: any = new Error(message);
      error.status = status;
      throw error;
    },
    ...overrides,
  };

  return ctx;
}

describe("verifyPassword / hashPassword", () => {
  test("delegates Argon2 verification when hash prefix matches", async () => {
    bunPasswordVerifyMock.mockResolvedValueOnce(true);
    const result = await verifyPassword("super-secret", "$argon2id$hash");

    expect(result).toBe(true);
    expect(bunPasswordVerifyMock.mock.calls.length).toBe(1);
    expect(bunPasswordVerifyMock.mock.calls[0]).toEqual([
      "super-secret",
      "$argon2id$hash",
    ]);
  });

  test("delegates bcrypt verification when hash prefix matches", async () => {
    bunPasswordVerifyMock.mockResolvedValueOnce(true);
    const result = await verifyPassword("hunter2", "$2b$something");

    expect(result).toBe(true);
    expect(bunPasswordVerifyMock.mock.calls.length).toBe(1);
    expect(bunPasswordVerifyMock.mock.calls[0]).toEqual([
      "hunter2",
      "$2b$something",
    ]);
  });

  test("throws for unsupported hash prefix", async () => {
    let captured;
    try {
      await verifyPassword("irrelevant", "$md5$nope");
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeDefined();
    expect((captured as Error).message).toBe("Unknown hash type");
  });

  test("hashPassword uses Argon2 hashing", async () => {
    bunPasswordHashMock.mockResolvedValueOnce("computed-hash");
    const result = await hashPassword("super-secret");

    expect(result).toBe("computed-hash");
    expect(bunPasswordHashMock.mock.calls.length).toBe(1);
    expect(bunPasswordHashMock.mock.calls[0]).toEqual([
      "super-secret",
      { algorithm: "argon2id" },
    ]);
  });
});

describe("JWT helpers", () => {
  test("signJWT creates verifiable tokens with future expiration", async () => {
    const token = await signJWT({
      userId: IDs.user1,
      orgId: IDs.org1,
      email: "user@example.com",
    });

    const { payload } = await verifyJWT<typeof SignJWT>(token);
    expect(payload.userId).toBe(IDs.user1);
    expect(payload.orgId).toBe(IDs.org1);
    expect(payload.email).toBe("user@example.com");
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test("verifyJWT rejects when secret changes", async () => {
    const originalSecret = process.env.JWT_SECRET!;
    const token = await signJWT({ userId: IDs.user2 });

    process.env.JWT_SECRET = "other-secret";

    let captured;
    try {
      await verifyJWT(token);
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeDefined();

    process.env.JWT_SECRET = originalSecret;
  });

  test("isJWTExpired detects past expiration", async () => {
    const expiredToken = await new SignJWT({ userId: IDs.user3 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 10)
      .setNotBefore(Math.floor(Date.now() / 1000) - 10)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 5)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const isExpired = await isJWTExpired(expiredToken);
    expect(isExpired).toBe(true);
  });
});

describe("requestPasswordReset", () => {
  test("stores recovery token and sends reset email", async () => {
    let storedToken: string | undefined;

    setSqlResolver((query, values) => {
      if (query.includes("select id from account")) {
        return [{ id: IDs.account1 }];
      }
      if (query.includes("update account set recovery_token")) {
        storedToken = values[0] as string;
        return [];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    await requestPasswordReset("user@example.com");

    expect(storedToken).toBeDefined();
    expect(sendEmailMock.mock.calls.length).toBe(1);
    expect(resetPasswordTemplateMock.mock.calls.length).toBe(1);

    const [emailArg, linkArg] = resetPasswordTemplateMock.mock.calls[0];
    expect(emailArg).toBe("user@example.com");
    expect(linkArg).toContain(storedToken);

    const templatePayload = resetPasswordTemplateMock.mock.results[0]?.value;
    expect(sendEmailMock.mock.calls[0][0]).toEqual(templatePayload);

    const verified = await verifyJWT(storedToken!);
    expect(verified.payload.type).toBe("password_reset");
    resetSqlMock();
  });
});

describe("authMiddleware", () => {
  test("allows unauthenticated access to public routes", async () => {
    setSqlResolver(() => {
      throw new Error("SQL should not be touched for public routes");
    });

    const ctx = createMockCtx({
      path: "/auth/login",
      request: { headers: {} },
    });
    const next = mock(async () => {});

    await authMiddleware(ctx, next);

    expect(next.mock.calls.length).toBe(1);
  });

  test("accepts private API key and flags privateKey access", async () => {
    const privateKey = crypto.randomUUID();

    setSqlResolver((query) => {
      if (query.includes("from api_key")) {
        return [{ type: "private", projectId: IDs.project1, orgId: IDs.org1 }];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const ctx = createMockCtx({
      path: "/v1/projects",
      request: {
        headers: {
          authorization: `Bearer ${privateKey}`,
        },
      },
      state: {},
    });
    const next = mock(async () => {});

    await authMiddleware(ctx, next);

    expect(ctx.state.projectId).toBe(IDs.project1);
    expect(ctx.state.orgId).toBe(IDs.org1);
    expect(ctx.state.privateKey).toBe(true);
    expect(next.mock.calls.length).toBe(1);
  });

  test("rejects org API keys on disallowed routes", async () => {
    const orgApiKey = crypto.randomUUID();

    setSqlResolver((query) => {
      if (query.includes("from api_key")) {
        return [{ type: "org_private", orgId: IDs.org77, projectId: null }];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const ctx = createMockCtx({
      path: "/v1/runs/ingest",
      request: {
        headers: {
          authorization: `Bearer ${orgApiKey}`,
        },
      },
      state: {},
    });
    const next = mock(async () => {});

    let thrown;
    try {
      await authMiddleware(ctx, next);
    } catch (error) {
      thrown = error as any;
    }

    expect(thrown?.status).toBe(401);
    expect(next.mock.calls.length).toBe(0);
  });

  test("allows org API keys on approved analytics endpoint", async () => {
    const orgApiKey = crypto.randomUUID();

    setSqlResolver((query) => {
      if (query.includes("from api_key")) {
        return [{ type: "org_private", orgId: IDs.org77, projectId: null }];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const ctx = createMockCtx({
      path: "/v1/analytics/org/models/top",
      request: {
        headers: {
          authorization: `Bearer ${orgApiKey}`,
        },
      },
      state: {},
    });
    const next = mock(async () => {});

    await authMiddleware(ctx, next);

    expect(ctx.state.orgId).toBe(IDs.org77);
    expect(ctx.state.projectId).toBeUndefined();
    expect(ctx.state.apiKeyType).toBe("org_private");
    expect(next.mock.calls.length).toBe(1);
  });

  test("rejects public API key on private endpoint", async () => {
    const publicKey = crypto.randomUUID();

    setSqlResolver((query) => {
      if (query.includes("from api_key")) {
        return [{ type: "public", projectId: IDs.project1, orgId: IDs.org1 }];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const ctx = createMockCtx({
      path: "/v1/projects",
      request: {
        headers: {
          authorization: `Bearer ${publicKey}`,
        },
      },
    });
    const next = mock(async () => {});

    let thrown;
    try {
      await authMiddleware(ctx, next);
    } catch (error) {
      thrown = error as any;
    }

    expect(thrown).toBeDefined();
    expect(thrown.status).toBe(401);
    expect(thrown.message).toBe("This route requires a private API key");
  });

  test("throws session expired for expired JWT", async () => {
    const token = await new SignJWT({ userId: IDs.user12, orgId: IDs.org9 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 40)
      .setNotBefore(Math.floor(Date.now() / 1000) - 40)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 5)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const ctx = createMockCtx({
      path: "/v1/projects",
      request: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    });
    const next = mock(async () => {});

    let thrown;
    try {
      await authMiddleware(ctx, next);
    } catch (error) {
      thrown = error as any;
    }

    expect(thrown).toBeDefined();
    expect(thrown.status).toBe(401);
    expect(thrown.message).toBe("Session expired");
  });

  test("blocks JWT access when user lacks project membership", async () => {
    const token = await signJWT({
      userId: IDs.user15,
      orgId: IDs.org2,
      email: "owner@example.com",
    });

    setSqlResolver((query) => {
      if (query.includes("from account where id")) {
        return [{ id: IDs.user15, role: "member" }];
      }
      if (query.includes("from account_project")) {
        return [];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const ctx = createMockCtx({
      path: "/v1/projects",
      request: {
        headers: {
          authorization: `Bearer ${token}`,
        },
        query: { projectId: IDs.project2 },
      },
    });
    const next = mock(async () => {});

    await authMiddleware(ctx, next);

    expect(ctx.status).toBe(401);
    expect(ctx.body).toEqual({
      message: "Unauthorized access to project",
    });
    expect(next.mock.calls.length).toBe(0);
  });
});
