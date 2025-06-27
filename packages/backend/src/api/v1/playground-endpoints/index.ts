import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";
import { encryptAuth, decryptAuth } from "./utils";

const playgroundEndpoints = new Router({
  prefix: "/playground-endpoints",
});

// Validation schemas
const createEndpointSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  auth: z
    .union([
      z.object({
        type: z.literal("bearer"),
        token: z.string(),
      }),
      z.object({
        type: z.literal("api_key"),
        header: z.string(),
        key: z.string(),
      }),
      z.object({
        type: z.literal("basic"),
        username: z.string(),
        password: z.string(),
      }),
    ])
    .nullable()
    .optional(),
  headers: z.record(z.string()).default({}),
  defaultPayload: z.record(z.any()).default({}),
});

const updateEndpointSchema = createEndpointSchema.partial();

/**
 * @openapi
 * /v1/playground-endpoints:
 *   get:
 *     summary: List all playground endpoints
 *     description: Get all playground endpoints for the current project
 *     tags: [Playground Endpoints]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PlaygroundEndpoint'
 */
playgroundEndpoints.get(
  "/",
  checkAccess("prompts", "read"),
  async (ctx: Context) => {
    const endpoints = await sql`
    select 
      id,
      name,
      url,
      auth,
      headers,
      default_payload,
      created_at,
      updated_at
    from 
      playground_endpoint
    where 
      project_id = ${ctx.state.projectId}
    order by 
      created_at desc
  `;

    // Decrypt auth data for response
    ctx.body = endpoints.map((endpoint) => ({
      ...endpoint,
      auth: decryptAuth(endpoint.auth),
    }));
  },
);

/**
 * @openapi
 * /v1/playground-endpoints/{id}:
 *   get:
 *     summary: Get a playground endpoint
 *     description: Get a specific playground endpoint by ID
 *     tags: [Playground Endpoints]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlaygroundEndpoint'
 *       404:
 *         description: Endpoint not found
 */
playgroundEndpoints.get(
  "/:id",
  checkAccess("prompts", "read"),
  async (ctx: Context) => {
    const { id } = ctx.params;

    const [endpoint] = await sql`
    select 
      id,
      name,
      url,
      auth,
      headers,
      default_payload,
      created_at,
      updated_at
    from 
      playground_endpoint
    where 
      id = ${id}
      and project_id = ${ctx.state.projectId}
  `;

    if (!endpoint) {
      ctx.throw(404, "Endpoint not found");
    }

    // Decrypt auth data for response
    ctx.body = {
      ...endpoint,
      auth: decryptAuth(endpoint.auth),
    };
  },
);

/**
 * @openapi
 * /v1/playground-endpoints:
 *   post:
 *     summary: Create a playground endpoint
 *     description: Create a new playground endpoint
 *     tags: [Playground Endpoints]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlaygroundEndpoint'
 *     responses:
 *       201:
 *         description: Endpoint created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlaygroundEndpoint'
 */
playgroundEndpoints.post(
  "/",
  checkAccess("prompts", "create"),
  async (ctx: Context) => {
    const body = createEndpointSchema.parse(ctx.request.body);

    // Encrypt sensitive auth data before storing
    const encryptedAuth = encryptAuth(body.auth);

    const [endpoint] = await sql`
    insert into playground_endpoint (
      project_id,
      name,
      url,
      auth,
      headers,
      default_payload
    ) values (
      ${ctx.state.projectId},
      ${body.name},
      ${body.url},
      ${encryptedAuth}::jsonb,
      ${body.headers}::jsonb,
      ${body.defaultPayload}::jsonb
    )
    returning *
  `;

    ctx.status = 201;
    ctx.body = {
      ...endpoint,
      auth: body.auth,
    };
  },
);

/**
 * @openapi
 * /v1/playground-endpoints/{id}:
 *   put:
 *     summary: Update a playground endpoint
 *     description: Update an existing playground endpoint
 *     tags: [Playground Endpoints]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePlaygroundEndpoint'
 *     responses:
 *       200:
 *         description: Endpoint updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlaygroundEndpoint'
 *       404:
 *         description: Endpoint not found
 */
playgroundEndpoints.put(
  "/:id",
  checkAccess("prompts", "update"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const body = updateEndpointSchema.parse(ctx.request.body);

    // Check if endpoint exists
    const [existing] = await sql`
    select id from playground_endpoint 
    where id = ${id} and project_id = ${ctx.state.projectId}
  `;

    if (!existing) {
      ctx.throw(404, "Endpoint not found");
    }

    // Build update query dynamically
    const updates: any = {
      updated_at: sql`now()`,
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.url !== undefined) updates.url = body.url;
    if (body.auth !== undefined)
      updates.auth = sql`${encryptAuth(body.auth)}::jsonb`;
    if (body.headers !== undefined)
      updates.headers = sql`${body.headers}::jsonb`;
    if (body.defaultPayload !== undefined)
      updates.default_payload = sql`${body.defaultPayload}::jsonb`;

    const [endpoint] = await sql`
    update playground_endpoint
    set ${sql(updates)}
    where id = ${id} and project_id = ${ctx.state.projectId}
    returning *
  `;

    // Return with decrypted auth
    ctx.body = {
      ...endpoint,
      auth: decryptAuth(endpoint.auth),
    };
  },
);

/**
 * @openapi
 * /v1/playground-endpoints/{id}:
 *   delete:
 *     summary: Delete a playground endpoint
 *     description: Delete a playground endpoint
 *     tags: [Playground Endpoints]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Endpoint deleted successfully
 *       404:
 *         description: Endpoint not found
 */
playgroundEndpoints.delete(
  "/:id",
  checkAccess("prompts", "delete"),
  async (ctx: Context) => {
    const { id } = ctx.params;

    const result = await sql`
    delete from playground_endpoint
    where id = ${id} and project_id = ${ctx.state.projectId}
  `;

    if (result.count === 0) {
      ctx.throw(404, "Endpoint not found");
    }

    ctx.status = 204;
  },
);

export default playgroundEndpoints;
