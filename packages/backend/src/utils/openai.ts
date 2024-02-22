import OpenAI from "openai"
import { monitorOpenAI } from "lunary/openai"

const openai = process.env.OPENAI_API_KEY ? monitorOpenAI(new OpenAI()) : null

export default openai
