export async function callML(method: string, data: any) {
  const response = await fetch(`http://${process.env.ML_URL}/${method}`, {
    method: "POST",
    // For example at the first ML calls, it needs to DL the models, so it can take a while
    // So add timeout
    signal: AbortSignal.timeout(5000),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  return response.json()
}
