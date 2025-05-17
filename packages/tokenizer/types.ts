interface Model {
  id: string
  name: string
  pattern: string
  unit: string
  inputCost: number
  outputCost: number
  tokenizer: string
  startDate: string | null
  createdAt: string
  updatedAt: string
  orgId: string | null
}

type CostType = "prompt" | "completion"

type DeepseekModels =
  | "DeepSeek-R1"
  | "DeepSeek-R1-Zero"
  | "DeepSeek-R1-Distill-Llama-70B"
  | "DeepSeek-R1-Distill-Qwen-32B"
  | "DeepSeek-V3-Base"
  | "DeepSeek-V3"
  | "DeepSeek-VL2-Tiny"
  | "DeepSeek-VL2-Small"
  | "DeepSeek-VL2"
  | "DeepSeek-Prover-V1.5-Base"
  | "DeepSeek-Prover-V1.5-SFT"
  | "DeepSeek-Prover-V1.5-RL"
  | "DeepSeek-V2-Chat-0628"
  | "DeepSeek-V2-Chat"
  | "DeepSeek-V2"
  | "DeepSeek-V2-Lite"
  | "DeepSeek-Coder-V2-Instruct"
  | "DeepSeek-Coder-V2-Base"
  | "DeepSeek-Coder-V2-Lite-Base"
  | "DeepSeek-Coder-V2-Lite-Instruct"
  | "DeepSeek-Math-7B-Instruct"
  | "DeepSeek-Math-7B-RL"
  | "DeepSeek-Math-7B-Base"
  | "ESFT-Vanilla-Lite"
  | "ESFT-Token-Law-Lite"
  | "ESFT-Token-Summary-Lite"
  | "ESFT-Token-Code-Lite"
  | "DeepSeek-VL-7B-Chat"
  | "DeepSeek-VL-1.3B-Base"
  | "DeepSeek-VL-7B-Base"
  | "DeepSeek-VL-1.3B-Chat"
  | "DeepSeek-Coder-33B-Instruct"
  | "DeepSeek-Coder-6.7B-Instruct"
  | "DeepSeek-Coder-7B-Instruct-V1.5"
  | "DeepSeek-Coder-1.3B-Instruct"
  | "DeepSeek-LLM-67B-Chat"
  | "DeepSeek-LLM-7B-Chat"
  | "DeepSeek-LLM-67B-Base"
  | "DeepSeek-LLM-7B-Base"
  | "DeepSeek-MoE-16B-Base"
  | "DeepSeek-MoE-16B-Chat"
  | "DeepSeek-V2.5"

export { Model, CostType, DeepseekModels }
