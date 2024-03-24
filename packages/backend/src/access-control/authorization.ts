import { Next } from "koa"
import Context from "../utils/koa"
import { roles } from "./roles"

type PermissionType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "list"
  | "export"

// TODO: change the whole thing. A user as a field projectRoles, so it's better for modularity later
// TODO: attach to user its projectRoles
export function authorize(resource: string, permission: PermissionType) {
  return async (ctx: Context, next: Next) => {
    const projectId = ctx.params.projectId
    const projectRole = ctx.state.user.projectRoles.find(
      (pr) => pr.projectId === projectId,
    )

    if (!projectRole) {
      ctx.throw(403, "Forbidden: No access to the project")
    }

    const hasPermission = projectRole.roles.some((role) => {
      const rolePermissions = roles[role]?.permissions
      return rolePermissions && rolePermissions[resource]?.[permission]
    })

    if (!hasPermission) {
      ctx.throw(403, "Forbidden: Insufficient permissions")
    }

    await next()
  }
}
