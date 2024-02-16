import OpenAI from "openai"

const openai = process.env.OPENAI_API_KEY ? new OpenAI() : null

export default openai
