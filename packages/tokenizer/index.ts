import Koa from "koa"
import Router from "koa-router"
import bodyParser from "koa-bodyparser"
import ratelimit from "koa-ratelimit"
import seedColor from "seed-color"
import { Context } from "koa"
import cors from "@koa/cors"

import { getTokenizer } from "./tokenizer"
import { calculateCost, getCachedModels } from "./models"
import { Model } from "./types"
import { getAnthropicTokenCount } from "./external"

const db = new Map()

const app = new Koa()
const router = new Router()
app.use(cors())

app.use(
  ratelimit({
    driver: "memory",
    db: db,
    duration: 1000,
    errorMessage: "Slow down, too many requests",
    id: (ctx) => ctx.ip,
    max: 5,
    disableHeader: false,
    headers: {
      remaining: "Rate-Limit-Remaining",
      reset: "Rate-Limit-Reset",
      total: "Rate-Limit-Total",
    },
  }),
)

router.post("/v1/:type/encode", async (ctx: Context) => {
  const { type } = ctx.params
  const { text, model } = ctx.request.body

  try {
    const tokenizer = await getTokenizer(type, model)
    ctx.body = { tokens: tokenizer.encoder(text) }
  } catch (error) {
    ctx.throw(400, error.message)
  }
})

router.post("/v1/:type/decode", async (ctx: Context) => {
  const { type } = ctx.params
  const { tokens, model } = ctx.request.body

  try {
    const tokenizer = await getTokenizer(type, model)
    ctx.body = { text: tokenizer.decoder(tokens) }
  } catch (error) {
    ctx.throw(400, error.message)
  }
})

router.post("/v1/:type/token-chunks", async (ctx: Context) => {
  const { type } = ctx.params
  const { text, model } = ctx.request.body

  try {
    const tokenizer = await getTokenizer(type, model)
    const chunks: { token: any; text: any; color: string }[] = []

    let allTokens = tokenizer.encoder(text)
    let expectedTokenCount = 0
    for (let i = 0; i < allTokens.length; i++) {
      const token = allTokens[i]
      const color = seedColor(token).toHex()
      const tokenText = await tokenizer.decoder([token])

      const chunk = {
        token,
        text: tokenText,
        color,
      }
      chunks.push(chunk)
    }
    if (type == "anthropic") {
      const response = await getAnthropicTokenCount(text)
      expectedTokenCount = response?.input_tokens
    } else {
      expectedTokenCount = chunks.length
    }
    ctx.body = { chunks, expectedTokenCount }
  } catch (error) {
    ctx.throw(400, error.message)
  }
})

router.post("/v1/cost-estimate", async (ctx: Context) => {
  const { text, model, type = "prompt" } = ctx.request.body

  try {
    const models = await getCachedModels()
    // Match the model with regex patterns in the database
    const matchedModel = models.find((entry: Model) =>
      new RegExp(entry.pattern).test(model),
    )

    if (!matchedModel) {
      ctx.throw(400, "No matching model found")
      return
    }

    // Determine the tokenizer and calculate token count
    const tokenizer = await getTokenizer(matchedModel.tokenizer, model)
    let numTokens = tokenizer.encoder(text).length
    if (matchedModel.tokenizer == "anthropic") {
      const response = await getAnthropicTokenCount(text)
      const expectedTokenCount = response?.input_tokens
      if (expectedTokenCount) {
        numTokens = expectedTokenCount
      }
    }
    // Calculate total cost
    const totalCost = calculateCost(numTokens, matchedModel, type)

    // Respond with the total cost
    ctx.body = { total_cost: totalCost }
  } catch (error) {
    ctx.throw(400, error.message)
  }
})

router.get("/v1/get-models/:tokenizer", async (ctx: Context) => {
  const { tokenizer } = ctx.params
  try {
    // Retrieve all models (assuming this function exists and returns a list of models)
    const models = await getCachedModels()

    // Filter models based on the tokenizer and get unique model names
    const uniqueModels = [
      ...new Set(
        models
          .filter((model) => model.tokenizer === tokenizer)
          .map((model) => model.name),
      ),
    ].reverse()

    // Respond with the filtered model names
    ctx.body = {
      success: true,
      tokenizer,
      models: uniqueModels,
    }
  } catch (error) {
    ctx.throw(400, error.message)
  }
})

router.get("/health", async (ctx: Context) => {
  const tokenizerTypes = ["anthropic", "grok", "mistral", "llama3", "gemma2"]
  const results = {}
  let allTokenizersHealthy = true

  for (const type of tokenizerTypes) {
    try {
      const tokenizer = await getTokenizer(type)

      const testText = "Hello, world!"
      const tokens = tokenizer.encoder(testText)
      const decodedText = tokenizer.decoder(tokens)

      results[type] = {
        status: "ok",
        encodedTokens: tokens.length,
        decodedText,
      }
    } catch (error) {
      allTokenizersHealthy = false
      results[type] = {
        status: "error",
        message: error.message,
      }
    }
  }

  if (!allTokenizersHealthy) {
    ctx.status = 400
    ctx.body = {
      status: "unhealthy",
      tokenizers: results,
    }
  } else {
    ctx.body = {
      status: "healthy",
      tokenizers: results,
    }
  }
})

app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})
