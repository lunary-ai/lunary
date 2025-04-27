import sql from "@/src/utils/db";

export async function refreshCosts(
  runs: any[],
  defaultMappingsCache: any[],
  customMappingsCache: any[],
) {
  const updates: [number, number][] = [];

  for (const run of runs) {
    const duration = new Date(run.endedAt) - new Date(run.createdAt);
    if (duration && duration < 0.01 * 1000) continue; // cached llm calls
    if (run.type !== "llm" || !run.name) continue;

    const defaultMapping = defaultMappingsCache
      .filter((m) => {
        try {
          return new RegExp(m.pattern).test(run.name);
        } catch {
          return false;
        }
      })
      .filter((m) => new Date(run.createdAt) >= new Date(m.startDate))
      .sort((a, b) =>
        a.name.length !== b.name.length
          ? b.name.length - a.name.length
          : new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      )[0];

    const customMapping = customMappingsCache
      .filter((m) => {
        try {
          return new RegExp(m.pattern).test(run.name);
        } catch {
          return false;
        }
      })
      .filter((m) => m.orgId === run.orgId)
      .filter((m) => new Date(run.createdAt) >= new Date(m.startDate))
      .sort((a, b) =>
        a.name.length !== b.name.length
          ? b.name.length - a.name.length
          : new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      )[0];

    const mapping = customMapping || defaultMapping;
    if (!mapping) continue;

    const promptTokens = run.promptTokens || 0;
    const completionTokens = run.completionTokens || 0;
    const cachedPromptTokens = run.cachedPromptTokens || 0;

    const inputCostPerM = mapping.inputCost || 0;
    const outputCostPerM = mapping.outputCost || 0;
    const cacheReductionPerM = mapping.inputCachingCostReduction || 0;

    const promptCost =
      (inputCostPerM * promptTokens) / 1_000_000 -
      (cacheReductionPerM * cachedPromptTokens) / 1_000_000;

    const completionCost = (outputCostPerM * completionTokens) / 1_000_000;

    const total = Number((promptCost + completionCost).toFixed(10));

    if (total !== run.cost && total > 0) {
      updates.push([run.id, total]); // [run.id, newCost]
    }
  }

  if (updates.length) {
    const res = await sql`
      update run set cost = update_data.cost::float8
      from (values ${sql(updates)}) as update_data (id, cost)
      where run.id = (update_data.id)::uuid
      returning run.id, run.cost
    `;
    console.log("Updated rows:", res.length);
  }
}

export async function refreshCostsJob(
  orgId: string,
  updateProgress: (pct: number) => Promise<void>,
): Promise<void> {
  const defaultMappingsCache = await sql`
    select
      *
    from
      model_mapping
    where
      org_id is null
  `;

  const customMappingsCache = await sql`
    select
      *
    from
      model_mapping
    where
      org_id = ${orgId} 
  `;

  const LIMIT = 10000;
  let page = 0;
  const now = new Date();

  const [{ count: totalRuns }] = await sql`
    select
      count(*) 
    from
      run r
      left join project p on r.project_id = p.id
      left join org o on p.org_id = o.id
    where
      r.type = 'llm'
      and org_id = ${orgId}
      and status = 'success'
      and r.created_at <= ${now}
  `;

  while (true) {
    const runs = await sql`
      select
        r.id,
        r.name,
        r.created_at,
        r.ended_at,
        r.prompt_tokens,
        r.completion_tokens,
        r.cached_prompt_tokens,
        r.cost,
        r.type,
        o.id as org_id
      from
        run r
        left join project p on r.project_id = p.id
        left join org o on p.org_id = o.id
      where
        r.type = 'llm'
        and org_id = ${orgId}
        and status = 'success'
        and r.created_at <= ${now}
      order by 
        r.created_at desc
      limit 
        ${LIMIT}
      offset 
        ${page * LIMIT}
    `;

    if (!runs.length) break;

    page += 1;

    await refreshCosts(runs, defaultMappingsCache, customMappingsCache);

    await updateProgress(
      Number((((page * LIMIT) / totalRuns) * 100).toFixed(2)),
    );
  }
}
