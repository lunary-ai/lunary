/*
 * Ingests events from the client SDKs and stores them in the DB.
 */

import { NextRequest } from "next/server"
import cors from "@/lib/api/cors"

import { Event, cleanEvent, ingestChatEvent } from "@/lib/ingest"
import { edgeWrapper } from "@/lib/api/edgeHelpers"
import { H } from "@highlight-run/next/server"
import { jsonResponse } from "@/lib/api/jsonResponse"
import sql from "@/lib/db"

export const runtime = "edge"

const registerRunEvent = async (
  event: Event,
  insertedIds: Set<string>,
  allowRetry = true,
): Promise<void> => {
  let {
    timestamp,
    type,
    app,
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
  } = event

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
      INSERT INTO app_user (external_id, last_seen, app, props)
      VALUES (${userId}, ${timestamp}, ${app}, ${sql.json(userProps)})
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
      SELECT user
      FROM run
      WHERE id = ${parentRunIdToUse}
    `

    if (!data) {
      // Could be that the parent run is not yet created
      // For example if the server-side event reached here before the frontend event, will throw foreign-key constraint error
      // So we retry once after 5s
      // A cleaner solution would be to use a queue, but this is simpler for now

      console.warn(`Error getting parent run user: ${error.message}`)

      if (allowRetry) {
        console.log(
          "Retrying insertion in 2s in case parent not inserted yet...",
        )

        await new Promise((resolve) => setTimeout(resolve, 2000))

        return await registerRunEvent(event, insertedIds, false)
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
        INSERT INTO run (
          type,
          id,
          user,
          created_at,
          app,
          tags,
          name,
          status,
          params,
          template_version_id,
          parent_run,
          input,
          runtime
        ) VALUES (
          ${type},
          ${runId},
          ${internalUserId},
          ${timestamp},
          ${app},
          ${tags},
          ${name},
          'started',
          ${sql.json(extra)},
          ${templateId},
          ${parentRunIdToUse},
          ${input},
          ${runtime}
        )
      `
      break
    case "end":
      await sql`
        UPDATE run
        SET
          ended_at = ${timestamp},
          output = ${output},
          status = 'success',
          prompt_tokens = ${tokensUsage?.prompt},
          completion_tokens = ${tokensUsage?.completion}
        WHERE id = ${runId}
      `
      break
    case "error":
      await sql`
        UPDATE run
        SET
          ended_at = ${timestamp},
          status = 'error',
          error = ${error}
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
      await ingestChatEvent({
        user: internalUserId,
        ...event,
      })
      break
  }

  insertedIds.add(runId)
}

const registerLogEvent = async (event: Event): Promise<void> => {
  const { event: eventName, app, parentRunId, message, extra } = event

  await sql`
    INSERT INTO log (run, app, level, message, extra)
    VALUES (${parentRunId}, ${app}, ${eventName}, ${message}, ${sql.json(
      extra || {},
    )})
  `
}

const registerEvent = async (
  event: Event,
  insertedIds: Set<string>,
): Promise<void> => {
  const { type } = event

  if (type === "log") {
    await registerLogEvent(event)
    return
  }

  await registerRunEvent(event, insertedIds)
}

export default edgeWrapper(async function handler(req: NextRequest) {
  // export default async function handler(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return cors(req, new Response(null, { status: 200 }))
  }

  const { events } = await req.json()

  // Use to check if parentRunId was already inserted
  const insertedIds = new Set<string>()

  if (!events) {
    console.error("Missing events payload.")
    return cors(req, new Response("Missing events payload.", { status: 400 }))
  }

  // Event processing order is important for foreign key constraints
  const sorted = (Array.isArray(events) ? events : [events]).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  const results: {
    id: string
    success: boolean
    error?: string
  }[] = []

  for (const event of sorted) {
    try {
      const cleanedEvent = await cleanEvent(event)

      await registerEvent(cleanedEvent, insertedIds)

      results.push({
        id: event.runId,
        success: true,
      })
    } catch (e: any) {
      console.error(`Error ingesting event: ${e.message}`, { error: e, event })

      H.consumeError(e)

      results.push({
        id: event.runId,
        success: false,
        error: e.message,
      })
    }
  }

  return cors(
    req,
    jsonResponse(200, {
      results,
    }),
  )
})
