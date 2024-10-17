const GOOGLE_MODELS = [
  "chat-bison-001",
  "code-bison-001",
  "text-bison-001",
  "codechat-bison-001",
] as const;

type GoogleModel = (typeof GOOGLE_MODELS)[number];

export function isGoogleModel(modelName: string): boolean {
  return Boolean(GOOGLE_MODELS.find((model) => modelName.includes(model)));
}

export async function countGoogleTokens(
  modelName: GoogleModel,
  input: unknown,
): Promise<number | null> {
  function prepareData(input: unknown) {
    const messages = Array.isArray(input) ? input : [input];

    return messages.map((message) => {
      return {
        content: typeof message === "string" ? message : message.text,
      };
    });
  }

  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: {
          messages: prepareData(input),
        },
      }),
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta3/models/${modelName}:countMessageTokens?key=${process.env.PALM_API_KEY}`,
      options,
    );
    const data = await res.json();

    return data.tokenCount as number;
  } catch (e) {
    console.error("Error while counting tokens with Google API", e);
    return null;
  }
}
