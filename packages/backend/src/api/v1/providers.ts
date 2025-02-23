import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";

const providers = new Router({
  prefix: "/providers",
});

const azureProviderSchema = z.object({
  apiKey: z.string(),
  resourceName: z.string(),
});

providers.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const providers = await sql`
      select * from provider_azure where project_id = ${projectId}`;

  ctx.body = providers;
});

providers.get("/:id/models", async (ctx: Context) => {
  const { id } = ctx.params;

  const models = await sql`
    select 
      custom_model.id, 
      custom_model.name, 
      custom_model.provider_id,
      'azure' as provider_name
    from 
      custom_model 
      left join provider_azure on custom_model.provider_id = provider_azure.id
    where 
      provider_id = ${id}`;

  ctx.body = models;
});

providers.get("/models", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const models = await sql`
    select 
      custom_model.id,
      custom_model.name,
      custom_model.provider_id,
      'azure' as provider_name
    from custom_model
    inner join provider_azure
      on custom_model.provider_id = provider_azure.id
    where provider_azure.project_id = ${projectId}
  `;

  ctx.body = models;
});

providers.get("/:id", async (ctx: Context) => {
  const { id } = ctx.params;

  const [provider] = await sql`select * from provider_azure where id = ${id}`;

  ctx.body = provider;
});

providers.post("/", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { apiKey, resourceName } = azureProviderSchema.parse(ctx.request.body);

  const [provider] =
    await sql`insert into provider_azure ${sql({ projectId, apiKey, resourceName })} returning *`;

  ctx.body = provider;
});

const customModelSchema = z.object({
  name: z.string(),
  providerId: z.string().uuid(),
});

providers.post("/model", async (ctx: Context) => {
  const { name, providerId } = customModelSchema.parse(ctx.request.body);

  const [customModel] =
    await sql`insert into custom_model ${sql({ name, providerId })} returning *`;

  ctx.body = customModel;
});

export default providers;
