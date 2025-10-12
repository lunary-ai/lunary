import { randomUUID } from "crypto";
import sql from "../../backend/src/utils/db";
import { sleep } from "../../backend/src/utils/misc";

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

  await sql`insert into external_user ${sql({ id: 91823, projectId: project.id, externalId: "Salut-123" })}`;
  const logs = [
    {
      created_at: "2024-04-11 02:32:30.457+00",
      ended_at: "2024-04-11 02:32:31.594+00",
      tags: "{my_tag}",
      project_id: project.id,
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
  await populateTrace(project.id);
  await populateThread(project.id);
}

async function populateTrace(projectId: string) {
  const ingestUrl = "http://localhost:3333/v1/runs/ingest";
  const runId = `trace-${randomUUID()}`;
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 1000);
  const response = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": projectId,
    },
    body: JSON.stringify({
      events: [
        {
          event: "start",
          type: "chain",
          runId,
          name: "playwright-trace",
          timestamp: startTime.toISOString(),
          input: [
            {
              role: "user",
              content: "Tell me a short joke about ice cream",
            },
          ],
          tags: ["playwright", "trace"],
        },
        {
          event: "end",
          type: "chain",
          runId,
          name: "playwright-trace",
          timestamp: endTime.toISOString(),
          output: [
            {
              role: "assistant",
              content:
                "Why did the ice cream truck break down? Because of rocky road!",
            },
          ],
          metadata: { source: "playwright" },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to populate trace data", response.status, errorBody);
  }

  await sleep(2000);
}

async function populateThread(projectId: string) {
  const threadId = randomUUID();
  const now = new Date().toISOString();
  const threadRun = {
    id: threadId,
    created_at: now,
    ended_at: now,
    project_id: projectId,
    type: "thread",
    status: "success",
    name: "playwright-thread",
    input: {
      role: "assistant",
      content: "Hello, how can I help you?",
    },
    tags: "{playwright,thread}",
    external_user_id: 91823,
    metadata: "{}",
  };

  await sql`insert into run ${sql(threadRun)}`;
}
