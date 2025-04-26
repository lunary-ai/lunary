import { Next } from "koa";
import Context from "./koa";
import { createMiddleware } from "./middleware";

async function parseProtobuf(ctx: Context, next: Next) {
  if (ctx.is("application/x-protobuf")) {
    const chunks: Buffer[] = [];
    for await (const chunk of ctx.req) {
      chunks.push(chunk as Buffer);
    }
    ctx.request.body = Buffer.concat(chunks);
  }
  return next();
}

export const protobufMiddleware = createMiddleware(parseProtobuf);
