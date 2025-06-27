import Router from "next/router";
import { signOut } from "./auth";
import { showErrorNotification } from "./errors";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL as string;

export function buildUrl(path: string) {
  if (path.includes("/auth")) {
    return `${BASE_URL}${path}`;
  }
  return `${BASE_URL}/v1${path}`;
}

export function getHeaders() {
  const authToken = localStorage.getItem("auth-token");
  return authToken
    ? {
        Authorization: `Bearer ${authToken}`,
      }
    : undefined;
}

function get(path) {
  return fetch(buildUrl(path), {
    headers: getHeaders(),
  }).then(handleResponse);
}

function getText(path) {
  return fetch(buildUrl(path), {
    headers: getHeaders(),
  }).then((res) => res.text());
}

async function getFile(path) {
  const res = await fetch(buildUrl(path), {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const { error, message } = await res.json();

    showErrorNotification(error, message);
    throw new Error(message);
  }

  const data = await res.json();
  if (data.token) {
    window.location.assign(buildUrl(`/runs/download/${data.token}`));
  }
}

async function getStream(url, args, onChunk) {
  const res = await fetch(buildUrl(url), {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const { error, message } = await res.json();
    showErrorNotification(error, message);
    throw new Error(message);
  }

  const reader = res.body?.getReader();

  if (!reader) {
    throw new Error("Error creating a stream from the response.");
  }

  let decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    const chunk = decoder.decode(value, { stream: true }).trim().split("\n");

    for (const item of chunk) onChunk(item);
  }
}

function post(path, { arg = {} } = {}) {
  return fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(arg),
  }).then(handleResponse);
}
function patch(path, { arg }) {
  return fetch(buildUrl(path), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(arg),
  }).then(handleResponse);
}

function put(path, { arg }) {
  return fetch(buildUrl(path), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(arg),
  }).then(handleResponse);
}

async function del(path) {
  return fetch(buildUrl(path), {
    method: "DELETE",
    headers: getHeaders(),
  }).then(handleResponse);
}

async function handleResponse(res: Response) {
  const isLoginPage = Router.pathname === "/login";

  // There's no body sent back on HTTP 204 (used for DELETE)
  if (res.status === 204) {
    return;
  }

  if (!res.ok) {
    if (
      res.status === 401 &&
      !isLoginPage &&
      process.env.NODE_ENV !== "development"
    ) {
      return signOut();
    }

    if (res.status === 429) {
      return showErrorNotification("Too many requests", "Retry in one minute");
    }

    const { error, message } = await res.json();

    if (message === "Session expired") {
      signOut();
      return;
    } else if (message === "Invalid access token") {
      signOut();
      return;
    }
    showErrorNotification(error, message);
    throw new Error(message);
  }

  return res.json();
}

export const fetcher = {
  get,
  getFile,
  getText,
  getStream,
  post,
  patch,
  put,
  delete: del,
};
