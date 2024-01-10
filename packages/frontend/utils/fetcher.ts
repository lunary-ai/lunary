const BASE_URL = process.env.NEXT_PUBLIC_API_URL

function get(url) {
  return fetch(`${BASE_URL}/v1${url}`, {}).then((res) => res.json())
}

function post(url, body, options = {}) {
  return fetch(`${BASE_URL}/v1${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then((res) => res.json())
}

function patch(url, body, options = {}) {
  return fetch(`${BASE_URL}/v1${url}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then((res) => res.json())
}

function del(url) {
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1${url}`, {
    method: "DELETE",
  }).then((res) => res.json())
}

export const fetcher = {
  get,
  post,
  patch,
  delete: del,
}
