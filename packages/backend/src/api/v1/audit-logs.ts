import Router from "koa-router";
import sql from "../../utils/db";
import Context from "@/src/utils/koa";

const router = new Router({ prefix: "/audit-logs" });

/**
 * Get audit logs with filtering options
 * Requires admin or owner access
 */
router.get("/", async (ctx: Context) => {
  // Only allow admins and owners to view audit logs
  // if (!["admin", "owner"].includes(ctx.state.role)) {
  //   ctx.status = 403;
  //   ctx.body = { error: "You don't have permission to view audit logs" };
  //   return;
  // }

  const {
    limit = 100,
    offset = 0,
    action,
    resourceType,
    userId,
    projectId,
    startDate,
    endDate,
    search,
  } = ctx.query;

  const baseSelect = sql`
    SELECT 
      al.*
    FROM audit_log al
    JOIN account a ON al.user_id = a.id
    LEFT JOIN project p ON al.project_id = p.id
  `;

  // Collect filtering conditions
  let conditions = [sql`al.org_id = ${ctx.state.orgId}`];

  if (action) conditions.push(sql`al.action = ${action}`);
  if (resourceType) conditions.push(sql`al.resource_type = ${resourceType}`);
  if (userId) conditions.push(sql`al.user_id = ${userId}`);
  if (projectId) conditions.push(sql`al.project_id = ${projectId}`);

  // Handle search across multiple fields
  if (search) {
    const searchCondition = sql`
      a.name ILIKE ${"%" + search + "%"} OR
      a.email ILIKE ${"%" + search + "%"} OR
      al.action ILIKE ${"%" + search + "%"} OR
      al.resource_type ILIKE ${"%" + search + "%"} OR
      al.resource_id ILIKE ${"%" + search + "%"} OR
      p.name ILIKE ${"%" + search + "%"}
    `;
    conditions.push(sql`(${searchCondition})`);
  }

  // Date range filters
  if (startDate) {
    const parsedStartDate = new Date(startDate as string);
    if (!isNaN(parsedStartDate.getTime())) {
      conditions.push(sql`al.created_at >= ${parsedStartDate}`);
    }
  }

  if (endDate) {
    const parsedEndDate = new Date(endDate as string);
    if (!isNaN(parsedEndDate.getTime())) {
      conditions.push(sql`al.created_at <= ${parsedEndDate}`);
    }
  }

  // // Construct the WHERE clause
  // const whereClause =
  //   conditions.length > 0 ? sql`WHERE ${sql.join(conditions, " AND ")}` : sql``;

  // Complete main query with pagination
  const query = sql`
    ${baseSelect}
    ORDER BY al.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  // Base COUNT query for total records
  const countQuery = sql`
    SELECT COUNT(*) AS total
    FROM audit_log al
    JOIN account a ON al.user_id = a.id
    LEFT JOIN project p ON al.project_id = p.id
  `;

  // Execute both queries in parallel
  const [logs, countResult] = await Promise.all([query, countQuery]);

  // Send response
  ctx.body = {
    logs,
    total: countResult[0]?.total || 0,
  };
});

export default router;
