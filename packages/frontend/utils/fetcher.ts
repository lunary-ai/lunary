import Router from "next/router"
import { signOut } from "./auth"
import { showErrorNotification } from "./errors"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export function buildUrl(path: string) {
  if (path.includes("/auth")) {
    return `${BASE_URL}${path}`
  }
  return `${BASE_URL}/v1${path}`
}

function get(path) {
  const authToken = localStorage.getItem("auth-token")
  const headers = authToken
    ? {
        Authorization: `Bearer ${authToken}`,
      }
    : undefined

  return fetch(buildUrl(path), {
    headers,
  }).then(handleResponse)
}

async function getFile(path) {
  const res = await fetch(buildUrl(path), {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
    },
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

function post(path, { arg }) {
  return fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
    },
    body: JSON.stringify(arg),
  }).then(handleResponse)
}

function patch(path, { arg }) {
  return fetch(buildUrl(path), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
    },
    body: JSON.stringify(arg),
  }).then(handleResponse)
}

async function del(path) {
  return fetch(buildUrl(path), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
    },
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

export const fetcher = {
  get,
  getFile,
  post,
  patch,
  delete: del,
}
