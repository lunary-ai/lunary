import { callML } from "@/src/utils/ml";
import {
  Run,
  SentimentAnalysisResult,
  UserMessage,
  userMessageSchema,
} from "shared";

function getContent(userMessage: UserMessage): string {
  if (typeof userMessage.content === "string") {
    return userMessage.content;
  }
  const contentParts = userMessage.content
    .filter((contentPart) => contentPart.type === "text")
    .map((contentPart) => contentPart.text)
    .join("\n");
  return contentParts;
}

// TODO: does it happen than a message is an valid object with role and content, but not an array? It should always be an array
function getContents(messages: unknown): Array<string | null> {
  // TODO: should we accept if not all messages in the array aren't valid?
  if (!messages || !Array.isArray(messages)) {
    return [null];
  }

  const contents = [];
  for (const message of messages) {
    const { success, data: userMessage } = userMessageSchema.safeParse(message);

    if (!success) {
      contents.push("");
      continue;
    }
    const content = getContent(userMessage);
    contents.push(content);
  }
  return contents;
}

// We only want to analyze user messages, at least for now
export async function evaluate(run: Run) {
  const inputMessagesContents = getContents(run.input);
  const outputMessagesContents = getContents(run.output); // will always be an array of empty string
  const errorMessagesContent = getContents(run.error); // will always be an array of empty string

  const inputMessageSentimentAnalysis = await analyzeSentiment(
    inputMessagesContents,
  );

  const sentiments = {
    input: inputMessageSentimentAnalysis,
    output: outputMessagesContents.map(() => null),
    error: errorMessagesContent.map(() => null),
  };

  return sentiments;
}

async function analyzeSentiment(
  texts: Array<string | null>,
): Promise<Array<SentimentAnalysisResult | null>> {
  try {
    return callML("sentiment", { texts });
  } catch (error) {
    console.error(error);
    console.log(texts);
    return texts.map(() => null);
  }
}
