import Router from "next/router"
import { signOut } from "../auth"
import { showErrorNotification } from "../errors"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL as string

export function buildUrl(path: string) {
  if (path.includes("/auth")) {
    return `${BASE_URL}${path}`
  }
  return `${BASE_URL}/v1${path}`
}

export function getHeaders() {
  const authToken = localStorage.getItem("auth-token")
  return authToken
    ? {
        Authorization: `Bearer ${authToken}`,
      }
    : undefined
}

function get(path) {
  return fetch(buildUrl(path), {
    headers: getHeaders(),
  }).then(handleResponse)
}

function getText(path) {
  return fetch(buildUrl(path), {
    headers: getHeaders(),
  }).then((res) => res.text())
}

async function getFile(path) {
  const res = await fetch(buildUrl(path), {
    headers: getHeaders(),
  })

  if (!res.ok) {
    const { error, message } = await res.json()

    showErrorNotification(error, message)
    throw new Error(message)
  }

  const contentType = res.headers.get("Content-Type") as string
  const fileExtension = contentType.split("/")[1]

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `export.${fileExtension}`

  document.body.appendChild(a)
  a.click()
  a.remove()

  window.URL.revokeObjectURL(url)
}

async function getStream(url, args, onChunk) {
  const res = await fetch(buildUrl(url), {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(args),
  })

  if (!res.ok) {
    const { error, message } = await res.json()
    showErrorNotification(error, message)
    throw new Error(message)
  }

  const reader = res.body?.getReader()

  if (!reader) {
    throw new Error("Error creating a stream from the response.")
  }

  let decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    const chunk = decoder.decode(value, { stream: true }).trim().split("\n")

    for (const item of chunk) onChunk(item)
  }
}

function post(path, { arg }) {
  return fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(arg),
  }).then(handleResponse)
}

function patch(path, { arg }) {
  return fetch(buildUrl(path), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(arg),
  }).then(handleResponse)
}

async function del(path) {
  return fetch(buildUrl(path), {
    method: "DELETE",
    headers: getHeaders(),
  }).then(handleResponse)
}

async function handleResponse(res: Response) {
  const isLoginPage = Router.pathname === "/login"

  if (!res.ok) {
    if (res.status === 401 && !isLoginPage) {
      return signOut()
    }

    const { error, message } = await res.json()

    showErrorNotification(error, message)
    throw new Error(message)
  }

  return res.json()
}

export const clientFetcher = {
  get,
  getFile,
  getText,
  getStream,
  post,
  patch,
  delete: del,
}
