export async function callML(method: string, data: any) {
  const response = await fetch(`${process.env.ML_URL}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  return response.json()
}
