import { Context } from "koa"
import Router from "koa-router"
import { processEventsIngestion } from "./runs/ingest"
import { Event } from "@/src/utils/ingest"
import { z } from "zod"
import sql from "@/src/utils/db"

const redirections = new Router()

// LEGACY ROUTE FOR EVENT INGESTION
redirections.post("/api/report", async (ctx: Context) => {
  const { events } = ctx.request.body as {
    events: Event | Event[]
  }

  const projectId = events[0]?.projectId || events[0].app

  const parsedProjectId = z.string().uuid().safeParse(projectId)
  if (!parsedProjectId.success) {
    ctx.status = 402
    ctx.body = { message: "Incorrect project id format" }
    return
  }

  const validatedProjectId = parsedProjectId.data
  const [project] =
    await sql`select * from project where id = ${validatedProjectId} limit 1`
  console.log(project)

  if (!project) {
    ctx.status = 401
    ctx.body = { message: "This project does not exist" }
    return
  }

  const result = await processEventsIngestion(projectId, events)

  ctx.body = result
})

// LEGACY TEMPLATE ROUTE
redirections.get("/api/v1/template", async (ctx: Context) => {
  const { slug, app_id } = ctx.request.query as {
    slug: string
    app_id: string
  }

  // For some reasons redirects don't work with the JS SDK
  // So we need to fetch the latest template version here

  const latestTemplateVersion = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/template_versions/latest?slug=${slug}`,
    {
      headers: {
        Authorization: `Bearer ${app_id}`,
      },
    },
  ).then((res) => res.json())

  ctx.body = latestTemplateVersion
})

export default redirections
