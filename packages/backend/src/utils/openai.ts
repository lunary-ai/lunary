import OpenAI from "openai";

export function getOpenAIParams() {
  if (process.env.OPENAI_API_KEY) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
    };
  } else {
    return null;
  }
}
const clientParams = getOpenAIParams();

export default clientParams ? new OpenAI(clientParams) : null;
