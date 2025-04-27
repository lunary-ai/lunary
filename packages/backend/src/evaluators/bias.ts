import { Run } from "shared";
import { callML } from "../utils/ml";

interface BiasParams {
  threshold?: number;
}

function parseMessages(messages: unknown): string[] {
  if (!messages) return [""];

  if (typeof messages === "string") {
    if (!messages.length || messages === "__NOT_INGESTED__") return [""];
    return [messages];
  }

  if (Array.isArray(messages)) {
    const contentArray: string[] = [];
    for (const message of messages) {
      if (message?.type === "system") continue;
      const content = message.content ?? message.text;
      if (typeof content === "string" && content.length) {
        contentArray.push(content);
      } else {
        contentArray.push(JSON.stringify(message));
      }
    }
    return contentArray.length ? contentArray : [""];
  }

  if (typeof messages === "object") {
    return [JSON.stringify(messages)];
  }

  return [""];
}

export async function evaluate(run: Run, params: BiasParams) {
  const { threshold = 0.5 } = params;

  const inputTexts = parseMessages(run.input);
  const outputTexts = parseMessages(run.output);
  const errorTexts = parseMessages(run.error);

  const [inputBias, outputBias, errorBias] = await Promise.all([
    detectBias(inputTexts, threshold),
    detectBias(outputTexts, threshold),
    detectBias(errorTexts, threshold),
  ]);

  return {
    input: inputBias,
    output: outputBias,
    error: errorBias,
  };
}

async function detectBias(texts: string[], threshold: number): Promise<any> {
  try {
    return callML("bias", {
      outputs: texts,
      threshold,
    });
  } catch (error) {
    console.error(error);
    console.error(texts);
  }
}
