import { monitorOpenAI } from "lunary/openai"
import OpenAI from "openai"

export function getOpenAIParams() {
  if (process.env.OPENAI_API_KEY) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
    }
  } else if (process.env.AZURE_OPENAI_API_KEY) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY
    const model = process.env.AZURE_OPENAI_DEPLOYMENT_ID
    const resource = process.env.AZURE_OPENAI_RESOURCE_NAME

    return {
      apiKey,
      baseURL: `https://${resource}.openai.azure.com/openai/deployments/${model}`,
      defaultQuery: { "api-version": "2024-02-01" },
      defaultHeaders: { "api-key": apiKey },
    }
  } else {
    return null
  }
}
const clientParams = getOpenAIParams()

export default clientParams ? monitorOpenAI(new OpenAI(clientParams)) : null
