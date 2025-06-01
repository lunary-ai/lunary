import { Context, Next } from "koa";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import * as Sentry from "@sentry/bun";

export async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next();
    const status = ctx.status || 404;
    if (status === 404) {
      ctx.throw(404, "Not Found");
    }
  } catch (error: any) {
    if (error.status !== 404) {
      Sentry.captureException(error);
    }

    if (error instanceof z.ZodError) {
      ctx.status = 422;
      ctx.body = { error: "Error", message: fromZodError(error).toString() };
      console.error(ctx.path);
      console.error("ZOD ERROR", JSON.stringify(error.errors[0]));
      console.error(error);
      return;
    }

    console.error(ctx.path);
    console.error(error);

    ctx.status = error.statusCode || error.status || 500;
    ctx.body = { message: error.message || "An unexpected error occurred" };
  }
}

export class DuplicateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DupplicateError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project with id ${projectId} does not exist.`);
    this.name = "ProjectNotFoundError";
  }
}
