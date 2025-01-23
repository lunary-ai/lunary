import { WatsonXAI } from "@ibm-cloud/watsonx-ai";

function getClient() {
  if (
    !process.env.WATSONX_AI_AUTH_TYPE ||
    !process.env.WATSONX_AI_APIKEY ||
    !process.env.WATSONX_AI_PROJECT_ID
  ) {
    return null;
  }
  return WatsonXAI.newInstance({
    version: "2024-03-14",
    serviceUrl: "https://us-south.ml.cloud.ibm.com",
  });
}

const watsonxAi = getClient();

export default watsonxAi;
