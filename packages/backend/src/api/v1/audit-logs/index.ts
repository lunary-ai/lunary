import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { hasAccess } from "shared";
import { z } from "zod";

const auditLogs = new Router({ prefix: "/audit-logs" });

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: Retrieve audit logs
 *     security:
 *       - BearerAuth: []
 *     tags: [Audit Logs]
 *     description: Retrieve a list of audit logs for the current organization. Note that this functionality is still under development and the audits logs are not fully exhaustive.
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: Number of audit logs to retrieve
 *         schema:
 *           type: number
 *           default: 30
 *       - in: query
 *         name: page
 *         description: Page number for pagination
 *         schema:
 *           type: number
 *           default: 0
 *     responses:
 *       200:
 *         description: A list of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       403:
 *         description: Forbidden - user doesn't have access to this resource
 */
auditLogs.get("/", checkAccess("auditLogs", "list"), async (ctx: Context) => {
  const { userId, orgId } = ctx.state;

  const { limit, page } = z
    .object({
      limit: z.coerce.number().default(30),
      page: z.coerce.number().default(0),
    })
    .parse(ctx.query);

  const logs = await sql`
    select
      *
    from
      audit_log
    where
      org_id = ${orgId}
    order by
      created_at desc
    limit 
      ${limit}
    offset 
      ${page * limit}
  `;

  ctx.body = logs;
});

export default auditLogs;
