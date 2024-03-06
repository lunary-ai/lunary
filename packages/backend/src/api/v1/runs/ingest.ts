import sql from "@/src/utils/db"
import * as Sentry from "@sentry/node"
import Router from "koa-router"
import {
  CleanRun,
  Event,
  cleanEvent,
  clearUndefined,
  ingestChatEvent,
} from "@/src/utils/ingest"
import { calcRunCost } from "@/src/utils/calcCost"
import { z } from "zod"
import Context from "@/src/utils/koa"

const router = new Router()

const registerRunEvent = async (
  projectId: string,
  event: Event,
  insertedIds: Set<string>,
  allowRetry = true,
): Promise<void> => {
  let {
    timestamp,
    type,
    userId,
    templateId,
    userProps,
    event: eventName,
    runId,
    parentRunId,
    input,
    tags,
    output,
    name,
    tokensUsage,
    extra,
    error,
    feedback,
    metadata,
    runtime,
  } = event as CleanRun

  if (!tags) {
    tags = metadata?.tags
  }

  if (!templateId) {
    templateId = metadata?.templateId
  }

  let parentRunIdToUse = parentRunId

  let externalUserId
  // Only do on start event to save on DB calls and have correct lastSeen
  if (typeof userId === "string" && !["end", "error"].includes(eventName)) {
    const [result] = await sql`
      INSERT INTO external_user ${sql(
        clearUndefined({
          externalId: userId,
          lastSeen: timestamp,
          projectId,
          props: userProps,
        }),
      )}
      ON CONFLICT (external_id, project_id)
      DO UPDATE SET
        last_seen = EXCLUDED.last_seen,
        props = EXCLUDED.props
      RETURNING id
    `

    externalUserId = result?.id
  }

  if ("start" === eventName && parentRunIdToUse) {
    // Check if parent run exists

    const [data] =
      await sql`SELECT external_user_id FROM run WHERE id = ${parentRunIdToUse}`

    if (!data) {
      // Could be that the parent run is not yet created
      // For example if the server-side event reached here before the frontend event, will throw foreign-key constraint error
      // So we retry once after 5s
      // A cleaner solution would be to use a queue, but this is simpler for now

      console.warn(`Error getting parent run user.`)

      if (allowRetry) {
        console.log(
          "Retrying insertion in 2s in case parent not inserted yet...",
        )

        await new Promise((resolve) => setTimeout(resolve, 2000))

        return await registerRunEvent(projectId, event, insertedIds, false)
      } else {
        // Prevent foreign key constraint error
        parentRunIdToUse = undefined
      }
    }

    // This allow user id to correctly cascade to childs runs if for example it's set on the frontend and not passed to the backend
    if (data?.externalUserId) {
      externalUserId = data?.externalUserId
    }
  }

  switch (eventName) {
    case "start":
      await sql`
        INSERT INTO run ${sql(
          clearUndefined({
            type,
            projectId,
            id: runId,
            externalUserId,
            createdAt: timestamp,
            tags,
            name,
            status: "started",
            params: extra,
            templateVersionId: templateId,
            parentRunId: parentRunIdToUse,
            input,
            runtime,
          }),
        )}
      `

      break
    case "end":
      let cost = undefined

      if (type === "llm") {
        const [runData] = await sql`
          SELECT created_at, input, params, name FROM run WHERE id = ${runId}
        `
        cost = calcRunCost({
          type,
          promptTokens: tokensUsage?.prompt,
          completionTokens: tokensUsage?.completion,
          name: runData?.name,
          duration: +timestamp - +runData?.createdAt,
        })
      }

      await sql`
        UPDATE run
        SET ${sql({
          endedAt: timestamp,
          output: output,
          status: "success",
          promptTokens: tokensUsage?.prompt,
          completionTokens: tokensUsage?.completion,
          cost,
        })}
        WHERE id = ${runId}
      `
      break
    case "error":
      await sql`
        UPDATE run
        SET ${sql({
          endedAt: timestamp,
          status: "error",
          error: error,
        })}
        WHERE id = ${runId}
      `
      break
    case "feedback":
      const [feedbackData] = await sql`
        SELECT feedback
        FROM run
        WHERE id = ${runId}
      `

      await sql`
        UPDATE run
        SET feedback = ${sql.json({
          ...((feedbackData?.feedback || {}) as any),
          ...feedback,
          ...extra,
        })}
        WHERE id = ${runId}
      `
      break
    case "chat":
      await ingestChatEvent(projectId, {
        externalUserId,
        ...event,
      })
      break
  }

  insertedIds.add(runId)
}

const registerLogEvent = async (
  projectId: string,
  event: Event,
): Promise<void> => {
  const { event: eventName, parentRunId, message, extra } = event

  if (parentRunId === undefined || eventName === undefined) {
    throw new Error("parentRunId and eventName must be defined")
  }

  await sql`
    INSERT INTO log (run, project_id, level, message, extra)
    VALUES (${parentRunId}, ${projectId}, ${eventName}, ${message}, ${sql.json(
      extra || {},
    )})
  `
}

const registerEvent = async (
  projectId: string,
  event: Event,
  insertedIds: Set<string>,
): Promise<void> => {
  const { type } = event

  if (type === "log") {
    await registerLogEvent(projectId, event)
    return
  }

  await registerRunEvent(projectId, event, insertedIds)
}

export async function processEventsIngestion(
  projectId: string,
  events: Event | Event[],
): Promise<{ id?: string; success: boolean; error?: string }[]> {
  // Used to check if parentRunId was already inserted
  const insertedIds = new Set<string>()

  // Event processing order is important for foreign key constraints
  const sorted = (Array.isArray(events) ? events : [events]).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  const results: {
    id?: string
    success: boolean
    error?: string
  }[] = []

  for (let event of sorted) {
    if (Array.isArray(event) && event.length === 1) {
      event = event[0]
    }
    try {
      const cleanedEvent = await cleanEvent(event)

      await registerEvent(projectId, cleanedEvent, insertedIds)

      results.push({
        id: event.runId,
        success: true,
      })
    } catch (e: any) {
      Sentry.withScope((scope) => {
        scope.setExtras({ event: JSON.stringify(event) })
        Sentry.captureException(e)
      })
      console.error(`Error ingesting event`, {
        error: e,
        event,
      })

      results.push({
        id: event.runId,
        success: false,
        error: e.message,
      })
    }
  }

  console.log("Inserted", insertedIds.size, "runs")
  return results
}

router.post("/", async (ctx: Context) => {
  const result = z.string().uuid().safeParse(ctx.state.projectId)
  if (!result.success) {
    ctx.status = 402
    ctx.body = { message: "Incorrect project id format" }
    return
  }

  const projectId = result.data
  const [project] =
    await sql`select * from project where id = ${projectId} limit 1`

  if (!project) {
    ctx.status = 401
    ctx.body = { message: "This project does not exist" }
    return
  }

  const { events } = ctx.request.body as {
    events: Event | Event[]
  }

  if (!events) {
    throw new Error("Missing events payload.")
  }

  const results = await processEventsIngestion(projectId, events)

  ctx.body = { results }
})

export default router
