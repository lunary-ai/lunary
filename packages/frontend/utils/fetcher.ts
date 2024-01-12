import { notifications } from "@mantine/notifications"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

function get(url) {
  return fetch(`${BASE_URL}/v1${url}`, {}).then(handleResponse)
}

function post(url, { arg }) {
  return fetch(`${BASE_URL}/v1${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  }).then(handleResponse)
}

function patch(url, { arg }) {
  return fetch(`${BASE_URL}/v1${url}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  }).then(handleResponse)
}

async function del(url) {
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1${url}`, {
    method: "DELETE",
  }).then(handleResponse)
}

async function handleResponse(res: Response) {
  const contentType = res.headers.get("Content-Type")
  const isJson = contentType?.includes("application/json")

  if (!res.ok) {
    if (isJson) {
      const { error, message } = await res.json()

      notifications.show({
        title: error || "Unknown error",
        message: message || "Something went wrong",
        color: "red",
        autoClose: 10000,
      })

      throw new Error(message)
    }
  }

  if (isJson) {
    return res.json()
  }
  return res.text()
}

export const fetcher = {
  get,
  post,
  patch,
  delete: del,
}
