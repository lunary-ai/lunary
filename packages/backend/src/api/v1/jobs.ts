import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";

const jobs = new Router({
  prefix: "/jobs",
});

async function getJobById(id: string, orgId: string) {
  const [job] =
    await sql`select * from _job where id = ${id} and org_id = ${orgId}`;
  return job;
}

async function getJobByType(type: string, orgId: string) {
  const [job] =
    await sql` select * from _job where type = ${type} and org_id = ${orgId}`;
  return job;
}

jobs.get("/jobs/:id", checkAccess("jobs", "read"), async (ctx: Context) => {
  const { orgId } = ctx.state;
  const paramsSchema = z.object({
    id: z.string()
  });
  const { id } = paramsSchema.parse(ctx.params);

  const job = await getJobById(id, orgId);

  if (!job) {
    ctx.throw(404, "Job not found");
  }
  ctx.body = job;
});

jobs.delete("/:id", checkAccess("jobs", "delete"), async (ctx: Context) => {
  const { orgId } = ctx.state;
  const paramsSchema = z.object({
    id: z.string()
  });
  const { id } = paramsSchema.parse(ctx.params);

  await sql`delete from _job where id = ${id} and org_id = ${orgId}`;
  ctx.status = 200;
});

jobs.get(
  "/refresh-costs",
  checkAccess("jobs", "read"),
  async (ctx: Context) => {
    const { orgId } = ctx.state;

    const job = await getJobByType("refresh-costs", orgId);

    ctx.body = job;
  },
);

jobs.post(
  "/refresh-costs",
  checkAccess("logs", "create"),
  async (ctx: Context) => {
    const { orgId } = ctx.state;

    await sql`delete from _job where org_id = ${orgId} and type = 'refresh-costs'`;

    const [{ id: jobId }] = await sql`
      insert into 
        _job (org_id, type, status)
      values 
        (${orgId}, 'refresh-costs', 'pending')
      on conflict (org_id, type)
        where status in ('pending','running')
        do nothing
      returning id;
    `;

    ctx.status = 202;
    ctx.body = { jobId };
  },
);

export default jobs;
