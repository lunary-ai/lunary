import NodeCache from "node-cache"
import { CostType, Model } from "./types"

const cache = new NodeCache({ stdTTL: 600 }) // Cache TTL (time to live) is 600 seconds (10 minutes)

const getLatestModelsByPattern = (models: Model[]): Model[] => {
  const grouped: Record<string, Model[]> = models.reduce((acc, model) => {
    const { pattern } = model
    acc[pattern] = acc[pattern] || []
    acc[pattern].push(model)
    return acc
  }, {} as Record<string, Model[]>)

  return Object.values(grouped).map(
    (group) =>
      group.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date(0)
        const dateB = b.startDate ? new Date(b.startDate) : new Date(0)
        return dateB.getTime() - dateA.getTime()
      })[0]
  )
}

const fetchModelsFromAPI = async (): Promise<Model[]> => {
  const response = await fetch("https://api.lunary.ai/v1/models", {
    headers: {
      Authorization: "Bearer 8985ed63-e122-43a5-8455-6e64525fca56",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch models from server")
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    throw new Error("Invalid data format from database API")
  }

  return data as Model[]
}

const getCachedModels = async (): Promise<Model[]> => {
  let models = cache.get<Model[]>("modelData")
  if (!models) {
    const fetchedModels = await fetchModelsFromAPI()
    models = getLatestModelsByPattern(fetchedModels)
    cache.set("modelData", models)
  }
  return models
}

const calculateCost = (
  numTokens: number,
  model: Model,
  type: CostType
): number => {
  if (type === "prompt") {
    return (numTokens * model.inputCost) / 1_000_000
  } else if (type === "completion") {
    return (numTokens * model.outputCost) / 1_000_000
  } else {
    throw new Error("Invalid type. Valid types are 'prompt' or 'completion'.")
  }
}

export { calculateCost, getCachedModels }
