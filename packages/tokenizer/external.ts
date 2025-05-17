export const getAnthropicTokenCount = async (
  msg_content : string,
  model : string = "claude-3-5-sonnet-20241022"
) => {
  const url = "https://api.anthropic.com/v1/messages/count_tokens"
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("API key is not defined")
  }

  const headers = {
    "x-api-key": apiKey,
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
  }

  const body = JSON.stringify({
    model: model,
    messages: [
      {
        role: "user",
        content: msg_content,
      },
    ],
  })

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching token count:", error)
    throw error
  }
}
