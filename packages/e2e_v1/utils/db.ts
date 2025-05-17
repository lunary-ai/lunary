import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import lunary from "lunary";
import { LunaryHandler } from "lunary/langchain";
import sql from "../../backend/src/utils/db";
import { sleep } from "../../backend/src/utils/misc";
import dotenv from "dotenv";
dotenv.config();
export async function setOrgPro() {
  return sql`update org set plan = 'pro' where name = 'test test''s Org'`;
}

export async function setOrgFree() {
  return sql`update org set plan = 'free' where name = 'test test''s Org'`;
}

export async function deleteOrg() {
  return sql`delete from org where name = 'test test''s Org'`;
}

export async function populateLogs() {
  const [project] = await sql`
    select
      p.*
    from
      project p
      left join org on p.org_id = org.id
    where
      org.name = 'test test''s Org'
  `;

  await sql`insert into external_user ${sql({ id: 91823, projectId: project?.id, externalId: "Salut-123" })}`;
  const logs = [
    {
      created_at: "2024-04-11 02:32:30.457+00",
      ended_at: "2024-04-11 02:32:31.594+00",
      tags: "{my_tag}",
      project_id: project?.id,
      status: "success",
      name: "gpt-3.5-turbo",
      error: null,
      input: {
        role: "user",
        content: "xyzTESTxyz Tell me a short joke about ice cream",
      },
      output: {
        role: "assistant",
        content:
          "Why did the ice cream break up with the cone? It couldn\'t handle the rocky road ahead!",
      },
      params: "{}",
      type: "llm",
      prompt_tokens: 15,
      completion_tokens: 20,
      cost: 3.75e-5,
      external_user_id: 91823,
      feedback: null,
      template_version_id: null,
      runtime: "langchain-py",
      metadata: "{}",
    },
  ];
  await sql`insert into run ${sql(logs)}`;
  await populateTrace(project?.id);
  await populateThread(project?.id);
}

async function populateTrace(projectId: string | undefined) {
  if (!projectId) {
    throw new Error("Project ID is required");
  }
  const handler = new LunaryHandler({
    apiUrl: "http://localhost:3333",
    publicKey: projectId,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["human", "Tell me a short joke about {topic}"],
  ]);
  const model = new ChatOpenAI({openAIApiKey:process.env.OPENAI_API_KEY});
  const outputParser = new StringOutputParser();

  const chain = prompt.pipe(model).pipe(outputParser);

  const res = await chain.invoke(
    {
      topic: "ice cream",
    },
    {
      callbacks: [handler],
    },
  );
  await sleep(2000);
  // await lunary.flush();
}

async function populateThread(projectId: string  | undefined) {
  if (!projectId) {
    throw new Error("Project ID is required");
  }
  lunary.init({ publicKey: projectId, apiUrl: "http://localhost:3333" });
  const thread = lunary.openThread();

  thread.trackMessage({
    role: "user",
    content: "Hello, please help me",
  });

  thread.trackMessage({
    role: "assistant",
    content: "Hello, how can I help you?",
  });

  await sleep(2000);
  await lunary.flush();
}
