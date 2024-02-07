export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage

interface SystemMessage {
  role: "system"
  content: string
  name?: string
}

interface UserMessage {
  role: "user"
  content: string
  name?: string
}

interface AssistantMessage {
  role: "assistant"
  content?: string | null
  name?: string

  tool_calls?: ToolCall[]
}

interface ToolMessage {
  role: "tool"
  content: string
  tool_call_id: string
}

interface ToolCall {
  id: string
  function: {
    arguments: string
    name: string
  }
  type: "function"
}
