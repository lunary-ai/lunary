import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";
import { createNewDatastream } from "./utils";
import sql from "@/src/utils/db";

const dataWarehouse = new Router({
  prefix: "/data-warehouse",
});

dataWarehouse.get("/bigquery", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const [connector] =
    await sql`select * from _data_warehouse_connector where project_id = ${projectId}`;

  console.log(connector);
  ctx.body = connector;
});

dataWarehouse.post("/bigquery", async (ctx: Context) => {
  const bodySchema = z.object({
    apiKey: z.string().transform((apiKey) => JSON.parse(apiKey)),
  });

  // TODO: validate apiKey first with Zod

  const { apiKey } = bodySchema.parse(ctx.request.body);

  await createNewDatastream(apiKey, process.env.DATABASE_URL!, ctx);

  ctx.body = {};
});

dataWarehouse.patch("/bigquery", async (ctx: Context) => {});

export default dataWarehouse;
