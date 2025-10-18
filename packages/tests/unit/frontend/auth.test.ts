import { beforeEach, describe, expect, mock, test } from "bun:test";

const windowRef = globalThis as any;

const pushMock = mock(async () => {});

mock.module("next/router", () => ({
  default: {
    push: pushMock,
  },
}));

function createStorage() {
  const store = new Map<string, string>();
  return {
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
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

function buildJwt(payload: Record<string, unknown>) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

beforeEach(() => {
  windowRef.window = windowRef.window ?? windowRef;
  windowRef.localStorage = createStorage();
  windowRef.sessionStorage = createStorage();
  windowRef.window.localStorage = windowRef.localStorage;
  windowRef.window.sessionStorage = windowRef.sessionStorage;
  windowRef.window.dispatchEvent = () => true;
  windowRef.window.addEventListener ||= () => {};
  windowRef.window.removeEventListener ||= () => {};
  windowRef.Event =
    windowRef.Event ||
    class CustomEvent {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    };
  pushMock.mockReset();
});

// describe("signOut", () => {
//   test("clears persisted state and redirects with email hint", async () => {
//     const future = Math.floor(Date.now() / 1000) + 3600;
//     const token = buildJwt({ exp: future, email: "owner@lunary.ai" });
//     windowRef.localStorage.setItem("auth-token", token);
//     windowRef.sessionStorage.setItem("projectId", "proj-123");

//     const { signOut } = await import("../../../frontend/utils/auth");

//     await signOut();

//     expect(windowRef.localStorage.getItem("auth-token")).toBeNull();
//     expect(windowRef.sessionStorage.getItem("projectId")).toBeNull();
//     expect(pushMock.mock.calls.length).toBe(1);
//     expect(pushMock.mock.calls[0][0]).toBe(
//       "/login?email=owner%40lunary.ai",
//     );
//   });

//   test("redirects to bare login path when JWT is absent", async () => {
//     const { signOut } = await import("../../../frontend/utils/auth");

//     await signOut();

//     expect(pushMock.mock.calls.length).toBe(1);
//     expect(pushMock.mock.calls[0][0]).toBe("/login");
//   });
// });
