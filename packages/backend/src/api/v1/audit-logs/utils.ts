import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import { AuditLogAction, AuditLogResourceType, Project, User } from "shared";

export async function recordAuditLog<T extends AuditLogResourceType>(
  resourceType: T,
  action: AuditLogAction<T>,
  ctx: Context, // TODO: attach ipAddress and userAgent to ctx.state instead (+ entier user object), and pass the values directly to the function instead of using ctx
  resourceId?: string,
) {
  const { userId, orgId, projectId } = ctx.state;
  console.log(projectId);
  const ipAddress = ctx.request.ip;
  const userAgent = ctx.request.headers["user-agent"] || "";

  const [user] = await sql<User[]>`select * from account where id = ${userId}`;
  const [project] = await sql<
    Project[]
  >`select * from project where id = ${projectId}`;

  await sql`
    insert into audit_log 
      ${sql(
        clearUndefined({
          orgId,
          resourceType,
          resourceId,
          action,
          userId,
          userName: user?.name,
          userEmail: user?.email,
          projectId: project?.id,
          projectName: project?.name,
          ipAddress,
          userAgent,
        }),
      )}
  `;
}
