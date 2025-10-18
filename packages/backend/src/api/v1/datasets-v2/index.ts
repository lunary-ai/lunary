import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";

type SqlClient = typeof sql;

const datasetsV2 = new Router({
  prefix: "/datasets-v2",
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const datasetMutationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer")
    .nullable()
    .optional(),
});

const baseItemSchema = z.object({
  input: z.string().optional(),
  expectedOutput: z.string().nullable().optional(),
});

const createItemSchema = baseItemSchema;

const updateItemSchema = baseItemSchema.extend({
  id: z.string().uuid(),
});

const batchSchema = z
  .object({
    create: z.array(createItemSchema).default([]),
    update: z.array(updateItemSchema).default([]),
    delete: z.array(z.string().uuid()).default([]),
    duplicate: z.array(z.string().uuid()).default([]),
  })
  .superRefine((payload, ctx) => {
    const totalOps =
      payload.create.length +
      payload.update.length +
      payload.delete.length +
      payload.duplicate.length;
    if (totalOps === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one operation is required.",
      });
    }
  });

const itemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(1000),
  search: z
    .string()
    .trim()
    .max(512)
    .optional(),
});

const exportQuerySchema = z.object({
  format: z.enum(["csv", "jsonl"]).default("jsonl"),
});

const importBodySchema = z.object({
  format: z.enum(["csv", "jsonl"]),
  payload: z
    .string()
    .min(1, "Import payload cannot be empty"),
});

function escapeLikeTerm(term: string) {
  return term.replace(/[%_]/g, "\\$&");
}

async function requireProject(ctx: Context) {
  const { projectId } = ctx.state;
  if (!projectId) {
    ctx.throw(400, "projectId query parameter is required");
  }
  return projectId;
}

async function fetchDataset(
  client: SqlClient,
  datasetId: string,
  projectId: string,
) {
  const [dataset] = await client`
    select 
      d.*,
      (
        select count(*)::int 
        from dataset_v2_item di 
        where di.dataset_id = d.id
      ) as item_count
    from dataset_v2 d
    where d.id = ${datasetId}
      and d.project_id = ${projectId}
  `;

  return dataset;
}

async function requireDataset(
  ctx: Context,
  datasetId: string,
  client: SqlClient = sql,
) {
  const projectId = await requireProject(ctx);
  const dataset = await fetchDataset(client, datasetId, projectId);
  if (!dataset) {
    ctx.throw(404, "Dataset not found");
  }
  return dataset;
}

function normalizeItemPayload(
  payload: z.infer<typeof baseItemSchema>,
  defaults?: {
    input?: string;
    expectedOutput?: string | null;
  },
) {
  const input = payload.input ?? defaults?.input ?? "";
  const expectedOutput =
    payload.expectedOutput === undefined ? defaults?.expectedOutput ?? null : payload.expectedOutput;
  return {
    input,
    expectedOutput,
  };
}

async function ensureDatasetIsEmpty(datasetId: string, client: SqlClient) {
  const [row] = await client`
    select exists(
      select 1 from dataset_v2_item where dataset_id = ${datasetId} limit 1
    ) as has_items
  `;
  return !row?.hasItems;
}

/**
 * @openapi
 * /v1/datasets-v2:
 *   get:
 *     summary: List datasets v2
 *     tags: [Datasets V2]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of datasets
 */
datasetsV2.get("/", checkAccess("datasets", "list"), async (ctx: Context) => {
  const projectId = await requireProject(ctx);
  const { page, pageSize } = listQuerySchema.parse(ctx.query);

  const offset = (page - 1) * pageSize;

  const [totalRow] = await sql`
    select count(*)::int as count
    from dataset_v2 d
    where d.project_id = ${projectId}
  `;

  const datasets = await sql`
    select 
      d.*,
      (
        select count(*)::int 
        from dataset_v2_item di 
        where di.dataset_id = d.id
      ) as item_count
    from dataset_v2 d
    where d.project_id = ${projectId}
    order by d.created_at desc
    limit ${pageSize}
    offset ${offset}
  `;

  const totalCount = Number(totalRow?.count ?? 0);
  const totalPages =
    totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  ctx.body = {
    data: datasets,
    page,
    pageSize,
    totalCount,
    totalPages,
  };
});

/**
 * @openapi
 * /v1/datasets-v2:
 *   post:
 *     summary: Create dataset v2
 *     tags: [Datasets V2]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dataset created
 */
datasetsV2.post("/", checkAccess("datasets", "create"), async (ctx: Context) => {
  const projectId = await requireProject(ctx);
  const userId = ctx.state.userId;
  const payload = datasetMutationSchema.parse(ctx.request.body ?? {});

  try {
    const [dataset] = await sql`
      insert into dataset_v2 (project_id, owner_id, name, description)
      values (${projectId}, ${userId}, ${payload.name}, ${payload.description ?? null})
      returning *
    `;

    ctx.status = 201;
    ctx.body = {
      ...dataset,
      itemCount: 0,
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      ctx.throw(409, "A dataset with the same name already exists in this project");
    }
    throw error;
  }
});

datasetsV2.get(
  "/:id",
  checkAccess("datasets", "list"),
  async (ctx: Context) => {
    const dataset = await requireDataset(ctx, ctx.params.id);
    ctx.body = dataset;
  },
);

datasetsV2.patch(
  "/:id",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const projectId = await requireProject(ctx);
    const datasetId = ctx.params.id;
    const payload = datasetMutationSchema.partial().parse(
      ctx.request.body ?? {},
    );

    if (!Object.keys(payload).length) {
      ctx.body = await requireDataset(ctx, datasetId);
      return;
    }

    try {
      const [updated] = await sql`
        update dataset_v2
        set
          name = coalesce(${payload.name}, name),
          description = coalesce(${payload.description ?? null}, description),
          updated_at = now()
        where id = ${datasetId}
          and project_id = ${projectId}
        returning *
      `;

      if (!updated) {
        ctx.throw(404, "Dataset not found");
      }

      ctx.body = await fetchDataset(sql, datasetId, projectId);
    } catch (error: any) {
      if (error?.code === "23505") {
        ctx.throw(
          409,
          "A dataset with the same name already exists in this project",
        );
      }
      throw error;
    }
  },
);

datasetsV2.delete(
  "/:id",
  checkAccess("datasets", "delete"),
  async (ctx: Context) => {
    const projectId = await requireProject(ctx);
    const datasetId = ctx.params.id;

    const result = await sql`
      delete from dataset_v2
      where id = ${datasetId}
        and project_id = ${projectId}
    `;

    if (result.count === 0) {
      ctx.throw(404, "Dataset not found");
    }

    ctx.status = 204;
  },
);

datasetsV2.get(
  "/:id/items",
  checkAccess("datasets", "list"),
  async (ctx: Context) => {
    const dataset = await requireDataset(ctx, ctx.params.id);
    const { page, pageSize, search } = itemsQuerySchema.parse(ctx.query);

    const offset = (page - 1) * pageSize;
    const likeTerm = search ? `%${escapeLikeTerm(search)}%` : null;

    const [totalRow] = await sql`
      select count(*)::int as count
      from dataset_v2_item di
      where di.dataset_id = ${dataset.id}
        ${likeTerm
          ? sql`and (
                di.input ilike ${likeTerm} escape '\\'
                or coalesce(di.expected_output, '') ilike ${likeTerm} escape '\\'
              )`
          : sql``}
    `;

    const items = await sql`
      select *
      from dataset_v2_item di
      where di.dataset_id = ${dataset.id}
        ${likeTerm
          ? sql`and (
                di.input ilike ${likeTerm} escape '\\'
                or coalesce(di.expected_output, '') ilike ${likeTerm} escape '\\'
              )`
          : sql``}
      order by di.created_at asc
      limit ${pageSize}
      offset ${offset}
    `;

    const totalCount = Number(totalRow?.count ?? 0);
    const totalPages =
      totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    ctx.body = {
      dataset,
      data: items,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  },
);

datasetsV2.post(
  "/:id/items/batch",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const dataset = await requireDataset(ctx, ctx.params.id);
    const payload = batchSchema.parse(ctx.request.body ?? {});

    const result = {
      created: [] as any[],
      updated: [] as any[],
      deleted: payload.delete,
      duplicated: [] as any[],
    };

    await sql.begin(async (trx) => {

      if (payload.delete.length) {
        await trx`
          delete from dataset_v2_item
          where dataset_id = ${dataset.id}
            and id = any(${trx.array(payload.delete, "uuid")})
        `;
      }

      if (payload.update.length) {
        for (const item of payload.update) {
          const [existing] = await trx`
            select * from dataset_v2_item
            where id = ${item.id}
              and dataset_id = ${dataset.id}
          `;
          if (!existing) continue;

          const normalized = normalizeItemPayload(item, existing);

          const [updated] = await trx`
            update dataset_v2_item
            set
              input = ${normalized.input},
              expected_output = ${normalized.expectedOutput},
              updated_at = statement_timestamp()
            where id = ${item.id}
              and dataset_id = ${dataset.id}
            returning *
          `;

          if (updated) {
            result.updated.push(updated);
          }
        }
      }

      if (payload.create.length) {
        for (const item of payload.create) {
          const normalized = normalizeItemPayload(item);
          const [created] = await trx`
            insert into dataset_v2_item (dataset_id, input, expected_output)
            values (${dataset.id}, ${normalized.input}, ${normalized.expectedOutput})
            returning *
          `;
          result.created.push(created);
        }
      }

      if (payload.duplicate.length) {
        if (payload.duplicate.length) {
          const duplicates = await trx`
            select *
            from dataset_v2_item
            where dataset_id = ${dataset.id}
              and id = any(${trx.array(payload.duplicate, "uuid")})
            order by created_at asc
          `;

          for (const item of duplicates) {
            const [created] = await trx`
              insert into dataset_v2_item (dataset_id, input, expected_output)
              values (${dataset.id}, ${item.input}, ${item.expectedOutput})
              returning *
            `;
            result.created.push(created);
            result.duplicated.push(created);
          }
        }
      }
    });

    ctx.body = result;
  },
);

datasetsV2.get(
  "/:id/items/export",
  checkAccess("datasets", "list"),
  async (ctx: Context) => {
    const dataset = await requireDataset(ctx, ctx.params.id);
    const { format } = exportQuerySchema.parse(ctx.query);

    const rows = await sql`
      select *
      from dataset_v2_item
      where dataset_id = ${dataset.id}
      order by created_at asc
    `;

    if (format === "csv") {
      const { Parser } = await import("@json2csv/plainjs");
      const parser = new Parser({
        fields: ["input", "expectedOutput"],
      });
      const csv = parser.parse(
        rows.map((row) => ({
          input: row.input,
          expectedOutput: row.expectedOutput,
        })),
      );

      ctx.set("Content-Type", "text/csv");
      ctx.set(
        "Content-Disposition",
        `attachment; filename="${dataset.name}-items.csv"`,
      );
      ctx.body = csv;
      return;
    }

    const lines = rows.map((row) =>
      JSON.stringify({
        input: row.input,
        expectedOutput: row.expectedOutput,
      }),
    );

    ctx.set("Content-Type", "application/jsonl");
    ctx.set(
      "Content-Disposition",
      `attachment; filename="${dataset.name}-items.jsonl"`,
    );
    ctx.body = lines.join("\n");
  },
);

datasetsV2.post(
  "/:id/items/import",
  checkAccess("datasets", "update"),
  async (ctx: Context) => {
    const dataset = await requireDataset(ctx, ctx.params.id);
    const body = importBodySchema.parse(ctx.request.body ?? {});

    const isEmpty = await ensureDatasetIsEmpty(dataset.id, sql);
    if (!isEmpty) {
      ctx.throw(
        400,
        "Import is only allowed for datasets without existing items",
      );
    }

    const parsedRows: Array<{ input: string; expectedOutput: string | null }> = [];

    if (body.format === "jsonl") {
      const lines = body.payload
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      for (const [idx, line] of lines.entries()) {
        let parsed: any;
        try {
          parsed = JSON.parse(line);
        } catch (error) {
          ctx.throw(422, `Invalid JSON on line ${idx + 1}`);
        }

        const normalized = normalizeItemPayload({
          input:
            typeof parsed.input === "string"
              ? parsed.input
              : parsed.input != null
                ? JSON.stringify(parsed.input)
                : "",
          expectedOutput:
            parsed.expectedOutput === undefined
              ? undefined
              : parsed.expectedOutput === null
                ? null
                : typeof parsed.expectedOutput === "string"
                  ? parsed.expectedOutput
                  : JSON.stringify(parsed.expectedOutput),
        });
        parsedRows.push(normalized);
      }
    } else if (body.format === "csv") {
      const { parse } = await import("csv-parse/sync");
      try {
        const records = parse(body.payload, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        records.forEach((record: any) => {
          const normalized = normalizeItemPayload({
            input: record.input,
            expectedOutput: record.expected_output ?? record.expectedOutput,
          });
          parsedRows.push(normalized);
        });
      } catch (error: any) {
        ctx.throw(422, `Invalid CSV payload: ${error?.message ?? error}`);
      }
    }

    await sql.begin(async (trx) => {
      for (const row of parsedRows) {
        await trx`
          insert into dataset_v2_item (dataset_id, input, expected_output)
          values (${dataset.id}, ${row.input}, ${row.expectedOutput})
        `;
      }
    });

    ctx.status = 204;
  },
);

export default datasetsV2;
