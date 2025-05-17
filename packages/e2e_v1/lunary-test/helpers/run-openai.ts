import lunary from "lunary";
import OpenAI from "openai";
import { monitorOpenAI } from "lunary/openai";

const publicKey = process.argv[2];
if (!publicKey) {
  console.error("No public key provided");
  process.exit(1);
}

lunary.init({
  publicKey,
  apiUrl: "http://localhost:3333",
});

const openai = monitorOpenAI(new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // secure this in env
}));

async function main() {
  const result = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.9,
    tags: ["chat", "support"],
    user: "user_123",
    userProps: { name: "John Doe" },
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello friend" },
    ],
  });

}

main();