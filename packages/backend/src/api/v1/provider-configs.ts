import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { ProviderConfig } from "shared";
import { z } from "zod";

const providerConfigs = new Router({
  prefix: "/provider-configs",
});

providerConfigs.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const providerConfigs = await sql<
    ProviderConfig[]
  >`select * from provider_config where project_id = ${projectId}`;

  ctx.body = providerConfigs;
});

providerConfigs.get("/models", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const models = await sql`
    select
      pcm.id as id,
      pcm.name as name,
      pcm.provider_config_id,
      pc.provider_name as provider,
      true as is_custom
    from provider_config_model pcm
    left join provider_config pc
      on pcm.provider_config_id = pc.id
    where pc.project_id = ${projectId}
  `;

  ctx.body = models;
});

providerConfigs.get("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const id = z.string().parse(ctx.params.id);

  const [providerConfig] = await sql<ProviderConfig[]>`select 
      pc.*,
      coalesce(array_agg(pcm.name) filter (where pcm.name is not null), array[]::text[]) as models
    from 
      provider_config pc 
      left join provider_config_model pcm on pc.id = pcm.provider_config_id
    where 
      pc.id = ${id} 
    and 
      pc.project_id = ${projectId}
    group by pc.id
      `;

  ctx.body = providerConfig;
});

providerConfigs.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;
  const { apiKey, providerName, extraConfig, models } = z
    .object({
      id: z.string().uuid(),
      apiKey: z.string(),
      providerName: z.string(),
      extraConfig: z.record(z.unknown()).optional(),
      models: z.array(z.string()).optional().default([]),
    })
    .parse(ctx.request.body);

  const [providerConfig] = await sql<
    ProviderConfig[]
  >`insert into provider_config ${sql(clearUndefined({ id, projectId, apiKey, providerName, extraConfig }))} 
    on conflict (id) do update set ${sql(clearUndefined({ apiKey, providerName, extraConfig }))}
    returning *`;

  for (const model of models) {
    await sql`insert into provider_config_model ${sql({ providerConfigId: providerConfig.id, name: model })}
              on conflict (provider_config_id, name) do nothing 
              `;
  }

  ctx.body = providerConfig;
});

export default providerConfigs;
