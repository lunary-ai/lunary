import { checkIngestionRule } from "@/src/checks/runChecks"
import { calcRunCost } from "@/src/utils/calcCost"
import sql from "@/src/utils/db"
import {
  CleanRun,
  Event,
  cleanEvent,
  clearUndefined,
  ingestChatEvent,
} from "@/src/utils/ingest"
import Context from "@/src/utils/koa"
import * as Sentry from "@sentry/node"
import Router from "koa-router"
import { z } from "zod"

const router = new Router()

async function registerRunEvent(
  projectId: string,
  event: CleanRun,
  insertedIds: Set<string>,
  allowRetry = true,
): Promise<void> {
  let {
    timestamp,
    type,
    userId,
    templateId,
    templateVersionId,
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
    params,
    error,
    feedback,
    metadata,
    runtime,
  } = event as CleanRun

  /* When using multiple LangChain callbacks for the same events, the project ID is associated with the event.
   * The projectId passed to this function is the public key, so it may not necessarily be the correct one for the current event.
   */
  projectId = event.appId || projectId

  if (!tags) {
    tags = metadata?.tags
  }

  if (!templateVersionId) {
    templateVersionId =
      templateId || metadata?.templateId || metadata?.templateVersionId
  }

  let parentRunIdToUse = parentRunId

  let externalUserId
  // Only do on start event to save on DB calls and have correct lastSeen
  if (typeof userId === "string" && !["end", "error"].includes(eventName)) {
    const [result] = await sql`
      insert into external_user ${sql(
        clearUndefined({
          externalId: userId,
          lastSeen: timestamp,
          projectId,
          props: userProps,
        }),
      )}
      on conflict (external_id, project_id)
      do update set
        last_seen = excluded.last_seen,
        props = excluded.props
      returning id
    `

    externalUserId = result?.id
  }

  if (eventName === "start" && parentRunIdToUse) {
    // Check if parent run exists in database
    const [data] =
      await sql`select external_user_id from run where id = ${parentRunIdToUse}`

    if (!data) {
      // Could be that the parent run is not yet created
      // For example if the server-side event reached here before the frontend event, will throw foreign-key constraint error
      // So we retry once after 2s
      // A cleaner solution would be to use a queue, but this is simpler for now
      console.warn(`Error getting parent run user.`)

      if (allowRetry) {
        console.log(
          "Retrying insertion in 2s in case parent not inserted yet...",
        )

        // TODO: better way to wait for parent run to be inserted
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

  if (eventName === "start") {
    await sql`
      insert into run ${sql(
        clearUndefined({
          type,
          projectId,
          id: runId,
          externalUserId,
          createdAt: timestamp,
          tags,
          name,
          status: "started",
          params: params || extra,
          metadata,
          templateVersionId,
          parentRunId: parentRunIdToUse,
          input,
          runtime,
        }),
      )}
    `
  } else if (eventName === "end") {
    let cost = undefined

    const [runData] = await sql`
        select created_at, input, params, name from run where id = ${runId}
      `
    if (typeof runData.metadata === "object") {
      metadata = { ...runData.metadata, metadata }
    }
    if (type === "llm") {
      cost = await calcRunCost({
        type,
        promptTokens: tokensUsage?.prompt,
        completionTokens: tokensUsage?.completion,
        name: runData?.name,
        duration: +timestamp - +runData?.createdAt,
        projectId,
      })
    }

    const runToInsert = {
      endedAt: timestamp,
      output: output,
      status: "success",
      promptTokens: tokensUsage?.prompt,
      completionTokens: tokensUsage?.completion,
      cost,
      metadata,
    }

    if (input) {
      // in the case of agent_context, the input is sent as the end
      runToInsert.input = input
    }

    await sql`
      update run
      set ${sql(runToInsert)}
      where id = ${runId}
    `
  } else if (eventName === "error") {
    await sql`
        update run
        set ${sql({
          endedAt: timestamp,
          status: "error",
          error: error,
        })}
        where id = ${runId}
      `
  } else if (eventName === "feedback") {
    const [feedbackData] = await sql`
      select feedback
      from run
      where id = ${runId}
    `

    await sql`
      update 
        run
      set 
        feedback = ${sql.json({
          ...((feedbackData?.feedback || {}) as any),
          ...feedback,
          ...extra, // legacy
        })}
      where 
        id = ${runId}
    `
  } else if (eventName === "chat") {
    await ingestChatEvent(projectId, {
      externalUserId,
      ...event,
    })
  } else if (eventName === "update" && type === "llm") {
    await sql`
      update 
        run
      set
        metadata = ${sql.json(metadata || {})}
      where 
        id = ${runId}
    `
  }

  insertedIds.add(runId)
}

async function registerLogEvent(
  projectId: string,
  event: Event,
): Promise<void> {
  const { event: eventName, parentRunId, message, extra, metadata } = event

  if (parentRunId === undefined || eventName === undefined) {
    throw new Error("parentRunId and eventName must be defined")
  }

  await sql`
    insert into log (run, project_id, level, message, extra)
    values (${parentRunId}, ${projectId}, ${eventName}, ${message}, ${sql.json(
      metadata || extra || {},
    )})
  `
}

async function registerEvent(
  projectId: string,
  event: Event,
  insertedIds: Set<string>,
): Promise<void> {
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

  const [ingestionRule] =
    await sql`select * from ingestion_rule where project_id = ${projectId} and type = 'filtering'`

  for (let event of sorted) {
    if (Array.isArray(event) && event.length === 1) {
      event = event[0]
    }
    try {
      const cleanedEvent = await cleanEvent(event)

      let passedIngestionRule = true

      if (ingestionRule) {
        passedIngestionRule = await checkIngestionRule(
          cleanedEvent,
          ingestionRule.filters,
        )
      }

      if (cleanedEvent.event === "end") {
        const [dbRun] =
          await sql`select * from run where id = ${cleanedEvent.runId}`
        if (dbRun.input === "__NOT_INGESTED__") {
          passedIngestionRule = false
        }
      }

      if (!passedIngestionRule) {
        cleanedEvent.input = "__NOT_INGESTED__"
        cleanedEvent.output = "__NOT_INGESTED__"
      }

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

  console.log(`Inserted ${insertedIds.size} run for project ${projectId}`)
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
