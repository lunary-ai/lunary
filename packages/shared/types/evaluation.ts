import { FilterLogic } from ".."
import { Message } from "./openai"

export interface Evaluation {
  name?: string
  prompts: Prompt[]
  models: string[]
  checks: FilterLogic | []
}

export interface Prompt {
  messages: Message[]
  variations: Variation[]
}

export interface Variation {
  variables: Record<string, string>
  context?: string
  idealOutput?: string
}
