import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";
import { getDatasetById, getDatasetBySlug } from "./utils";
import { validateUUID } from "@/src/utils/misc";
import { clearUndefined } from "@/src/utils/ingest";
import { checkAccess } from "@/src/utils/authorization";
import { lastMsg } from "@/src/checks";

const datasets = new Router({
  prefix: "/datasets",
});

datasets.get("/", checkAccess("datasets", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;

  const rows =
    await sql`select * from dataset d where project_id = ${projectId} order by created_at desc`;

  ctx.body = rows;
});

datasets.get("/:identifier", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { identifier } = ctx.params;

  const isUUID = validateUUID(identifier);

  if (isUUID) {
    // For frontend
    const datasetId = identifier;
    const dataset = await getDatasetById(datasetId, projectId);

    ctx.body = dataset;
    return;
  } else {
    // For SDK
    const slug = identifier;
    const dataset = await getDatasetBySlug(slug, projectId);

    ctx.body = dataset;
    return;
  }
});

const DEFAULT_PROMPT = {
  chat: [
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
    {
      role: "user",
      content: "Hello! I need help with something.",
    },
  ],
  text: "What is the result of 1 + 1?",
};

datasets.post("/", checkAccess("datasets", "create"), async (ctx: Context) => {
  const { projectId, userId } = ctx.state;
  const body = z.object({
    slug: z.string(),
    format: z.string().optional().default("text"),
  });

  const { slug, format } = body.parse(ctx.request.body);

  const [dataset] = await sql`
    insert into dataset ${sql({
      slug,
      format,
      ownerId: userId,
      projectId,
    })} returning *
  `;

  const [prompt] = await sql`insert into dataset_prompt
    ${sql({
      datasetId: dataset.id,
      messages: DEFAULT_PROMPT[format],
    })}
    returning *
  `;
  await sql`insert into dataset_prompt_variation
    ${sql({
      promptId: prompt.id,
      variables: {},
      idealOutput: "",
    })}
    returning *
  `;

  ctx.body = dataset;
});

datasets.patch(
  "/:id",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id } = ctx.params;

    const { slug } = ctx.request.body as {
      slug: string;
    };

    const [dataset] = await sql`
      update 
        dataset 
      set 
        slug = ${slug} 
      where 
      id = ${id} 
      and project_id = ${projectId} 
      returning *
    `;

    ctx.body = dataset;
  },
);

datasets.delete(
  "/:id",
  checkAccess("datasets", "delete"),
  async (ctx: Context) => {
    const { id: datasetId } = ctx.params;
    const { projectId } = ctx.state;

    await sql`delete from dataset where id = ${datasetId} and project_id = ${projectId}`;

    ctx.status = 200;
  },
);

datasets.post(
  "/prompts",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;

    const { datasetId, messages, idealOutput } = ctx.request.body as {
      datasetId: string;
      messages: any;
      idealOutput: string;
    };

    const [{ format }] =
      await sql`select format from dataset where id = ${datasetId} and project_id = ${projectId}`;

    const [prompt] = await sql`insert into dataset_prompt
    ${sql({
      datasetId,
      messages: messages || DEFAULT_PROMPT[format],
    })}
    returning *
  `;

    await sql`
      insert into dataset_prompt_variation
        ${sql({
          promptId: prompt.id,
          variables: {},
          idealOutput: idealOutput ? lastMsg(idealOutput) : "",
        })}
      returning *
    `;

    ctx.body = prompt;
  },
);

datasets.get(
  "/prompts/:id",
  checkAccess("datasets", "read"),
  async (ctx: Context) => {
    const { id } = ctx.params as { id: string };
    const { projectId } = ctx.state;

    const [prompt] = await sql`
      select
        dp.*
      from
        dataset_prompt dp
        left join dataset d on dp.dataset_id = d.id
      where
        dp.id = ${id}
        and d.project_id = ${projectId} 
      order by
        d.created_at asc
    `;

    if (!prompt) {
      ctx.throw(403, "You do not have access to this ressource.");
    }

    const variations = await sql`
      select 
        * 
      from 
        dataset_prompt_variation 
      where 
        prompt_id = ${id} 
      order by 
        created_at asc
    `;

    prompt.variations = variations;

    ctx.body = prompt;
  },
);

datasets.delete(
  "/prompts/:id",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { id: promptId } = ctx.params;

    const [datasetPrompt] = await sql`
      select
        *
      from
        dataset_prompt dp
        left join dataset d on dp.dataset_id = d.id
        left join project p on d.project_id = p.id
      where
        p.org_id = ${ctx.state.orgId} 
        and dp.id = ${promptId}
    `;

    if (!datasetPrompt) {
      ctx.throw(401, "You do not have access to this ressource.");
    }

    await sql`delete from dataset_prompt where id = ${promptId}`;
    await sql`delete from dataset_prompt_variation where prompt_id = ${promptId}`;

    ctx.status = 200;
  },
);

datasets.patch(
  "/prompts/:id",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;
    const { messages } = ctx.request.body as {
      messages: string;
    };

    const [dataset] = await sql`
      select 
        d.id 
      from 
        dataset_prompt dp
        left join dataset d on dp.dataset_id = d.id
      where
        d.project_id = ${projectId}
    `;

    if (!dataset) {
      ctx.throw(403, "Unauthorized");
    }

    const [prompt] =
      await sql`update dataset_prompt set messages = ${messages} where id = ${id} returning *`;

    ctx.body = prompt;
  },
);

datasets.get(
  "/variations/:id",
  checkAccess("datasets", "read"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;

    const [variation] = await sql`
      select
        dpv.*
      from
        dataset_prompt_variation dpv
        left join dataset_prompt dp on dpv.prompt_id = dp.id
        left join dataset d on dp.dataset_id = d.id
      where
        dpv.id = ${id} 
        and d.project_id = ${projectId} 
    `;

    if (!variation) {
      ctx.throw(404, "Variation not found");
    }

    ctx.body = variation;
  },
);

datasets.delete(
  "/variations/:id",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { id: variationId } = ctx.params;
    const { projectId } = ctx.state;

    const [promptVariation] = await sql`
      select
        dpv.*
      from
        dataset_prompt_variation dpv
        left join dataset_prompt dp on dpv.prompt_id = dp.id
        left join dataset d on dp.dataset_id = d.id
      where
        dpv.id = ${variationId} 
        and d.project_id = ${projectId} 
    `;

    if (!promptVariation) {
      ctx.throw(403, "You do not have access to this ressource.");
    }

    await sql`delete from dataset_prompt_variation where id = ${variationId}`;

    ctx.status = 200;
  },
);

datasets.patch(
  "/variations/:variationId",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { variationId } = ctx.params;
    const { projectId } = ctx.state;
    const { variables, idealOutput } = ctx.request.body as {
      variables: any;
      idealOutput: string;
    };

    const [variation] = await sql`
      select
        dpv.*
      from
        dataset_prompt_variation dpv
        left join dataset_prompt dp on dpv.prompt_id = dp.id
        left join dataset d on dp.dataset_id = d.id
      where
        dpv.id = ${variationId} 
        and d.project_id = ${projectId} 
    `;

    if (!variation) {
      ctx.throw(403, "You do not have access to this ressource.");
    }

    const [updatedVariation] = await sql`update dataset_prompt_variation set
    ${sql(
      clearUndefined({
        variables,
        idealOutput,
      }),
    )}
    where id = ${variationId}
    returning *
  `;

    ctx.body = updatedVariation;
  },
);

datasets.post(
  "/variations",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { promptId, variables, idealOutput } = ctx.request.body as {
      promptId: string;
      variables: any;
      idealOutput: string;
    };

    const [dataset] = await sql`
      select
        d.*
      from 
        dataset_prompt dp 
        left join dataset d on dp.dataset_id = d.id
      where
        dp.id = ${promptId} 
        and d.project_id = ${projectId}
    `;

    if (!dataset) {
      ctx.throw(403, "You do not have access to this ressource.");
    }

    const [variation] = await sql`insert into dataset_prompt_variation
      ${sql(
        clearUndefined({
          promptId,
          variables,
          idealOutput,
        }),
      )}
      returning *
    `;

    ctx.body = variation;
  },
);

export default datasets;
