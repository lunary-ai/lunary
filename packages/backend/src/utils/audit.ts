import sql from "./db";
import { Context } from "./koa";

/**
 * Log a user action in the audit log
 * @param ctx Koa context containing user info
 * @param action The action being performed (e.g., 'create', 'update', 'delete')
 * @param resourceType Type of resource being acted upon (e.g., 'user', 'project', 'template')
 * @param resourceId ID of the resource being acted upon
 * @param projectId Optional project ID for project-scoped actions
 * @param projectName Optional project name for project-scoped actions
 */
export async function logAction(
  ctx: Context, 
  action: string, 
  resourceType: string,
  resourceId: string,
  projectId?: string,
  projectName?: string
) {
  try {
    const userId = ctx.state.userId;
    const orgId = ctx.state.orgId;
    
    // Extract IP address and user agent
    const ipAddress = ctx.request.ip;
    const userAgent = ctx.request.headers["user-agent"] || "";
    
    // Get user information to store in the audit log
    const [user] = await sql`
      SELECT name, email FROM account WHERE id = ${userId}
    `;
    
    // If project ID is provided but not project name, fetch the project name
    if (projectId && !projectName) {
      const [project] = await sql`
        SELECT name FROM project WHERE id = ${projectId}
      `;
      projectName = project?.name;
    }
    
    await sql`
      INSERT INTO audit_log (
        user_id, user_name, user_email, org_id, project_id, project_name, 
        action, resource_type, resource_id, ip_address, user_agent
      ) VALUES (
        ${userId}, ${user.name}, ${user.email}, ${orgId}, 
        ${projectId || null}, ${projectName || null}, 
        ${action}, ${resourceType}, ${resourceId}, ${ipAddress}, ${userAgent}
      )
    `;
  } catch (error) {
    // Log error but don't disrupt the main operation
    console.error("Failed to log audit action:", error);
  }
}

/**
 * Middleware to log actions after they're completed successfully
 */
export function createAuditMiddleware(
  action: string, 
  resourceType: string, 
  getResourceId: (ctx: Context) => string, 
  getProjectInfo?: (ctx: Context) => { id?: string, name?: string } | undefined
) {
  return async (ctx: Context, next: () => Promise<void>) => {
    // Call the next middleware/handler first
    await next();
    
    // Only log successful operations (status 2xx)
    if (ctx.status >= 200 && ctx.status < 300) {
      const resourceId = getResourceId(ctx);
      const projectInfo = getProjectInfo ? getProjectInfo(ctx) : undefined;
      
      await logAction(
        ctx, 
        action, 
        resourceType, 
        resourceId, 
        projectInfo?.id, 
        projectInfo?.name
      );
    }
  };
}