import sql from "./utils/db";

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
  org_id is not null
`;

async function auditBatch(runs: any[]) {
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
    console.log("updated rows:", res.length);
  }
}

async function main() {
  const LIMIT = 10000;
  let page = 0;

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
        and r.is_deleted = false
        and status = 'success' 
      order by r.created_at desc
      limit ${LIMIT}
      offset ${page * LIMIT}
    `;

    if (!runs.length) break;

    page += 1;
    console.log(page);

    await auditBatch(runs);
  }
}

await main();
process.exit(0);
/* TODO:
 * - [ ] rename completionTokens to input_tokens, promptTokens to output_tokens, cachedPromptTokens to cached_input_tokens
 * - [ ] change model_mapping table to use cached_input_tokens_price instead of input_caching_cost_reduction
 * - [ ] refacto calcRunCost
 * - [ ] separate default costs from custom costs (or use a flag in the DB)
 * - [ ] how to get historical costs?
 * - [ ] for new data structure -> look at platform.openai.com network calls to see how they do it
 *  -> maybe I need to create an object with all the models, features etc. and a table to have custom pricing
 *  -> batch pricing for openai
 *  -> anthropic prompt caching
 * make a public API and advertize it online
 * other ideas: publish trend reports/viz, compare provider pricing etc
 */
