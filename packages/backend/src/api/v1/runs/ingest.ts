import { checkIngestionRule } from "@/src/checks/runChecks";
import { calcRunCost } from "@/src/utils/calcCost";
import sql from "@/src/utils/db";
import { DuplicateError, ProjectNotFoundError } from "@/src/utils/errors";
import {
  CleanRun,
  Event,
  cleanEvent,
  clearUndefined,
  ingestChatEvent,
} from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import * as Sentry from "@sentry/node";
import Router from "koa-router";
import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       description: Represents an event in the Lunary API for tracking LLM calls and related operations.
 *       properties:
 *         type:
 *           type: string
 *           enum: [llm, chain, agent, tool, log, embed, retriever, chat, convo, message, thread]
 *           description: The type of event being reported.
 *         event:
 *           type: string
 *           description: The specific event name (e.g., "start" or "end").
 *         level:
 *           type: string
 *           description: The logging level of the event.
 *         runId:
 *           type: string
 *           description: A unique identifier for the run.
 *         parentRunId:
 *           type: string
 *           description: The ID of the parent run, if applicable.
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: The time the event occurred.
 *         input:
 *           type: object
 *           description: The input data for the event, typically in OpenAI chat message format.
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags associated with the event.
 *         name:
 *           type: string
 *           description: The name of the event or model.
 *         output:
 *           type: object
 *           description: The output data from the event, typically in OpenAI chat message format.
 *         message:
 *           oneOf:
 *             - type: string
 *             - type: object
 *           description: A message associated with the event.
 *         extra:
 *           type: object
 *           description: Additional data such as temperature, max_tokens, tools, etc.
 *         feedback:
 *           type: object
 *           description: Feedback data for the event.
 *         templateId:
 *           type: string
 *           description: The ID of the template used, if applicable.
 *         templateVersionId:
 *           type: string
 *           description: The version ID of the template used, if applicable.
 *         metadata:
 *           type: object
 *           description: Additional metadata for the event.
 *         tokensUsage:
 *           type: object
 *           properties:
 *             prompt:
 *               type: number
 *               description: The number of tokens used in the prompt.
 *             completion:
 *               type: number
 *               description: The number of tokens used in the completion.
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               description: The error message, if an error occurred.
 *             stack:
 *               type: string
 *               description: The error stack trace, if available.
 *         appId:
 *           type: string
 *           description: The ID of the application or project.
 *       additionalProperties: true
 *       example:
 *         type: "llm"
 *         event: "start"
 *         runId: "some-unique-id"
 *         name: "gpt-4"
 *         timestamp: "2022-01-01T00:00:00Z"
 *         input: [{"role": "user", "content": "Hello world!"}]
 *         tags: ["tag1"]
 *         extra:
 *           temperature: 0.5
 *           max_tokens: 100
 *
 *     IngestResponse:
 *       type: object
 *       description: The response from the ingestion API.
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: The ID of the ingested event.
 *               success:
 *                 type: boolean
 *                 description: Indicates if the ingestion was successful.
 *               error:
 *                 type: string
 *                 description: Error message if the ingestion failed.
 *       example:
 *         results:
 *           - id: "some-unique-id"
 *             success: true
 */

const router = new Router();

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
  } = event as CleanRun;

  /* When using multiple LangChain callbacks for the same events, the project ID is associated with the event.
   * The projectId passed to this function is the public key, so it may not necessarily be the correct one for the current event.
   */
  const apiKey = event.appId;
  // console.log(apiKey, projectId);
  if (typeof apiKey === "string") {
    const [project] = await sql`
      select project_id from api_key where api_key = ${apiKey}
    `;

    if (project) {
      projectId = project.projectId;
    } else {
      // TODO: this is a temp fix because some projects are not associated with an API key
      const [project] = await sql`
        select id from project where id = ${apiKey}
      `;
      if (project) {
        projectId = project.id;
      }
    }
  }

  if (!tags) {
    tags = metadata?.tags;
  }

  if (!templateVersionId) {
    templateVersionId =
      templateId || metadata?.templateId || metadata?.templateVersionId;
  }

  let parentRunIdToUse = parentRunId;

  let externalUserId;
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
    `;

    externalUserId = result?.id;
  }

  if (eventName === "start" && parentRunIdToUse) {
    // Check if parent run exists in database
    const [data] =
      await sql`select external_user_id from run where id = ${parentRunIdToUse}`;

    if (!data) {
      // Could be that the parent run is not yet created
      // For example if the server-side event reached here before the frontend event, will throw foreign-key constraint error
      // So we retry once after 2s
      // A cleaner solution would be to use a queue, but this is simpler for now
      console.warn(`Error getting parent run user.`);

      if (allowRetry) {
        console.log(
          "Retrying insertion in 2s in case parent not inserted yet...",
        );

        // TODO: better way to wait for parent run to be inserted
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return await registerRunEvent(projectId, event, insertedIds, false);
      } else {
        // Prevent foreign key constraint error
        parentRunIdToUse = undefined;
      }
    }

    // This allow user id to correctly cascade to childs runs if for example it's set on the frontend and not passed to the backend
    if (data?.externalUserId) {
      externalUserId = data?.externalUserId;
    }
  }

  if (eventName === "start") {
    const [dbRun] = await sql`select * from run where id = ${runId}`;

    if (dbRun?.id === runId) {
      throw new DuplicateError(
        "Run with this ID already exists in the database.",
      );
    }

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
    `;
  } else if (eventName === "end") {
    let cost = undefined;

    const [runData] = await sql`
        select created_at, input, params, name, metadata from run where id = ${runId}
      `;
    if (typeof runData?.metadata === "object" && metadata) {
      metadata = { ...runData.metadata, ...metadata };
    }
    if (type === "llm") {
      cost = await calcRunCost({
        type,
        input: runData.input,
        output,
        promptTokens: tokensUsage?.prompt,
        completionTokens: tokensUsage?.completion,
        name: runData?.name,
        duration: +timestamp - +runData?.createdAt,
        projectId,
      });
    }

    if (typeof output === "boolean") {
      output = JSON.stringify(output);
    }

    const runToInsert = clearUndefined({
      endedAt: timestamp,
      output: output,
      status: "success",
      promptTokens: tokensUsage?.prompt,
      completionTokens: tokensUsage?.completion,
      cost,
      metadata,
    });
    if (!runToInsert.metadata) {
      delete runToInsert.metadata;
    }

    if (input) {
      // in the case of agent_context, the input is sent as the end
      runToInsert.input = input;
    }

    await sql`
      update run
      set ${sql(runToInsert)}
      where id = ${runId}
    `;
  } else if (eventName === "error") {
    await sql`
        update run
        set ${sql({
          endedAt: timestamp,
          status: "error",
          error: error,
        })}
        where id = ${runId}
      `;
  } else if (eventName === "feedback") {
    const [feedbackData] = await sql`
      select feedback
      from run
      where id = ${runId}
    `;

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
    `;
  } else if (eventName === "chat") {
    await ingestChatEvent(projectId, {
      externalUserId,
      ...event,
    });
  } else if (eventName === "update" && type === "llm") {
    await sql`
      update 
        run
      set
        metadata = ${sql.json(metadata || {})}
      where 
        id = ${runId}
    `;
  } else if (eventName === "custom-event") {
    // custom event
    const { externalUserId, parentRunId, threadTags, timestamp } = event;

    if (typeof parentRunId !== "string") {
      throw new Error("No parent run ID provided");
    }

    const [projectExists] =
      await sql`select exists(select 1 from project where id = ${projectId})`;
    if (!projectExists) {
      throw new ProjectNotFoundError(projectId);
    }

    const [thread] = await sql`
      insert into run ${sql(
        clearUndefined({
          id: parentRunId,
          type: "thread",
          projectId,
          externalUserId,
          tags: threadTags,
        }),
      )}
      on conflict (id)
      do update set
        external_user_id = excluded.external_user_id,
        tags = excluded.tags
      returning *
    `;

    await sql`insert into run ${sql({
      id: runId,
      createdAt: timestamp,
      endedAt: timestamp,
      type: "custom-event",
      name,
      projectId,
      parentRunId: thread.id,
      externalUserId,
      metadata,
    })}`;
  }

  insertedIds.add(runId);
}

async function registerLogEvent(
  projectId: string,
  event: Event,
): Promise<void> {
  const { event: eventName, parentRunId, message, extra, metadata } = event;

  if (parentRunId === undefined || eventName === undefined) {
    throw new Error("parentRunId and eventName must be defined");
  }

  await sql`
    insert into log (run, project_id, level, message, extra)
    values (${parentRunId}, ${projectId}, ${eventName}, ${message}, ${sql.json(
      metadata || extra || {},
    )})
  `;
}

async function registerEvent(
  projectId: string,
  event: Event,
  insertedIds: Set<string>,
): Promise<void> {
  const { type } = event;

  if (type === "log") {
    await registerLogEvent(projectId, event);
    return;
  }

  await registerRunEvent(projectId, event, insertedIds);
}

export async function processEventsIngestion(
  projectId: string,
  events: Event | Event[],
): Promise<{ id?: string; success: boolean; error?: string }[]> {
  // Used to check if parentRunId was already inserted
  const insertedIds = new Set<string>();

  // Event processing order is important for foreign key constraints
  const sorted = (Array.isArray(events) ? events : [events]).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const results: {
    id?: string;
    success: boolean;
    error?: string;
  }[] = [];

  const [ingestionRule] =
    await sql`select * from ingestion_rule where project_id = ${projectId} and type = 'filtering'`;

  for (let event of sorted) {
    if (Array.isArray(event) && event.length === 1) {
      event = event[0];
    }
    try {
      const cleanedEvent = await cleanEvent(event);

      let passedIngestionRule = true;

      if (ingestionRule) {
        passedIngestionRule = await checkIngestionRule(
          structuredClone(cleanedEvent),
          ingestionRule.filters,
        );
      }

      if (cleanedEvent.event === "end") {
        const [dbRun] =
          await sql`select * from run where id = ${cleanedEvent.runId || null}`;
        if (dbRun?.input === "__NOT_INGESTED__") {
          passedIngestionRule = false;
        }
      }

      if (!passedIngestionRule) {
        cleanedEvent.input = "__NOT_INGESTED__";
        cleanedEvent.output = "__NOT_INGESTED__";
      }

      await registerEvent(projectId, cleanedEvent, insertedIds);

      results.push({
        id: event.runId,
        success: true,
      });
    } catch (error: unknown) {
      if (
        !(error instanceof DuplicateError) &&
        !(error instanceof ProjectNotFoundError)
      ) {
        Sentry.withScope((scope) => {
          scope.setExtras({ event: JSON.stringify(event) });
          Sentry.captureException(error);
        });
      }

      console.error(`Error ingesting event`, {
        error: error,
        event,
      });

      results.push({
        id: event.runId,
        success: false,
        error: error.message,
      });
    }
  }

  console.log(`Inserted ${insertedIds.size} run for project ${projectId}`);
  return results;
}

/**
 * @openapi
 * /v1/runs/ingest:
 *   post:
 *     summary: Ingest run events
 *     description: |
 *       This endpoint is for reporting data from platforms not supported by our SDKs.
 *
 *       You can use either your project's Public or Private Key as the Bearer token in the Authorization header.
 *
 *       The expected body is an array of Event objects.
 *
 *       For LLM calls, you would first track a `start` event with the `input` data.
 *       Once your LLM call succeeds, you would need to send an `end` event to the API endpoint with the `output` data from the LLM call.
 *
 *       For a full step-by-step guide on sending LLM data to the Lunary API, see the [Custom Integration](/docs/integrations/custom) guide.
 *     tags: [Runs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               events:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/Event'
 *                   - type: array
 *                     items:
 *                       $ref: '#/components/schemas/Event'
 *           example:
 *             events:
 *               - type: "llm"
 *                 event: "start"
 *                 runId: "some-unique-id"
 *                 name: "gpt-4"
 *                 timestamp: "2022-01-01T00:00:00Z"
 *                 input: [{"role": "user", "content": "Hello world!"}]
 *                 tags: ["tag1"]
 *                 extra:
 *                   temperature: 0.5
 *                   max_tokens: 100
 *     responses:
 *       200:
 *         description: Successful ingestion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IngestResponse'
 *             example:
 *               results:
 *                 - id: "some-unique-id"
 *                   success: true
 *       401:
 *         description: Project does not exist
 *       402:
 *         description: Incorrect project id format
 */
router.post("/", async (ctx: Context) => {
  const { data: projectId, success } = z
    .string()
    .uuid()
    .safeParse(ctx.state.projectId);

  if (!success) {
    ctx.status = 402;
    ctx.body = { message: "Incorrect project id format" };
    return;
  }

  const [project] =
    await sql`select * from project where id = ${projectId} limit 1`;

  if (!project) {
    ctx.status = 401;
    ctx.body = { message: "This project does not exist" };
    return;
  }

  const { events } = ctx.request.body as {
    events: Event | Event[];
  };

  if (!events) {
    throw new Error("Missing events payload.");
  }

  const results = await processEventsIngestion(projectId, events);

  ctx.body = { results };
});

export default router;
