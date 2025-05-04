import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import { unCamelObject } from "@/src/utils/misc";
import Router from "koa-router";
import { Prompt, PromptVersion } from "shared/schemas/prompt";
import { z } from "zod";

const prompts = new Router({
  prefix: "/prompts",
});

prompts.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const prompts = await sql<
    Prompt[]
  >`select * from template where project_id = ${projectId} order by created_at desc`;

  ctx.body = prompts;
});

prompts.get("/:id/versions", async (ctx: Context) => {
  const { id: templateId } = z
    .object({ id: z.coerce.number() })
    .parse(ctx.params);

  const promptVersions = await sql<
    PromptVersion[]
  >`select * from template_version where template_id = ${templateId} order by created_at desc`;

  let i = promptVersions.length;
  for (const promptVersion of promptVersions) {
    promptVersion.extra = unCamelObject(promptVersion.extra);
    promptVersion.version = i--;
  }

  ctx.body = promptVersions;
});

export default prompts;
