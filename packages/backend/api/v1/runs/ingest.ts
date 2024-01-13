import sql from "@/utils/db"
import { Context } from "koa"
import Router from "koa-router"
import {
  CleanRun,
  Event,
  cleanEvent,
  clearUndefined,
  ingestChatEvent,
} from "@/utils/ingest"
import { verifySession } from "supertokens-node/recipe/session/framework/koa"

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

  let internalUserId
  // Only do on start event to save on DB calls and have correct lastSeen
  if (typeof userId === "string" && !["end", "error"].includes(eventName)) {
    const [result] = await sql`
      INSERT INTO app_user ${sql(
        clearUndefined({
          externalId: userId,
          lastSeen: timestamp,
          app: projectId,
          props: userProps,
        }),
      )}
      ON CONFLICT (external_id, app)
      DO UPDATE SET
        last_seen = EXCLUDED.last_seen,
        props = EXCLUDED.props
      RETURNING id
    `

    internalUserId = result?.id
  }

  if ("start" === eventName && parentRunIdToUse) {
    // Check if parent run exists

    const [data] = await sql`
      SELECT "user"
      FROM run
      WHERE id = ${parentRunIdToUse}
    `

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
    if (data?.user) {
      internalUserId = data?.user
    }
  }

  switch (eventName) {
    case "start":
      await sql`
        INSERT INTO run ${sql(
          clearUndefined({
            type,
            app: projectId,
            id: runId,
            user: internalUserId,
            createdAt: timestamp,
            tags,
            name,
            status: "started",
            params: extra,
            templateVersionId: templateId,
            parentRun: parentRunIdToUse,
            input,
            runtime,
          }),
        )}
      `

      break
    case "end":
      await sql`
        UPDATE run
        SET ${sql({
          endedAt: timestamp,
          output: output,
          status: "success",
          promptTokens: tokensUsage?.prompt,
          completionTokens: tokensUsage?.completion,
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
        user: internalUserId,
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
    INSERT INTO log (run, app, level, message, extra)
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

router.post(
  "/",
  verifySession({ sessionRequired: false }),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    console.log("ID", projectId)

    const { events } = ctx.request.body as {
      events: Event | Event[]
    }

    // Used to check if parentRunId was already inserted
    const insertedIds = new Set<string>()

    if (!events) {
      throw new Error("Missing events payload.")
    }

    // Event processing order is important for foreign key constraints
    const sorted = (Array.isArray(events) ? events : [events]).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )

    const results: {
      id?: string
      success: boolean
      error?: string
    }[] = []

    for (const event of sorted) {
      try {
        const cleanedEvent = await cleanEvent(event)
        console.log("Cleaned event", cleanedEvent)

        await registerEvent(projectId, cleanedEvent, insertedIds)

        results.push({
          id: event.runId,
          success: true,
        })
      } catch (e: any) {
        console.error(`Error ingesting event: ${e.message}`, {
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

    ctx.body = { results }
  },
)

export default router
