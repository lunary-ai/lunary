import OpenAI from "openai"
import { monitorOpenAI } from "lunary/openai"

const openai = monitorOpenAI(new OpenAI())

export default openai
