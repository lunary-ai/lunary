import openai from "@/src/utils/openai";
import sql from "@/src/utils/db";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import type { JobContext } from "../jobs/types";

const ResponseSchema = z.object({
  groups: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional().default(""),
        aliases: z
          .array(
            z.object({
              label: z.string().min(1),
              note: z.string().optional().default(""),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

type ResponsePayload = z.infer<typeof ResponseSchema>;

type IntentStat = {
  label: string;
  occurrences: number;
};

export type IntentClusterResult = {
  versionId: string;
  clusters: Array<{
    id: string;
    label: string;
    occurrences: number;
    aliases: string[];
  }>;
};

function cleanLabel(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

function aliasKey(label: string) {
  return cleanLabel(label).toLowerCase();
}

function toTitleCase(label: string) {
  return cleanLabel(label)
    .split(" ")
    .map((word) =>
      word.length ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word,
    )
    .join(" ");
}

function buildFallbackGroups(
  stats: IntentStat[],
  limit: number,
): ResponsePayload["groups"] {
  const topCount = Math.max(1, Math.min(limit, stats.length));
  const topStats = stats.slice(0, topCount);
  const remaining = stats.slice(topCount);

  const groups: ResponsePayload["groups"] = topStats.map((stat) => ({
    name: toTitleCase(stat.label),
    description: "",
    aliases: [{ label: stat.label }],
  }));

  if (remaining.length) {
    groups.push({
      name: "Other",
      description: "Automatically aggregated intents.",
      aliases: remaining.map((stat) => ({ label: stat.label })),
    });
  }

  return groups;
}

async function fetchIntentStats(
  evaluatorId: string,
): Promise<IntentStat[]> {
  const rows = await sql<
    {
      label: string;
      occurrences: number;
    }[]
  >`
    with intents as (
      select
        trim(intent->>'label') as label
      from
        evaluation_result_v2 er
        cross join lateral jsonb_array_elements(
          coalesce(er.result->'input', '[]'::jsonb)
        ) as bucket
        cross join lateral jsonb_array_elements(
          coalesce(bucket->'intents', '[]'::jsonb)
        ) as intent
      where
        er.evaluator_id = ${evaluatorId}
      union all
      select
        trim(intent->>'label') as label
      from
        evaluation_result_v2 er
        cross join lateral jsonb_array_elements(
          coalesce(er.result->'output', '[]'::jsonb)
        ) as bucket
        cross join lateral jsonb_array_elements(
          coalesce(bucket->'intents', '[]'::jsonb)
        ) as intent
      where
        er.evaluator_id = ${evaluatorId}
    )
    select
      label,
      count(*)::int as occurrences
    from
      intents
    where
      label is not null
      and label <> ''
    group by
      label
    order by
      count(*) desc
  `;

  return rows.map((row) => ({
    label: cleanLabel(row.label),
    occurrences: Number(row.occurrences),
  }));
}

function validateCoverage(
  stats: IntentStat[],
  response: ResponsePayload,
): Map<string, string> {
  const aliasToCluster = new Map<string, string>();
  const missing: string[] = [];

  for (const group of response.groups) {
    for (const alias of group.aliases) {
      const key = aliasKey(alias.label);
      if (!aliasToCluster.has(key)) {
        aliasToCluster.set(key, group.name);
      }
    }
  }

  for (const stat of stats) {
    const key = aliasKey(stat.label);
    if (!aliasToCluster.has(key)) {
      missing.push(stat.label);
    }
  }

  if (missing.length) {
    response.groups.push({
      name: "Other",
      description: "Automatically created bucket for unmapped intents.",
      aliases: missing.map((label) => ({ label })),
    });
  }

  const finalMap = new Map<string, string>();
  for (const group of response.groups) {
    for (const alias of group.aliases) {
      const key = aliasKey(alias.label);
      finalMap.set(key, group.name);
    }
  }

  return finalMap;
}

function buildPrompt(stats: IntentStat[], maxIntents: number): string {
  const payload = stats.map((item) => ({
    label: item.label,
    occurrences: item.occurrences,
  }));

  return `
You are consolidating user-intent labels extracted from LLM conversation logs.

Desired number of canonical intents: ${maxIntents}

Rules:
- Produce at most ${maxIntents} canonical intent groups. If leftovers remain, create a single group named "Other".
- Canonical names must be short, human-readable Title Case phrases.
- Every input label must appear exactly once in the output under aliases.
- Merge only when labels clearly represent the same underlying user goal.
- Prefer broader intents over very specific ones.

Respond with JSON matching the schema provided separately.

Input intents (JSON):
${JSON.stringify(payload, null, 2)}
  `.trim();
}

export async function reclusterIntentEvaluator(
  evaluatorId: string,
  maxIntents: number,
): Promise<IntentClusterResult | null> {
  const stats = await fetchIntentStats(evaluatorId);

  if (!stats.length) {
    return null;
  }

  if (!openai) {
    throw new Error(
      "OpenAI client is not configured. Set OPENAI_API_KEY to enable intent clustering.",
    );
  }

  const prompt = buildPrompt(stats, maxIntents);

  const completion = await openai.responses.parse({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "You are an expert taxonomist. Return structured JSON exactly matching the provided schema.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    text: {
      format: zodTextFormat(ResponseSchema, "intent_cluster"),
    },
  });

  if (!completion.output_parsed) {
    throw new Error("Failed to parse clustering response");
  }

  const response = completion.output_parsed;
  validateCoverage(stats, response);

  const limit = Math.max(1, maxIntents);
  const baseGroups = [...response.groups];
  const otherIndex = baseGroups.findIndex(
    (group) => group.name.toLowerCase() === "other",
  );
  const extractedOther =
    otherIndex >= 0 ? baseGroups.splice(otherIndex, 1)[0] : undefined;

  const primaryGroups = baseGroups.slice(0, limit);
  const overflowGroups = baseGroups.slice(limit);

  let otherGroup = extractedOther
    ? {
        ...extractedOther,
        aliases: [...extractedOther.aliases],
      }
    : undefined;

  if (overflowGroups.length) {
    const overflowAliases = overflowGroups.flatMap((group) => group.aliases);
    if (otherGroup) {
      otherGroup.aliases = [...otherGroup.aliases, ...overflowAliases];
    } else {
      otherGroup = {
        name: "Other",
        description: "Automatically aggregated intents.",
        aliases: overflowAliases,
      };
    }
  }

  const finalGroups = [...primaryGroups];
  if (otherGroup && otherGroup.aliases.length) {
    finalGroups.push(otherGroup);
  }

  const nonOtherGroups = finalGroups.filter(
    (group) => group.name.toLowerCase() !== "other",
  );

  const totalOccurrences = stats.reduce(
    (sum, stat) => sum + stat.occurrences,
    0,
  );

  const otherOccurrences = (() => {
    const otherGroupData = finalGroups.find(
      (group) => group.name.toLowerCase() === "other",
    );
    if (!otherGroupData) return 0;
    return otherGroupData.aliases.reduce((acc, alias) => {
      const stat = stats.find(
        (s) => aliasKey(s.label) === aliasKey(alias.label),
      );
      return acc + (stat?.occurrences ?? 0);
    }, 0);
  })();

  const otherShare = totalOccurrences
    ? otherOccurrences / totalOccurrences
    : 0;

  response.groups =
    nonOtherGroups.length < 1 || otherShare > 0.85
      ? buildFallbackGroups(stats, limit)
      : finalGroups;

  // Compute occurrences per cluster
  const clusterTotals = new Map<string, number>();
  const aliasCounts = new Map(stats.map((item) => [aliasKey(item.label), item.occurrences]));

  for (const group of response.groups) {
    let total = 0;
    for (const alias of group.aliases) {
      const key = aliasKey(alias.label);
      total += aliasCounts.get(key) ?? 0;
    }
    clusterTotals.set(group.name, total);
  }

  const sortedGroups = [...response.groups].sort((a, b) => {
    const diff = (clusterTotals.get(b.name) ?? 0) - (clusterTotals.get(a.name) ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  const insertedVersion = await sql.begin(async (tx) => {
    const [version] = await tx<[{ id: string }]>`
      insert into intent_cluster_version ${sql({
        evaluatorId,
        maxIntents,
        prompt,
        rawResponse: completion.output,
      })}
      returning id
    `;

    const clusters: Array<{
      id: string;
      label: string;
      occurrences: number;
      aliases: string[];
    }> = [];

    for (let index = 0; index < sortedGroups.length; index++) {
      const group = sortedGroups[index];
      const aliases = group.aliases.map((alias) => cleanLabel(alias.label));
      const occurrences = clusterTotals.get(group.name) ?? 0;

      const [cluster] = await tx<[{ id: string }]>`
        insert into intent_cluster ${sql({
          versionId: version.id,
          label: cleanLabel(group.name),
          description: group.description?.trim() || null,
          occurrences,
          sortOrder: index + 1,
        })}
        returning id
      `;

      for (const alias of aliases) {
        const key = aliasKey(alias);
        const aliasOccurrences = aliasCounts.get(key) ?? 0;

        await tx`
          insert into intent_cluster_alias ${sql({
            versionId: version.id,
            alias,
            clusterId: cluster.id,
            occurrences: aliasOccurrences,
          })}
        `;
      }

      clusters.push({
        id: cluster.id,
        label: cleanLabel(group.name),
        occurrences,
        aliases,
      });
    }

    return {
      versionId: version.id,
      clusters,
    };
  });

  return insertedVersion;
}

export async function intentReclusterJob({
  orgId,
  jobId,
  payload,
  subject,
  updateProgress,
}: JobContext): Promise<void> {
  const payloadData =
    payload && typeof payload === "string"
      ? JSON.parse(payload)
      : payload ?? {};
  const evaluatorId =
    payloadData?.evaluatorId ?? subject?.split(":")[0] ?? subject ?? null;

  if (!evaluatorId) {
    throw new Error("Missing evaluator identifier for intent reclustering job");
  }

  const [record] = await sql<
    {
      id: string;
      orgId: string;
      name: string;
      params: any;
    }[]
  >`
    select
      e.id,
      p.org_id as "orgId",
      e.name,
      e.params
    from
      evaluator e
      join project p on e.project_id = p.id
    where
      e.id = ${evaluatorId}
  `;

  if (!record) {
    throw new Error("Evaluator not found for intent reclustering");
  }

  if (record.orgId !== orgId) {
    throw new Error("Evaluator does not belong to the job's organization");
  }

  const maxIntents = Number(
    payloadData?.maxIntents ?? record.params?.maxIntents ?? 10,
  );

  await updateProgress(5);

  const result = await reclusterIntentEvaluator(evaluatorId, maxIntents);

  await updateProgress(100);

  await sql`
    update _job
    set payload = ${sql.json({
      evaluatorId,
      evaluatorName: record.name,
      maxIntents,
      versionId: result?.versionId ?? null,
      clusters: result?.clusters?.length ?? 0,
      completedAt: new Date().toISOString(),
    })}
    where id = ${jobId}
  `;
}
