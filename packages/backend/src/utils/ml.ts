export async function callML(
  method: string,
  data: any,
  baseUrl: string = process.env.ML_URL,
) {
  const response = await fetch(`${baseUrl}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  return response.json()
}
