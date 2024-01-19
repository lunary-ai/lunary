import { Context } from "koa"
import Router from "koa-router"
import { processEventsIngestion } from "./runs/ingest"
import { Event } from "@/utils/ingest"

const redirections = new Router()

// LEGACY ROUTE FOR EVENT INGESTION
redirections.post("/api/report", async (ctx: Context) => {
  const { events } = ctx.request.body as {
    events: Event | Event[]
  }

  const projectId = events[0]?.projectId || events[0].app

  const result = await processEventsIngestion(projectId, events)

  ctx.body = result
})

export default redirections
