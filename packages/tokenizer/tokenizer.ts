import { default as claude } from "@anthropic-ai/tokenizer/claude.json"
import llama3Tokenizer from "llama3-tokenizer-js"
import {
  Tiktoken,
  getEncodingNameForModel,
  getEncoding,
  TiktokenModel,
} from "js-tiktoken"
import { AutoTokenizer } from "@xenova/transformers"
import { default as mistralTokenizer } from "mistral-tokenizer-js"
import { DeepseekModels } from "./types"

let anthropicTokenizer
let grokTokenizer
let gemma2Tokenizer
let openaiTokenizer
let deepseekTokenizer

async function getAnthropicTokenizer() {
  if (!anthropicTokenizer) {
    const ranks = {
      bpe_ranks: claude.bpe_ranks,
      special_tokens: claude.special_tokens,
      pat_str: claude.pat_str,
    }
    anthropicTokenizer = new Tiktoken(ranks)
  }

  return {
    encoder: (text) => anthropicTokenizer.encode(text.normalize("NFKC"), "all"),
    decoder: (tokens) => anthropicTokenizer.decode(tokens),
  }
}

async function getDeepseekTokenizer(model: DeepseekModels) {
  if (!deepseekTokenizer) {
    deepseekTokenizer = await AutoTokenizer.from_pretrained(
      `deepseek-ai/${model}`
    )
  }

  return {
    encoder: (text: string) => deepseekTokenizer.encode(text),
    decoder: (tokens: number[]) => deepseekTokenizer.decode(tokens),
  }
}

async function getGrokTokenizer() {
  if (!grokTokenizer) {
    grokTokenizer = await AutoTokenizer.from_pretrained(
      "Xenova/grok-1-tokenizer"
    )
  }

  return {
    encoder: (text) => grokTokenizer.encode(text),
    decoder: (tokens) => grokTokenizer.decode(tokens),
  }
}

async function getGemma2Tokenizer() {
  if (!gemma2Tokenizer) {
    gemma2Tokenizer = await AutoTokenizer.from_pretrained(
      "BeaverAI/gemma-2-tokenizer"
    )
  }

  return {
    encoder: (text) => gemma2Tokenizer.encode(text),
    decoder: (tokens) => gemma2Tokenizer.decode(tokens),
  }
}

async function getMistralTokenizer() {
  return {
    encoder: (text) => mistralTokenizer.encode(text, false, false),
    decoder: (tokens) => mistralTokenizer.decode(tokens, false, false),
  }
}

async function getLlama3Tokenizer() {
  return {
    encoder: (text) => llama3Tokenizer.encode(text),
    decoder: (tokens) => llama3Tokenizer.decode(tokens),
  }
}

async function getOpenaiTokenizer(model: TiktokenModel) {
  if (!openaiTokenizer) {
    const encodingName = await getEncodingNameForModel(model)
    openaiTokenizer = await getEncoding(encodingName)
  }

  return {
    encoder: (text: string) => openaiTokenizer!.encode(text),
    decoder: (tokens: number[]) => openaiTokenizer!.decode(tokens),
  }
}

async function getTokenizer(
  type: string,
  model?: TiktokenModel | DeepseekModels
) {
  switch (type) {
    case "anthropic":
      return getAnthropicTokenizer()
    case "grok":
      return getGrokTokenizer()
    case "mistral":
      return getMistralTokenizer()
    case "llama3":
      return getLlama3Tokenizer()
    case "gemma2":
      return getGemma2Tokenizer()
    case "openai":
      // For the case of openaAI tokenizer, We need the model also.
      // Each model is using different encoding
      if (!model) {
        model = "gpt-4o"
      }
      return getOpenaiTokenizer(model as TiktokenModel)
    case "deepseek":
      if (!model) {
        model = "DeepSeek-V3"
      }
      return getDeepseekTokenizer(model as DeepseekModels)
    default:
      throw new Error("Invalid tokenizer type")
  }
}

export { getTokenizer }
