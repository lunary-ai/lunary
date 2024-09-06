import { Run } from "shared";
import { sleep } from "../utils/misc";
import { callML } from "../utils/ml";

// TOOD: refacto this with all the other parsing function already in use
function parseMessages(messages: unknown) {
  if (!messages) {
    return [""];
  }
  if (typeof messages === "string" && messages.length) {
    return [messages];
  }

  if (messages === "__NOT_INGESTED__") {
    return [""];
  }

  if (Array.isArray(messages)) {
    let contentArray = [];
    for (const message of messages) {
      let content = message.content || message.text;
      if (typeof content === "string" && content.length) {
        contentArray.push(content);
      } else {
        contentArray.push(JSON.stringify(message));
      }
    }
    return contentArray;
  }

  if (typeof messages === "object") {
    return [JSON.stringify(messages)];
  }

  return [""];
}

interface Params {
  types: string[];
  customRegexes: string[];
  excludedEntities: string[];
}
export async function evaluate(run: Run, params: Params) {
  const { types: entityTypes, customRegexes, excludedEntities } = params;
  const input = parseMessages(run.input);
  const output = parseMessages(run.output);
  const error = parseMessages(run.error);

  const [inputPIIs, outputPIIs, errorPIIs] = await Promise.all([
    detectPIIs(input, entityTypes, customRegexes, excludedEntities),
    detectPIIs(output, entityTypes, customRegexes, excludedEntities),
    detectPIIs(error, entityTypes, customRegexes, excludedEntities),
  ]);

  const PIIs = {
    input: inputPIIs,
    output: outputPIIs,
    error: errorPIIs,
  };

  // TODO: zod for languages, SHOLUD NOT INGEST IN DB IF NOT CORRECT FORMAT
  return PIIs;
}

async function detectPIIs(
  texts: string[],
  entityTypes: string[] = [],
  customRegexes: string[] = [],
  excludedEntities: string[] = [],
): Promise<any> {
  try {
    return callML("pii", {
      texts,
      entityTypes,
      customRegexes,
      excludedEntities,
    });
  } catch (error) {
    console.error(error);
    console.log(texts);
  }
}
