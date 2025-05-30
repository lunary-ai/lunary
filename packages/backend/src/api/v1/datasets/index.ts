import { lastMsg } from "@/src/checks";
import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import { isOpenAIMessage, validateUUID } from "@/src/utils/misc";
import Router from "koa-router";
import { z } from "zod";
import { getDatasetById, getDatasetBySlug } from "./utils";

interface DefaultPrompt {
  chat: { role: string; content: string }[];
  text: string;
}

const DEFAULT_PROMPT: DefaultPrompt = {
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

const datasets = new Router({
  prefix: "/datasets",
});

/**
 * @openapi
 * /v1/datasets:
 *   get:
 *     summary: List datasets
 *     tags: [Datasets]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of datasets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Dataset'
 */
datasets.get("/", checkAccess("datasets", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;

  const rows =
    await sql`select * from dataset d where project_id = ${projectId} order by created_at desc`;

  ctx.body = rows;
});

/**
 * @openapi
 * /v1/datasets/{identifier}:
 *   get:
 *     summary: Get dataset by ID or slug
 *     tags: [Datasets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dataset details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dataset'
 */
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
/**
 * @openapi
 * /v1/datasets:
 *   post:
 *     summary: Create a new dataset
 *     tags: [Datasets]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   slug:
 *                     type: string
 *                   format:
 *                     type: string
 *                     enum: [text]
 *                   prompt:
 *                     type: string
 *                     nullable: true
 *                   withPromptVariation:
 *                     type: boolean
 *                     default: true
 *                 required:
 *                   - slug
 *                   - format
 *               - type: object
 *                 properties:
 *                   slug:
 *                     type: string
 *                   format:
 *                     type: string
 *                     enum: [chat]
 *                   prompt:
 *                     oneOf:
 *                       - type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             role:
 *                               type: string
 *                             content:
 *                               type: string
 *                           required:
 *                             - role
 *                             - content
 *                       - type: string
 *                     nullable: true
 *                   withPromptVariation:
 *                     type: boolean
 *                     default: true
 *                 required:
 *                   - slug
 *                   - format
 *     responses:
 *       200:
 *         description: Created dataset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dataset'
 */
datasets.post("/", checkAccess("datasets", "create"), async (ctx: Context) => {
  const createDatasetSchema = z.preprocess(
    (arg) => {
      const obj = typeof arg === "object" && arg !== null ? arg : {};
      return { format: "text", ...obj };
    },
    z.discriminatedUnion("format", [
      z.object({
        slug: z.string(),
        format: z.literal("text"),
        prompt: z.string().nullable().optional(),
        withPromptVariation: z.boolean().default(true),
      }),
      z.object({
        slug: z.string(),
        format: z.literal("chat"),
        prompt: z
          .array(
            z.object({
              role: z.string(),
              content: z.string(),
            }),
          )
          .nullable()
          .optional(),
        withPromptVariation: z.boolean().default(true),
      }),
    ]),
  );

  const {
    slug,
    format,
    prompt: customPrompt,
    withPromptVariation,
  } = createDatasetSchema.parse(ctx.request.body);
  const { projectId, userId } = ctx.state;

  const [dataset] = await sql`
    insert into dataset ${sql({
      slug,
      format,
      ownerId: userId,
      projectId,
    })} returning *
  `;

  if (customPrompt !== null) {
    const promptMessages = customPrompt ?? DEFAULT_PROMPT[format];

    const [promptRecord] = await sql`insert into dataset_prompt
    ${sql({
      datasetId: dataset.id,
      messages: promptMessages,
    })}
    returning *
  `;

    if (withPromptVariation) {
      await sql`insert into dataset_prompt_variation
      ${sql({
        promptId: promptRecord.id,
        variables: {},
        idealOutput: "",
      })}
    `;
    }
  }

  const fullDataset = await getDatasetById(dataset.id, projectId);

  ctx.body = fullDataset;
});

/**
 * @openapi
 * /v1/datasets/{id}:
 *   patch:
 *     summary: Update a dataset
 *     tags: [Datasets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated dataset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dataset'
 */
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

/**
 * @openapi
 * /v1/datasets/{id}:
 *   delete:
 *     summary: Delete a dataset
 *     tags: [Datasets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dataset deleted successfully
 */
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
/**
 * @openapi
 * /v1/datasets/prompts:
 *   post:
 *     summary: Create a new prompt
 *     tags: [Datasets, Prompts]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   datasetId:
 *                     type: string
 *                   messages:
 *                     type: string
 *                     nullable: true
 *                   idealOutput:
 *                     type: string
 *                   withPromptVariation:
 *                     type: boolean
 *                     default: true
 *                 required:
 *                   - datasetId
 *               - type: object
 *                 properties:
 *                   datasetId:
 *                     type: string
 *                   messages:
 *                     type: array
 *                     nullable: true
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: string
 *                         content:
 *                           type: string
 *                       required:
 *                         - role
 *                         - content
 *                   idealOutput:
 *                     type: string
 *                   withPromptVariation:
 *                     type: boolean
 *                     default: true
 *                 required:
 *                   - datasetId
 *     responses:
 *       200:
 *         description: Created prompt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetPrompt'
 */
datasets.post(
  "/prompts",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;

    const bodySchema = z.union([
      z.object({
        datasetId: z.string(),
        messages: z.string().nullable().optional(),
        idealOutput: z.string().optional(),
        withPromptVariation: z.boolean().default(true),
      }),
      z.object({
        datasetId: z.string(),
        messages: z
          .array(z.object({ role: z.string(), content: z.string() }))
          .nullable()
          .optional(),
        idealOutput: z.string().optional(),
        withPromptVariation: z.boolean().default(true),
      }),
    ]);

    const { datasetId, messages, idealOutput, withPromptVariation } =
      bodySchema.parse(ctx.request.body);

    const [{ format }] =
      await sql`select format from dataset where id = ${datasetId} and project_id = ${projectId}`;

    if (
      format === "text" &&
      messages !== undefined &&
      typeof messages !== "string"
    ) {
      ctx.throw(400, "For text format, prompt must be a string.");
    }
    if (
      format === "chat" &&
      messages !== undefined &&
      !Array.isArray(messages)
    ) {
      ctx.throw(400, "For chat format, prompt must be an array of messages.");
    }

    const [prompt] = await sql`insert into dataset_prompt
      ${sql({
        datasetId,
        messages: messages ?? DEFAULT_PROMPT[format as keyof DefaultPrompt],
      })}
      returning *
    `;

    if (withPromptVariation) {
      await sql`
      insert into dataset_prompt_variation
        ${sql({
          promptId: prompt.id,
          variables: {},
          idealOutput: idealOutput ? lastMsg(idealOutput) : "",
        })}
      returning *
    `;
    }

    ctx.body = prompt;
  },
);

datasets.post("/prompts/attach", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const { runIds, datasetId } = z
    .object({
      runIds: z.array(z.string().uuid()),
      datasetId: z.string().uuid(),
    })
    .parse(ctx.request.body);

  const runs = await sql`
    select id, input
    from run
    where id = any(${runIds})
      and project_id = ${projectId}
  `;

  const rows = runs.flatMap(({ input }) => {
    const messages = input.filter(isOpenAIMessage);
    return messages.length ? { datasetId, messages } : [];
  });

  if (!rows.length) {
    ctx.body = [];
    return;
  }

  const prompts = await sql`
    insert into dataset_prompt ${sql(rows)}
    returning *
  `;

  ctx.body = prompts;
});

/**
 * @openapi
 * /v1/datasets/prompts/{id}:
 *   get:
 *     summary: Get prompt by ID
 *     tags: [Datasets, Prompts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prompt details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetPrompt'
 */
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

/**
 * @openapi
 * /v1/datasets/prompts/{id}:
 *   delete:
 *     summary: Delete a prompt
 *     tags: [Datasets, Prompts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prompt deleted successfully
 */
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

/**
 * @openapi
 * /v1/datasets/prompts/{id}:
 *   patch:
 *     summary: Update a prompt
 *     tags: [Datasets, Prompts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: string
 *                         content:
 *                           type: string
 *                   - type: string
 *     responses:
 *       200:
 *         description: Updated prompt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetPrompt'
 */
datasets.patch(
  "/prompts/:id",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;
    const bodySchema = z.object({
      messages: z.union([
        z.string(),
        z.array(z.object({ role: z.string(), content: z.string() })),
      ]),
    });

    const { messages } = bodySchema.parse(ctx.request.body);

    const [record] = await sql`
      select 
        d.format
      from 
        dataset_prompt dp
      left join dataset d on dp.dataset_id = d.id
      where 
        dp.id = ${id} and d.project_id = ${projectId}
    `;

    if (!record) {
      ctx.throw(403, "Unauthorized");
    }

    if (
      record.format === "text" &&
      messages !== undefined &&
      typeof messages !== "string"
    ) {
      ctx.throw(400, "For text format, prompt must be a string.");
    }
    if (
      record.format === "chat" &&
      messages !== undefined &&
      !Array.isArray(messages)
    ) {
      ctx.throw(400, "For chat format, prompt must be an array of messages.");
    }

    const [prompt] =
      await sql`update dataset_prompt set messages = ${sql.json(messages)} where id = ${id} returning *`;

    ctx.body = prompt;
  },
);

/**
 * @openapi
 * /v1/datasets/variations/{id}:
 *   get:
 *     summary: Get prompt variation by ID
 *     tags: [Datasets, Prompts, Variations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prompt variation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetPromptVariation'
 */
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

/**
 * @openapi
 * /v1/datasets/variations/{id}:
 *   delete:
 *     summary: Delete a prompt variation
 *     tags: [Datasets, Prompts, Variations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prompt variation deleted successfully
 */
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

/**
 * @openapi
 * /v1/datasets/variations/{variationId}:
 *   patch:
 *     summary: Update a prompt variation
 *     tags: [Datasets, Prompts, Variations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: variationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               variables:
 *                 type: object
 *               idealOutput:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated prompt variation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetPromptVariation'
 */
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

/**
 * @openapi
 * /v1/datasets/variations:
 *   post:
 *     summary: Create a new prompt variation
 *     tags: [Datasets, Prompts, Variations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               promptId:
 *                 type: string
 *               variables:
 *                 type: object
 *               idealOutput:
 *                 type: string
 *     responses:
 *       200:
 *         description: Created prompt variation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetPromptVariation'
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     Dataset:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         slug:
 *           type: string
 *         format:
 *           type: string
 *           enum: [text, chat]
 *         ownerId:
 *           type: string
 *         projectId:
 *           type: string
 *     DatasetPrompt:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         datasetId:
 *           type: string
 *         messages:
 *           oneOf:
 *             - type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   role:
 *                     type: string
 *                   content:
 *                     type: string
 *             - type: string
 *     DatasetPromptVariation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         promptId:
 *           type: string
 *         variables:
 *           type: object
 *         idealOutput:
 *           type: string
 */

export default datasets;
