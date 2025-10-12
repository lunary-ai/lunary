import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

const windowRef = globalThis as any;

const signOutMock = mock(async () => {});
const showErrorNotificationMock = mock(() => {});

mock.module("../../../frontend/utils/auth", () => ({
  signOut: signOutMock,
}));

mock.module("../../../frontend/utils/errors", () => ({
  showErrorNotification: showErrorNotificationMock,
}));

mock.module("next/router", () => ({
  default: {
    pathname: "/dashboard",
  },
}));

let originalFetch: typeof fetch;

beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.lunary.test";
  process.env.NODE_ENV = "production";
});

beforeEach(() => {
  originalFetch = global.fetch;
  signOutMock.mockReset();
  showErrorNotificationMock.mockReset();
  windowRef.window = windowRef.window ?? windowRef;
  const store = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  windowRef.localStorage = storage;
  windowRef.window.localStorage = storage;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("fetcher utilities", () => {
  test("buildUrl prefixes v1 for non-auth routes", async () => {
    const { buildUrl } = await import("../../../frontend/utils/fetcher");

    expect(buildUrl("/projects")).toBe(
      "https://api.lunary.test/v1/projects",
    );
    expect(buildUrl("/auth/login")).toBe(
      "https://api.lunary.test/auth/login",
    );
  });

  test("getHeaders injects bearer token when present", async () => {
    const { getHeaders } = await import("../../../frontend/utils/fetcher");
    windowRef.localStorage.setItem("auth-token", "abc123");

    expect(getHeaders()).toEqual({
      Authorization: "Bearer abc123",
    });
  });

  test("post attaches authorization header and payload", async () => {
    const responsePayload = { ok: true };
    const fetchMock = mock(
      async () =>
        new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    (global as any).fetch = fetchMock;

    const { fetcher } = await import("../../../frontend/utils/fetcher");

    windowRef.localStorage.setItem("auth-token", "jwt-token");

    const result = await fetcher.post("/projects", {
      arg: { name: "New Project" },
    });

    expect(result).toEqual(responsePayload);
    expect(fetchMock.mock.calls.length).toBe(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer jwt-token");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ name: "New Project" });
  });

  test("handleResponse triggers signOut on 401 outside the login page", async () => {
    const fetchMock = mock(
      async () =>
        new Response(
          JSON.stringify({ error: "Unauthorized", message: "Session expired" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    (global as any).fetch = fetchMock;

    const { fetcher } = await import("../../../frontend/utils/fetcher");

    await fetcher.get("/projects");

    expect(signOutMock.mock.calls.length).toBe(1);
  });

  test("propagates API errors through notifications", async () => {
    const fetchMock = mock(
      async () =>
        new Response(
          JSON.stringify({ error: "Rate Limited", message: "Too fast" }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    (global as any).fetch = fetchMock;

    const { fetcher } = await import("../../../frontend/utils/fetcher");

    await fetcher.get("/projects");
    expect(showErrorNotificationMock.mock.calls.length).toBe(1);
    expect(showErrorNotificationMock.mock.calls[0]).toEqual([
      "Too many requests",
      "Retry in one minute",
    ]);
  });
});
