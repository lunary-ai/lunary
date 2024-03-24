export async function callML(method: string, data: any) {
  const response = await fetch(`http://localhost:4242/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  return response.json()
}
