import sql from "@/src/utils/db";
import Router from "koa-router";
import { Context } from "koa";
import { checkAccess } from "@/src/utils/authorization";
import { z } from "zod";
import { buildFiltersQuery } from "./analytics/utils";

const users = new Router({
  prefix: "/external-users",
});

/**
 * @openapi
 * /api/v1/external-users:
 *   get:
 *     summary: List project users
 *     description: |
 *       This endpoint retrieves a list of users tracked within the project.
 *       It supports pagination, filtering, and sorting options.
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: timeZone
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: checks
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
users.get("/", checkAccess("users", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;
  const querySchema = z.object({
    limit: z.coerce.number().optional().default(100),
    page: z.coerce.number().optional().default(0),
    search: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    timeZone: z.string().optional(),
    sortField: z.string().optional().default("createdAt"),
    sortDirection: z
      .union([z.literal("asc"), z.literal("desc")])
      .optional()
      .default("desc"),
    checks: z.string().optional(),
  });
  const {
    limit,
    page,
    search,
    startDate,
    endDate,
    timeZone,
    sortDirection,
    sortField,
    checks,
  } = querySchema.parse(ctx.request.query);

  let searchQuery = sql``;
  if (search) {
    searchQuery = sql`and (
      lower(external_id) ilike lower(${`%${search}%`}) 
      or lower(props->>'email') ilike lower(${`%${search}%`}) 
      or lower(props->>'name') ilike lower(${`%${search}%`})
    )`;
  }

  let createAtQuery = sql``;
  if (startDate && endDate && timeZone) {
    createAtQuery = sql`
      and r.created_at at time zone ${timeZone} >= ${startDate}
      and r.created_at at time zone ${timeZone} <= ${endDate}
    `;
  }

  const filtersQuery = buildFiltersQuery(checks || "");

  const sortMapping = {
    createdAt: "eu.created_at",
    lastSeen: "eu.last_seen",
    cost: "uc.cost",
  };

  let orderByClause = `${sortMapping[sortField]} ${sortDirection} nulls last`;

  const [users, total] = await Promise.all([
    sql`
      with user_costs as (
        select
          external_user_id,
          coalesce(sum(cost), 0) as cost
        from
          run r
        where
          ${filtersQuery}
          and project_id = ${projectId} 
          ${createAtQuery}
        group by
          external_user_id
      )
      select
        eu.id,
        eu.created_at,
        eu.external_id,
        eu.last_seen,
        eu.props,
        uc.cost
      from
        public.external_user eu
        left join user_costs uc on eu.id = uc.external_user_id
      where
        eu.project_id = ${projectId} 
        ${searchQuery} 
      order by
        ${sql.unsafe(orderByClause)} 
      limit ${limit}
      offset ${page * limit}
    `,
    sql`
      select count(*) as total
      from public.external_user eu
      where eu.project_id = ${projectId} 
      ${searchQuery}
    `,
  ]);

  ctx.body = {
    total: +total[0].total,
    page,
    limit,
    data: users,
  };
});

users.get("/runs/usage", checkAccess("users", "read"), async (ctx) => {
  const { projectId } = ctx.state;
  const days = ctx.query.days as string;

  const daysNum = days ? parseInt(days) : 1;

  const runsUsage = await sql`
      select
          run.external_user_id as user_id,
          run.name,
          run.type,
          coalesce(sum(run.completion_tokens), 0)::int as completion_tokens,
          coalesce(sum(run.prompt_tokens), 0)::int as prompt_tokens,
          coalesce(sum(run.cost), 0)::float as cost,
          sum(case when run.status = 'error' then 1 else 0 end)::int as errors,
          sum(case when run.status = 'success' then 1 else 0 end)::int as success
      from
          run
      where
          run.project_id = ${projectId as string}
          and run.created_at >= now() - interval '1 day' * ${daysNum}
          and (run.type != 'agent' or run.parent_run_id is null)
      group by
          run.external_user_id,
          run.name, 
          run.type
          `;

  ctx.body = runsUsage;
});

/**
 * @openapi
 * /api/v1/external-users/{id}:
 *   get:
 *     summary: Get a specific user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
users.get("/:id", checkAccess("users", "read"), async (ctx: Context) => {
  const { id } = ctx.params;
  const { projectId } = ctx.state;

  const [row] = await sql`
    select 
      * 
    from 
      external_user 
    where 
      id = ${id} 
      and project_id = ${projectId}
  `;

  ctx.body = row;
});

/**
 * @openapi
 * /api/v1/external-users/{id}:
 *   delete:
 *     summary: Delete a specific user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Successful deletion
 */
users.delete("/:id", checkAccess("users", "delete"), async (ctx: Context) => {
  const { id } = ctx.params;
  const { projectId } = ctx.state;

  await sql`
    delete 
    from external_user 
    where 
      id = ${id}
      and project_id = ${projectId}
    `;

  ctx.status = 204;
});

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         externalId:
 *           type: string
 *         lastSeen:
 *           type: string
 *           format: date-time
 *         props:
 *           type: object
 *         cost:
 *           type: number
 */

export default users;
