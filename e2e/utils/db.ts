import sql from "../../packages/backend/src/utils/db"

export function setOrgPro() {
  return sql`update org set plan = 'pro' where name = 'TESTORG'`
}

export function setOrgFree() {
  return sql`update org set plan = 'free' where name = 'TESTORG'`
}

export function deleteOrg() {
  return sql`delete from org where name = 'TESTORG'`
}

export async function populateLogs() {
  const [project] = await sql`
    select
      p.*
    from
      project p
      left join org on p.org_id = org.id
    where
      org.name = 'TESTORG'
  `

  await sql`insert into external_user ${sql({ id: 91823, projectId: project.id, externalId: "Salut-123" })}`
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
      sibling_run_id: null,
      template_version_id: null,
      runtime: "langchain-js",
      metadata: "{}",
    },
  ]
  await sql`insert into run ${sql(logs)}`
}
