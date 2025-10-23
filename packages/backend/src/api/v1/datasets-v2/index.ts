import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import { getOpenAIParams } from "@/src/utils/openai";
import stripe from "@/src/utils/stripe";
import Router from "koa-router";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { z } from "zod";
import config from "@/src/utils/config";

const datasetsV2 = new Router({
  prefix: "/datasets-v2",
});

const DatasetIdParamsSchema = z.object({
  datasetId: z.string().uuid(),
});

const DatasetItemIdParamsSchema = z.object({
  datasetId: z.string().uuid(),
  itemId: z.string().uuid(),
});

const DatasetInputSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().max(10_000).nullable().optional(),
});

const DatasetUpdateSchema = DatasetInputSchema.partial();

const DatasetItemCreateSchema = z
  .object({
    input: z.string().optional(),
    groundTruth: z.string().nullable().optional(),
  })
  .transform((value) => ({
    input: value.input ?? "",
    groundTruth: value.groundTruth ?? null,
  }));

const DatasetItemUpdateSchema = z
  .object({
    input: z.string().optional(),
    groundTruth: z.string().nullable().optional(),
  })
  .transform((value) => ({
    input: value.input,
    groundTruth: value.groundTruth,
  }));

const DatasetImportSchema = z.object({
  format: z.enum(["csv", "jsonl"]),
  content: z.string().min(1),
});

const DatasetGenerateSchema = z.object({
  model: z.string().trim().min(1).default("gpt-5-mini"),
  instructions: z.string().trim().max(10_000).optional(),
  input: z.string().optional(),
});

function ensureProjectId(ctx: Context): string {
  const projectId = ctx.state.projectId as string | undefined;

  if (!projectId) {
    ctx.throw(400, "projectId is required");
  }

  return projectId;
}

async function getDatasetForProject(datasetId: string, projectId: string) {
  const [dataset] =
    await sql`select * from dataset_v2 where id = ${datasetId} and project_id = ${projectId}`;

  if (!dataset) {
    return null;
  }

  return dataset;
}

async function ensureDatasetOwnership(datasetId: string, projectId: string) {
  return getDatasetForProject(datasetId, projectId);
}

async function touchDataset(datasetId: string) {
  await sql`
    update dataset_v2
    set updated_at = statement_timestamp()
    where id = ${datasetId}
  `;
}

async function generateCopyName(
  baseName: string,
  projectId: string,
  client = sql,
) {
  const trimmedBase = baseName.trim();
  let suffix = 1;
  let candidate =
    trimmedBase.length === 0 ? "Dataset copy" : `${trimmedBase} copy`;

  // ensure unique within project
  while (true) {
    const [existing] =
      await client`select 1 from dataset_v2 where project_id = ${projectId} and name = ${candidate}`;

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate =
      trimmedBase.length === 0
        ? `Dataset copy (${suffix})`
        : `${trimmedBase} copy (${suffix})`;
  }
}

type ParsedItem = { input: string; groundTruth: string | null };

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string): ParsedItem[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const inputIndex = header.indexOf("input");
  const groundTruthIndex = (() => {
    const variants = [
      "ground_truth",
      "groundtruth",
      "expected_output",
      "expectedoutput",
    ];
    for (const variant of variants) {
      const idx = header.indexOf(variant);
      if (idx !== -1) {
        return idx;
      }
    }
    return -1;
  })();

  if (inputIndex === -1) {
    throw new Error(
      "CSV import requires a header row with at least an 'input' column",
    );
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const input = values[inputIndex] ?? "";
    const groundTruthValue =
      groundTruthIndex >= 0 ? (values[groundTruthIndex] ?? "") : null;

    return {
      input,
      groundTruth:
        groundTruthValue === null || groundTruthValue === ""
          ? null
          : groundTruthValue,
    };
  });
}

function parseJsonl(content: string): ParsedItem[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: ParsedItem[] = [];

  for (const line of lines) {
    let parsed: any;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error("Invalid JSONL: could not parse one of the lines");
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.input !== "string"
    ) {
      throw new Error("Each JSONL line must contain at least an 'input' field");
    }

    const groundTruthRaw =
      parsed.ground_truth ??
      parsed.groundTruth ??
      parsed.expected_output ??
      null;
    const groundTruthValue =
      typeof groundTruthRaw === "string"
        ? groundTruthRaw
        : groundTruthRaw == null
          ? null
          : String(groundTruthRaw);

    items.push({
      input: parsed.input,
      groundTruth: groundTruthValue === "" ? null : groundTruthValue,
    });
  }

  return items;
}

function extractResponseText(response: any) {
  if (!response) {
    return "";
  }

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (Array.isArray(response.output)) {
    const segments: string[] = [];
    for (const item of response.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const part of item.content) {
        if (typeof part === "string") {
          segments.push(part);
        } else if (typeof part?.text === "string") {
          segments.push(part.text);
        }
      }
    }
    return segments.join("\n");
  }

  return "";
}

async function insertDatasetItems(
  trx: typeof sql,
  datasetId: string,
  items: ParsedItem[],
) {
  if (items.length === 0) {
    return 0;
  }

  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const values: string[] = [];
    const parameters: any[] = [];

    chunk.forEach((item, index) => {
      const paramIndex = index * 3;
      values.push(
        `($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`,
      );
      parameters.push(datasetId, item.input ?? "", item.groundTruth);
    });

    await trx.unsafe(
      `insert into dataset_v2_item (dataset_id, input, ground_truth) values ${values.join(", ")}`,
      parameters,
    );
    inserted += chunk.length;
  }

  await trx`
    update dataset_v2
    set updated_at = statement_timestamp()
    where id = ${datasetId}
  `;

  return inserted;
}

/**
 * @openapi
 * /v1/datasets-v2:
 *   get:
 *     summary: List datasets v2
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of datasets v2
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DatasetV2'
 */
const DatasetListQuerySchema = z.object({
  search: z.string().trim().min(1).max(255).optional(),
  sort: z
    .enum(["newest", "alphabetical", "items", "updated"])
    .default("newest"),
});

datasetsV2.get("/", checkAccess("datasets", "list"), async (ctx: Context) => {
  const projectId = ensureProjectId(ctx);
  const { search, sort } = DatasetListQuerySchema.parse(ctx.request.query);
  const searchTerm = search ? `%${search}%` : null;

  const orderBy =
    sort === "alphabetical"
      ? sql`lower(d.name) asc`
      : sort === "items"
        ? sql`item_stats.item_count desc nulls last, d.created_at desc`
        : sort === "updated"
          ? sql`d.updated_at desc`
          : sql`d.created_at desc`;

  const datasets = await sql`
    select
      d.*,
      coalesce(item_stats.item_count, 0)::int as item_count,
      owner.name as owner_name,
      owner.email as owner_email
    from dataset_v2 d
    left join lateral (
      select count(*) as item_count
      from dataset_v2_item di
      where di.dataset_id = d.id
    ) item_stats on true
    left join account owner on owner.id = d.owner_id
    where d.project_id = ${projectId}
    ${
      searchTerm
        ? sql`and (d.name ilike ${searchTerm} or d.description ilike ${searchTerm})`
        : sql``
    }
    order by ${orderBy}
  `;

  ctx.body = datasets;
});

/**
 * @openapi
 * /v1/datasets-v2:
 *   post:
 *     summary: Create dataset v2
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DatasetV2Input'
 *     responses:
 *       201:
 *         description: Created dataset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetV2'
 */
datasetsV2.post(
  "/",
  checkAccess("datasets", "create"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const ownerId = ctx.state.userId as string | undefined;

    const parsedBody = DatasetInputSchema.parse(ctx.request.body ?? {});

    try {
      const [dataset] = await sql`
      insert into dataset_v2 ${sql(
        clearUndefined({
          projectId,
          ownerId: ownerId ?? null,
          name: parsedBody.name,
          description: parsedBody.description ?? null,
        }),
      )}
      returning *
    `;

      ctx.status = 201;
      ctx.body = dataset;
    } catch (error: any) {
      if (error?.code === "23505") {
        ctx.throw(409, "Dataset name already exists in this project");
        return;
      }

      throw error;
    }
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}:
 *   get:
 *     summary: Get dataset v2
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dataset with items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetV2WithItems'
 */
datasetsV2.get("/:datasetId", async (ctx: Context) => {
  const projectId = ensureProjectId(ctx);
  const { datasetId } = DatasetIdParamsSchema.parse(ctx.params);

  const dataset = await getDatasetForProject(datasetId, projectId);

  if (!dataset) {
    ctx.throw(404, "Dataset not found");
    return;
  }

  const items =
    await sql`select * from dataset_v2_item where dataset_id = ${datasetId} order by created_at asc`;

  ctx.body = {
    ...dataset,
    items,
  };
});

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}:
 *   patch:
 *     summary: Update dataset v2
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DatasetV2Input'
 *     responses:
 *       200:
 *         description: Updated dataset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetV2'
 */
datasetsV2.patch(
  "/:datasetId",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId } = DatasetIdParamsSchema.parse(ctx.params);

    const payload = DatasetUpdateSchema.parse(ctx.request.body ?? {});

    if (
      !Object.prototype.hasOwnProperty.call(payload, "name") &&
      !Object.prototype.hasOwnProperty.call(payload, "description")
    ) {
      ctx.throw(400, "No fields to update");
      return;
    }

    const dataset = await getDatasetForProject(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const updates = clearUndefined({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description }
        : {}),
      updatedAt: new Date(),
    });

    const [updatedDataset] = await sql`
      update dataset_v2
      set ${sql(updates)}
      where id = ${datasetId}
      returning *
    `;

    ctx.body = updatedDataset;
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}:
 *   delete:
 *     summary: Delete dataset v2
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Dataset deleted
 */
datasetsV2.delete(
  "/:datasetId",
  checkAccess("datasets", "delete"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId } = DatasetIdParamsSchema.parse(ctx.params);

    const dataset = await getDatasetForProject(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    await sql`delete from dataset_v2 where id = ${datasetId}`;

    ctx.status = 204;
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}/import:
 *   post:
 *     summary: Import dataset items from CSV or JSONL
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DatasetV2ImportRequest'
 *     responses:
 *       200:
 *         description: Number of imported items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 insertedCount:
 *                   type: integer
 */
datasetsV2.post(
  "/:datasetId/import",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId } = DatasetIdParamsSchema.parse(ctx.params);

    const dataset = await getDatasetForProject(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const { format, content } = DatasetImportSchema.parse(
      ctx.request.body ?? {},
    );

    let items: ParsedItem[];

    try {
      items = format === "csv" ? parseCsv(content) : parseJsonl(content);
    } catch (error: any) {
      ctx.throw(400, error?.message ?? "Unable to parse dataset file");
      return;
    }

    if (items.length === 0) {
      ctx.body = { insertedCount: 0 };
      return;
    }

    const insertedCount = await sql.begin(async (trx) => {
      return insertDatasetItems(trx, datasetId, items);
    });

    ctx.body = { insertedCount };
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}/duplicate:
 *   post:
 *     summary: Duplicate dataset v2
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Duplicated dataset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetV2'
 */
datasetsV2.post(
  "/:datasetId/duplicate",
  checkAccess("datasets", "create"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const ownerId = ctx.state.userId as string | undefined;
    const { datasetId } = DatasetIdParamsSchema.parse(ctx.params);

    const dataset = await getDatasetForProject(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const newDatasetId = randomUUID();

    const insertedDataset = await sql.begin(async (trx) => {
      const copyName = await generateCopyName(dataset.name, projectId, trx);

      const [createdDataset] = await trx`
        insert into dataset_v2 ${sql(
          clearUndefined({
            id: newDatasetId,
            projectId,
            ownerId: ownerId ?? null,
            name: copyName,
            description: dataset.description,
          }),
        )}
        returning *
      `;

      await trx`
        insert into dataset_v2_item (dataset_id, input, ground_truth)
        select ${newDatasetId}, input, ground_truth
        from dataset_v2_item
        where dataset_id = ${datasetId}
      `;

      return createdDataset;
    });

    const [responseDataset] = await sql`
      select
        d.*,
        coalesce(item_stats.item_count, 0)::int as item_count,
        owner.name as owner_name,
        owner.email as owner_email
      from dataset_v2 d
      left join lateral (
        select count(*) as item_count
        from dataset_v2_item di
        where di.dataset_id = d.id
      ) item_stats on true
      left join account owner on owner.id = d.owner_id
      where d.id = ${insertedDataset.id}
      limit 1
    `;

    ctx.status = 201;
    ctx.body = responseDataset;
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}/items/{itemId}/generate:
 *   post:
 *     summary: Generate dataset item output
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *               instructions:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generated output for the dataset item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 output:
 *                   type: string
 */
datasetsV2.post(
  "/:datasetId/items/:itemId/generate",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId, itemId } = DatasetItemIdParamsSchema.parse(ctx.params);

    const dataset = await getDatasetForProject(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const { model, instructions, input } = DatasetGenerateSchema.parse(
      ctx.request.body ?? {},
    );

    const [item] =
      await sql`select id, input from dataset_v2_item where dataset_id = ${datasetId} and id = ${itemId}`;

    if (!item) {
      ctx.throw(404, "Dataset item not found");
      return;
    }

    const openaiParams = getOpenAIParams();

    if (!openaiParams) {
      ctx.throw(400, "OpenAI API key is not configured");
      return;
    }

    const client = new OpenAI(openaiParams);

    let stripeCustomer: string | null = null;
    const orgId = ctx.state.orgId as string | undefined;

    if (orgId) {
      const [orgRow] =
        await sql`select stripe_customer from org where id = ${orgId}`;
      stripeCustomer = orgRow?.stripeCustomer ?? null;
    }

    const shouldMeter =
      config.IS_CLOUD &&
      process.env.NODE_ENV === "production" &&
      Boolean(process.env.STRIPE_SECRET_KEY) &&
      Boolean(stripeCustomer);

    if (shouldMeter && stripeCustomer) {
      stripe.billing.meterEvents
        .create({
          event_name: "ai_playground",
          payload: {
            value: "1",
            stripe_customer_id: stripeCustomer,
          },
        })
        .catch(console.error);
    }

    try {
      const response = await client.responses.create({
        model,
        input: input ?? item.input ?? "",
        instructions:
          instructions && instructions.length > 0 ? instructions : undefined,
      });

      const outputText = extractResponseText(response).trim();
      ctx.body = { output: outputText };
    } catch (error: any) {
      ctx.throw(
        error?.status ?? 502,
        error?.message ?? "Unable to generate output for this item",
      );
    }
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}/items:
 *   get:
 *     summary: List dataset v2 items
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dataset items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DatasetV2Item'
 */
datasetsV2.get(
  "/:datasetId/items",
  checkAccess("datasets", "list"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId } = DatasetIdParamsSchema.parse(ctx.params);

    const dataset = await getDatasetForProject(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const items =
      await sql`select * from dataset_v2_item where dataset_id = ${datasetId} order by created_at desc`;

    ctx.body = items;
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}/items:
 *   post:
 *     summary: Create dataset v2 item
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DatasetV2ItemInput'
 *     responses:
 *       201:
 *         description: Created item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetV2Item'
 */
datasetsV2.post(
  "/:datasetId/items",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId } = DatasetIdParamsSchema.parse(ctx.params);
    const dataset = await getDatasetForProject(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const { input, groundTruth } = DatasetItemCreateSchema.parse(
      ctx.request.body ?? {},
    );

    const [item] = await sql`
      insert into dataset_v2_item ${sql(
        clearUndefined({
          datasetId,
          input,
          groundTruth,
        }),
      )}
      returning *
    `;

    await touchDataset(datasetId);

    ctx.status = 201;
    ctx.body = item;
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}/items/{itemId}:
 *   get:
 *     summary: Get dataset v2 item
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dataset item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetV2Item'
 */
datasetsV2.get(
  "/:datasetId/items/:itemId",
  checkAccess("datasets", "list"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId, itemId } = DatasetItemIdParamsSchema.parse(ctx.params);

    const dataset = await getDatasetForProject(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const [item] =
      await sql`select * from dataset_v2_item where id = ${itemId} and dataset_id = ${datasetId}`;

    if (!item) {
      ctx.throw(404, "Dataset item not found");
      return;
    }

    ctx.body = item;
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}/items/{itemId}:
 *   patch:
 *     summary: Update dataset v2 item
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DatasetV2ItemInput'
 *     responses:
 *       200:
 *         description: Updated dataset item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatasetV2Item'
 */
datasetsV2.patch(
  "/:datasetId/items/:itemId",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId, itemId } = DatasetItemIdParamsSchema.parse(ctx.params);

    const dataset = await ensureDatasetOwnership(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const payload = DatasetItemUpdateSchema.parse(ctx.request.body ?? {});
    const hasInput = payload.input !== undefined;
    const hasGroundTruth = payload.groundTruth !== undefined;

    if (!hasInput && !hasGroundTruth) {
      ctx.throw(400, "No fields to update");
      return;
    }

    const updates = clearUndefined({
      ...(hasInput ? { input: payload.input } : {}),
      ...(hasGroundTruth ? { groundTruth: payload.groundTruth } : {}),
      updatedAt: new Date(),
    });

    const [item] = await sql`
      update dataset_v2_item
      set ${sql(updates)}
      where id = ${itemId} and dataset_id = ${datasetId}
      returning *
    `;

    if (!item) {
      ctx.throw(404, "Dataset item not found");
      return;
    }

    await touchDataset(datasetId);

    ctx.body = item;
  },
);

/**
 * @openapi
 * /v1/datasets-v2/{datasetId}/items/{itemId}:
 *   delete:
 *     summary: Delete dataset v2 item
 *     tags: [Datasets v2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Dataset item deleted
 */
datasetsV2.delete(
  "/:datasetId/items/:itemId",
  checkAccess("datasets", "delete"),
  async (ctx: Context) => {
    const projectId = ensureProjectId(ctx);
    const { datasetId, itemId } = DatasetItemIdParamsSchema.parse(ctx.params);

    const dataset = await ensureDatasetOwnership(datasetId, projectId);

    if (!dataset) {
      ctx.throw(404, "Dataset not found");
      return;
    }

    const [deletedItem] =
      await sql`delete from dataset_v2_item where id = ${itemId} and dataset_id = ${datasetId} returning id`;

    if (!deletedItem) {
      ctx.throw(404, "Dataset item not found");
      return;
    }

    await touchDataset(datasetId);

    ctx.status = 204;
  },
);

/**
 * @openapi
 * components:
 *   schemas:
 *     DatasetV2:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         projectId:
 *           type: string
 *           format: uuid
 *         ownerId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     DatasetV2Input:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *       required:
 *         - name
 *     DatasetV2WithItems:
 *       allOf:
 *         - $ref: '#/components/schemas/DatasetV2'
 *         - type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DatasetV2Item'
 *     DatasetV2Item:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         datasetId:
 *           type: string
 *           format: uuid
 *         input:
 *           type: string
 *         groundTruth:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     DatasetV2ItemInput:
 *       type: object
 *       properties:
 *         input:
 *           type: string
 *         groundTruth:
 *           type: string
 *           nullable: true
 *     DatasetV2ImportRequest:
 *       type: object
 *       properties:
 *         format:
 *           type: string
 *           enum: [csv, jsonl]
 *         content:
 *           type: string
 *       required:
 *         - format
 *         - content
 */

export default datasetsV2;
