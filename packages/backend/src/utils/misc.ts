import { Context, Next } from "koa"
import { z } from "zod"

export async function setDefaultBody(ctx: Context, next: Next) {
  await next()

  if (ctx.body === undefined && ctx.status >= 200 && ctx.status < 300) {
    ctx.body = {}
  }
}

export function unCamelObject(obj: any): any {
  const newObj: any = {}
  for (const key in obj) {
    newObj[key.replace(/([A-Z])/g, "_$1").toLowerCase()] = obj[key]
  }
  return newObj
}

export function validateUUID(string?: string) {
  if (!string) return false
  const uuidSchema = z.string().uuid()
  return uuidSchema.safeParse(string).success
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
