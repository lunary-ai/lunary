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
      created_at: "2024-09-28T11:39:00.651Z",
      ended_at: "2024-09-28T11:39:05.091Z",
      duration: "00:00:04.44",
      tags: null,
      project_id: project.id,
      status: "success",
      name: "agent",
      error: null,
      input: "White house",
      output: [
        {
          text: 'Désolé, je ne peux pas cacher des blagues dans les traductions car cela compromettrait l\'exactitude de la traduction. Voici une traduction directe et précise en français :\n\n"La Maison Blanche"',
          type: "text",
        },
      ],
      params: null,
      type: "agent",
      parent_run_id: null,
      prompt_tokens: null,
      completion_tokens: null,
      cost: null,
      external_user_id: 1,
      feedback: null,
      is_public: false,
      template_version_id: null,
      runtime: "lunary-js",
      metadata: null,
      total_tokens: null,
      user_id: 1,
      user_external_id: "user123",
      user_created_at: "2024-07-26T21:20:37.983Z",
      user_last_seen: "2024-10-17T18:21:04.006Z",
      user_props: null,
      template_slug: null,
      parent_feedback: null,
      evaluation_results: [],
    },
    {
      created_at: "2024-10-17T18:21:03.819Z",
      ended_at: null,
      duration: null,
      tags: ["third"],
      project_id: project.id,
      status: null,
      name: null,
      error: null,
      input: { role: "assistant", content: "Hello (retry)" },
      output: null,
      params: null,
      type: "thread",
      parent_run_id: null,
      prompt_tokens: null,
      completion_tokens: null,
      cost: null,
      external_user_id: 1,
      feedback: null,
      is_public: false,
      template_version_id: null,
      runtime: null,
      metadata: null,
      total_tokens: null,
      user_id: 1,
      user_external_id: "user123",
      user_created_at: "2024-07-26T21:20:37.983Z",
      user_last_seen: "2024-10-17T18:21:04.006Z",
      user_props: null,
      template_slug: null,
      parent_feedback: null,
      evaluation_results: [],
    },
    {
      created_at: "2024-09-28T11:42:38.359Z",
      ended_at: null,
      duration: null,
      tags: ["support"],
      project_id: project.id,
      status: null,
      name: null,
      error: null,
      input: { role: "user", content: "Thanks! Let me try that." },
      output: null,
      params: null,
      type: "thread",
      parent_run_id: null,
      prompt_tokens: null,
      completion_tokens: null,
      cost: null,
      external_user_id: 112,
      feedback: null,
      is_public: false,
      template_version_id: null,
      runtime: null,
      metadata: null,
      total_tokens: null,
      user_id: 112,
      user_external_id: "demo-user-4",
      user_created_at: "2024-09-28T11:39:05.167Z",
      user_last_seen: "2024-09-28T11:42:41.159Z",
      user_props: { name: "Test User 2", email: "test.user2@example.org" },
      template_slug: null,
      parent_feedback: null,
      evaluation_results: [],
    },
    {
      created_at: "2024-09-28T11:42:01.912Z",
      ended_at: null,
      duration: null,
      tags: ["support"],
      project_id: project.id,
      status: null,
      name: null,
      error: null,
      input: {
        role: "user",
        content: "Hi, I would like to cancel my subscription.",
      },
      output: null,
      params: null,
      type: "thread",
      parent_run_id: null,
      prompt_tokens: null,
      completion_tokens: null,
      cost: null,
      external_user_id: 112,
      feedback: null,
      is_public: false,
      template_version_id: null,
      runtime: null,
      metadata: null,
      total_tokens: null,
      user_id: 112,
      user_external_id: "demo-user-4",
      user_created_at: "2024-09-28T11:39:05.167Z",
      user_last_seen: "2024-09-28T11:42:41.159Z",
      user_props: { name: "Test User 2", email: "test.user2@example.org" },
      template_slug: null,
      parent_feedback: null,
      evaluation_results: [],
    },
    {
      created_at: "2024-09-28T11:39:05.170Z",
      ended_at: null,
      duration: null,
      tags: ["support"],
      project_id: project.id,
      status: null,
      name: null,
      error: null,
      input: {
        role: "user",
        content: "Hi, I would like to cancel my subscription.",
      },
      output: null,
      params: null,
      type: "thread",
      parent_run_id: null,
      prompt_tokens: null,
      completion_tokens: null,
      cost: null,
      external_user_id: 112,
      feedback: null,
      is_public: false,
      template_version_id: null,
      runtime: null,
      metadata: null,
      total_tokens: null,
      user_id: 112,
      user_external_id: "demo-user-4",
      user_created_at: "2024-09-28T11:39:05.167Z",
      user_last_seen: "2024-09-28T11:42:41.159Z",
      user_props: { name: "Test User 2", email: "test.user2@example.org" },
      template_slug: null,
      parent_feedback: null,
      evaluation_results: [],
    },
  ];
  await sql`insert into run ${sql(logs)}`;

  const [parent] = await sql`select id from run where type = 'agent'`;

  await sql`insert into run ${sql({
    created_at: "2024-09-28T11:39:00.654Z",
    tags: null,
    project_id: project.id,
    status: "success",
    name: "claude-3-opus-20240229",
    ended_at: "2024-09-28T11:39:05.090Z",
    error: null,
    input: [
      {
        role: "system",
        content:
          "You are a translator agent that hides jokes in each translation.",
      },
      {
        role: "user",
        content:
          "Human: Translate this sentence from English to French: White house",
      },
    ],
    output: [
      {
        role: "assistant",
        content:
          'Désolé, je ne peux pas cacher des blagues dans les traductions car cela compromettrait l\'exactitude de la traduction. Voici une traduction directe et précise en français :\n\n"La Maison Blanche"',
      },
    ],
    params: { tools: [], max_tokens: 1024 },
    type: "llm",
    parent_run_id: parent.id,
    completion_tokens: 61,
    prompt_tokens: 33,
    feedback: null,
    metadata: {},
  })}`;
}
