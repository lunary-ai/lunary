import { Next } from "koa";
import sql from "./db";
import Context from "./koa";
import { Action, ResourceName, hasAccess } from "shared";

export async function checkProjectAccess(projectId: string, userId: string) {
  const [{ exists: hasAccess }] = await sql`
      select exists (
        select 1 
        from account_project ap
        where ap.project_id = ${projectId} and ap.account_id = ${userId}
      )
  `;
  return hasAccess;
}

export function checkAccess(resourceName: ResourceName, action: Action) {
  return async (ctx: Context, next: Next) => {
    if (ctx.state.privateKey) {
      // give all rights to private key
      await next();
      return;
    }

    const [user] =
      await sql`select * from account where id = ${ctx.state.userId}`;

    const hasAccessToResource = hasAccess(user.role, resourceName, action);

    if (hasAccessToResource) {
      await next();
    } else {
      ctx.status = 403;
      ctx.body = {
        error: "Forbidden",
        message: "You don't have access to this resource",
      };
    }
  };
}
