import sql from "../../packages/backend/src/utils/db";

export function setOrgPro() {
  return sql`update org set plan = 'pro' where name = 'test test''s Org'`;
}

export function setOrgFree() {
  return sql`update org set plan = 'free' where name = 'test test''s Org'`;
}

export function deleteOrg() {
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
      input:
        '{"role": "user", "content": "xyzTESTxyz Tell me a short joke about ice cream"}',
      output:
        '{"role": "assistant", "content": "Why did the ice cream break up with the cone? It couldn\'t handle the rocky road ahead!"}',
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
    {
      created_at: "2024-11-14T03:55:51.596Z",
      ended_at: "2024-11-14T03:55:52.206Z",
      duration: "00:00:00.61",
      tags: ["test", "test2"],
      project_id: project.id,
      status: "success",
      name: "My great agent",
      error: null,
      input: [1, 2, 3, { test: "sdkj", test2: "sdkj" }],
      output: "Agent output",
      params: {},
      type: "agent",
      parent_run_id: null,
      prompt_tokens: null,
      completion_tokens: null,
      cost: null,
      external_user_id: 91823,
      feedback: null,
      is_public: false,
      template_version_id: null,
      runtime: "lunary-py",
      metadata: null,
    },
    {
      created_at: "2024-11-14T03:54:11.773Z",
      ended_at: "2024-11-14T03:54:12.528Z",
      duration: "00:00:00.755",
      tags: ["test", "test2"],
      project_id: project.id,
      status: "success",
      name: "My great agent",
      error: null,
      input: [1, 2, 3, { test: "sdkj", test2: "sdkj" }],
      output: "Agent output",
      params: {},
      type: "agent",
      parent_run_id: null,
      prompt_tokens: null,
      completion_tokens: null,
      cost: null,
      external_user_id: 91823,
      feedback: null,
      is_public: false,
      template_version_id: null,
      runtime: "lunary-py",
      metadata: null,
    },
    {
      created_at: "2024-09-28T11:42:37.770Z",
      ended_at: "2024-09-28T11:42:40.157Z",
      duration: "00:00:02.387",
      tags: null,
      project_id: project.id,
      status: "success",
      name: "SupportAgent",
      error: null,
      input: {
        user: {
          id: "demo-user-4",
          name: "Test User 2",
          email: "test.user2@example.org",
        },
        topic: "billing",
        question: "Hi, I would like to cancel my subscription.",
      },
      output:
        "Hello Test User 2,\n\nI understand you'd like to cancel your subscription. I apologize, but I don't actually have access to any billing or account information. I'm Claude, an AI assistant created by Anthropic to be helpful, harmless, and honest.\n\nFor assistance with canceling your subscription, you'll need to contact the customer support team for the specific service you're subscribed to. They'll be able to help you with the cancellation process.\n\nIs there anything else I can assist you with today?",
      params: null,
      type: "agent",
      parent_run_id: "087c446e-ec41-412e-adb7-bea690e13789",
      prompt_tokens: null,
      completion_tokens: null,
      cost: null,
      external_user_id: 91823,
      feedback: null,
      is_public: false,
      template_version_id: null,
      runtime: "lunary-py",
      metadata: null,
    },
  ];
  await sql`insert into run ${sql(logs)}`;
}
