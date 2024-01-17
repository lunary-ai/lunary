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
import { calcRunCost } from "@/utils/calcCost"
import { completeRunUsage } from "@/utils/countToken"

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

  console.log(tokensUsage)

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
      externalUserId = data?.user
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
        externalUserId,
        ...event,
      })
      break
  }

  // TODO: c'est dégueulasse
  try {
    let [run] = await sql`select * from run where id = ${runId}`

    //handle case where streaming output is not consumed
    const tokenUsage = await completeRunUsage(run)

    if (!run.promptTokens) {
      run.promptTokens = tokenUsage.prompt
    }

    const cost = calcRunCost(run)

    const updatedRun = {
      ...run,
      cost,
      promptTokens: tokenUsage.prompt,
    }
    console.log(cost)
    await sql`
      update run
      set 
        cost = ${updatedRun.cost}::float8, 
        prompt_tokens = ${updatedRun.promptTokens}
      where id = ${run.id}
    `
  } catch (error) {
    console.error(error)
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

router.post("/", async (ctx: Context) => {
  const projectId = ctx.request.query?.projectId as string

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
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  const results: {
    id?: string
    success: boolean
    error?: string
  }[] = []

  for (const event of sorted) {
    try {
      const cleanedEvent = await cleanEvent(event)

      await registerEvent(projectId, cleanedEvent, insertedIds)

      results.push({
        id: event.runId,
        success: true,
      })
    } catch (e: any) {
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

  ctx.body = { results }
})

export default router
