import sql from "@/src/utils/db";

export type IntentAliasMapping = {
  canonicalLabel: string;
  alias: string;
  isOther: boolean;
  clusterId: string;
  occurrences: number;
  sortOrder: number;
};

export type EvaluatorIntentMapping = {
  maxIntents: number;
  aliasMap: Map<string, IntentAliasMapping>;
};

export function normalizeIntentAlias(label: string) {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function getIntentMappingsForProject(
  projectId: string,
): Promise<Map<string, EvaluatorIntentMapping>> {
  const rows = await sql<{
    evaluatorId: string;
    maxIntents: number;
    clusterId: string;
    clusterLabel: string;
    alias: string;
    occurrences: number;
    sortOrder: number;
    orgBeta: boolean;
  }[]>`
    with latest_version as (
      select
        v.evaluator_id,
        max(v.created_at) as created_at
      from
      intent_cluster_version v
      join evaluator e on e.id = v.evaluator_id
      join project p on e.project_id = p.id
      join org o on p.org_id = o.id
      where
        e.project_id = ${projectId}
        and e.type = 'intent'
        and o.beta = true
      group by
        v.evaluator_id
    )
    select
      v.evaluator_id as "evaluatorId",
      v.max_intents as "maxIntents",
      c.id as "clusterId",
      c.label as "clusterLabel",
      a.alias as alias,
      a.occurrences as "occurrences",
      c.sort_order as "sortOrder",
      true as "orgBeta"
    from
      intent_cluster_version v
      join latest_version lv on lv.evaluator_id = v.evaluator_id
      and lv.created_at = v.created_at
      join intent_cluster c on c.version_id = v.id
      join intent_cluster_alias a on a.version_id = v.id
      and a.cluster_id = c.id
  `;

  if (!rows.length) {
    return new Map();
  }

  const mappings = new Map<string, EvaluatorIntentMapping>();

  for (const row of rows) {
    if (!mappings.has(row.evaluatorId)) {
      mappings.set(row.evaluatorId, {
        maxIntents: row.maxIntents,
        aliasMap: new Map(),
      });
    }

    const entry = mappings.get(row.evaluatorId)!;
    entry.maxIntents = row.maxIntents;

    entry.aliasMap.set(normalizeIntentAlias(row.alias), {
      canonicalLabel: row.clusterLabel,
      alias: row.alias,
      isOther: row.sortOrder > row.maxIntents,
      clusterId: row.clusterId,
      occurrences: row.occurrences,
      sortOrder: row.sortOrder,
    });
  }

  return mappings;
}
