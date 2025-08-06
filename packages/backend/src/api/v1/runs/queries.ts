import sql from "@/src/utils/db";

export async function getRelatedRuns(runId: string, projectId: string) {
  const relatedRuns = await sql`
    with recursive related_runs as (
      select 
        r1.*
      from 
        run r1
      where
        r1.id = ${runId}
        and project_id = ${projectId}

      union all 

      select 
        r2.*
      from 
        run r2
        inner join related_runs rr on rr.id = r2.parent_run_id
  )
  select 
    rr.created_at, 
    rr.tags, 
    rr.project_id, 
    rr.id, 
    rr.status, 
    rr.name, 
    rr.ended_at, 
    rr.error, 
    rr.input, 
    rr.output, 
    rr.params, 
    rr.type, 
    rr.parent_run_id, 
    rr.completion_tokens, 
    rr.prompt_tokens, 
    coalesce(rr.cost, 0) as cost,
    rr.feedback, 
    rr.metadata
  from 
    related_runs rr
  order by 
    created_at
  `;

  return relatedRuns;
}

export async function getMessages(threadId: string, projectId: string) {
  const relatedRuns = await getRelatedRuns(threadId, projectId);
  const filteredRuns = relatedRuns.filter((_, i) => i !== 0);

  let messages = [];
  for (const run of filteredRuns) {
    if (Array.isArray(run.input)) {
      messages.push(
        ...run.input.map((msg) => ({ ...msg, createdAt: run.createdAt })),
      );
    }
    if (Array.isArray(run.output)) {
      messages.push(
        ...run.output.map((msg) => ({ ...msg, createdAt: run.createdAt })),
      );
    }
  }

  return messages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
