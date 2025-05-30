import { MessageSchema } from "shared/schemas/openai";
import { z } from "zod";

export function parseMessages(data: unknown): string[] | undefined {
  const parsed = z.array(MessageSchema).safeParse(data);
  if (!parsed.success) return;
  return parsed.data.map((m) => JSON.stringify(m));
}
