import Router from "koa-router";
import { z } from "zod";
import Context from "@/src/utils/koa";
import { processEventsIngestion } from "./v1/runs/ingest";
import sql from "@/src/utils/db";

/*
 * Internal endpoint used by the Bun OTEL receiver to push already-normalised
 * Lunary events.  No API-key auth – the OTEL bridge already resolved the
 * project and filled header `lunary-project-key`.
 */

const router = new Router();

router.post("/ingest/otel", async (ctx: Context) => {
  console.log("\n📨 OTEL Backend: Received request");
  console.log("Headers:", ctx.headers);
  
  const projectKey = ctx.headers["lunary-project-key"] as string | undefined;
  if (!projectKey) {
    ctx.status = 400;
    ctx.body = { error: "Missing lunary-project-key header" };
    return;
  }

  console.log(`Project key: ${projectKey}`);

  // Resolve project id from API key
  const [project] = await sql`
    select project_id from api_key where api_key = ${projectKey}
  `;

  if (!project?.projectId) {
    ctx.status = 403;
    ctx.body = { error: "Invalid project key" };
    return;
  }

  const projectId = project.projectId as string;
  console.log(`Resolved project ID: ${projectId}`);

  const parsed = z.array(z.any()).safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.status = 400;
    ctx.body = { error: "Body must be an array of events" };
    return;
  }

  const events = parsed.data as any[];
  console.log(`Processing ${events.length} events`);
  console.log("Events detail:", JSON.stringify(events, null, 2));

  try {
    const results = await processEventsIngestion(projectId, events as any);
    console.log("✅ Successfully processed events");
    ctx.body = { results };
  } catch (err) {
    console.error("❌ Error processing events:", err);
    ctx.status = 500;
    ctx.body = { error: (err as Error).message };
  }
});

export default router;
