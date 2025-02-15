import { completeRunUsageWithTimeout } from "./countToken";
import sql from "./db";
import { ProjectNotFoundError } from "./errors";

export interface Event {
  type:
    | "llm"
    | "chain"
    | "agent"
    | "tool"
    | "log"
    | "embed" // todo: actual support
    | "retriever" // todo: actual support
    | "chat" // deprecated
    | "convo" // deprecated
    | "message"
    | "thread";
  event?: string;
  level?: string;
  runId?: string;
  parentRunId?: string;
  // convo?: string
  timestamp: string;
  input?: any;
  tags?: string[];
  name?: string;
  output?: any;
  message?: string | any; // deprecated (for logs)
  extra?: any;
  feedback?: any;
  templateId?: string; // deprecated, use templateVersionId
  templateVersionId?: string;
  metadata?: any;
  tokensUsage?: {
    prompt: number;
    completion: number;
  };
  error?: {
    message: string;
    stack?: string;
  };
  appId?: string;
  [key: string]: unknown;
}

export interface CleanRun extends Event {
  runId: string;
  event: string;
}

export const uuidFromSeed = async (seed: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (
    hashHex.substring(0, 8) +
    "-" +
    hashHex.substring(8, 12) +
    "-" +
    "4" +
    hashHex.substring(13, 16) +
    "-a" +
    hashHex.substring(17, 20) +
    "-" +
    hashHex.substring(20, 32)
  );
};

/* Enabled the user to use any string as run ids.
 * Useful for example for interop with Vercel'AI SDK as they use their own run ids format.
 * This function will convert any string to a valid UUID.
 */
export const ensureIsUUID = async (id: string): Promise<string | undefined> => {
  if (typeof id !== "string") return undefined;
  if (!id || id.length === 36)
    return id; // TODO: better UUID check
  else return await uuidFromSeed(id);
};

// Converts snake_case to camelCase
// I found some (probably unintended) snake_case props in the tracer events, so normalize everything
const recursiveToCamel = (item: any): any => {
  if (Array.isArray(item)) {
    return item.map((el: unknown) => recursiveToCamel(el));
  } else if (typeof item === "function" || item !== Object(item)) {
    return item;
  }
  return Object.fromEntries(
    Object.entries(item as Record<string, unknown>).map(
      ([key, value]: [string, unknown]) => [
        key.replace(/([-_][a-z])/gi, (c) =>
          c.toUpperCase().replace(/[-_]/g, ""),
        ),
        recursiveToCamel(value),
      ],
    ),
  );
};

// keep only 1st level string,int,boolean and array of those
function cleanMetadata(object: any) {
  if (!object) return undefined;

  const validTypes = ["string", "number", "boolean"];

  return Object.fromEntries(
    Object.entries(object).filter(([key, value]) => {
      if (key === "enrichment") return true;
      if (validTypes.includes(typeof value)) return true;
      if (Array.isArray(value)) {
        return value.every((v) => validTypes.includes(typeof v));
      }
      return false;
    }),
  );
}

export async function cleanEvent(event: any): Promise<Event> {
  const { timestamp, runId, parentRunId, tags, name, ...rest } =
    recursiveToCamel(event);

  let isoTimestamp;
  try {
    isoTimestamp = new Date(timestamp).toISOString();
  } catch (error) {
    console.error("Couldn't parse timestamp");
    console.error(event);
  }

  const cleanedRun = {
    ...rest,
    metadata: cleanMetadata(rest.metadata),
    name: typeof name === "string" ? name.replace("models/", "") : undefined,
    tags: typeof tags === "string" ? [tags] : tags,
    runId: await ensureIsUUID(runId),
    parentRunId: await ensureIsUUID(parentRunId),
    timestamp: isoTimestamp,
  };

  // Do it after because we need the sanitized runId/parentRunId
  try {
    cleanedRun.tokensUsage = await completeRunUsageWithTimeout(cleanedRun);
  } catch (error) {
    console.error("Error completing run usage");
    console.error(error);
  }

  return cleanedRun;
}

export const clearUndefined = (obj: any): any =>
  Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

export async function ingestChatEvent(
  projectId: string,
  run: Event,
): Promise<void> {
  // create parent thread run if it doesn't exist
  const {
    runId: id,
    externalUserId,
    parentRunId,
    feedback,
    threadTags,
    timestamp,
  } = run;

  const { role, isRetry, tags, content, extra, metadata } = run.message as any;

  const coreMessage = clearUndefined({
    role,
    content,
    metadata: metadata || extra,
  });

  if (typeof parentRunId !== "string") {
    throw new Error("No parent run ID provided");
  }

  const [projectExists] =
    await sql`select exists(select 1 from project where id = ${projectId})`;
  if (!projectExists) {
    throw new ProjectNotFoundError(projectId);
  }

  const [result] = await sql`
    insert into run ${sql(
      clearUndefined({
        id: parentRunId,
        type: "thread",
        projectId,
        externalUserId,
        input: coreMessage,
      }),
    )}
    on conflict (id)
    do update set 
      external_user_id = excluded.external_user_id,
      input = excluded.input
    returning *
  `;

  if (Array.isArray(threadTags)) {
    const tags = threadTags.map((tag: string) => ({ tag, runId: result.id }));
    await sql`insert into run_tag ${sql(tags)} on conflict do update set tag = excluded.tag`;
  }

  if (!result) {
    throw new Error("Error upserting run");
  }

  // Reconciliate messages with runs
  //
  // 1 run can store 1 exchange ([system, user] -> [bot, tool])
  //
  // if previousRun and not retry_of
  //     if this is bot message, then append to previous output's array
  //     if this is user message:
  //         if previous run output has bot then create new run and add to input array
  //         if previous run is user, then append to previous input array
  // else if retry_of
  //     copy previousRun data into new run with new id, set `sibling_of` to previousRun, clear output, then:
  //        if bot message: set output with [message]
  //        if user message: also replace input with [message]
  // else
  //     create new run with either input or output depending on role
  // note; in any case, update the ID to the latest received
  // check if previous run exists. for that, look at the last run of the thread
  const [previousRun] = await sql`
    SELECT * FROM run
    WHERE parent_run_id = ${parentRunId!}
    ORDER BY created_at DESC
    LIMIT 1`;

  const OUTPUT_TYPES = ["assistant", "tool", "bot"];
  const INPUT_TYPES = ["user", "system"]; // system is mostly used for giving context about the user

  const shared = clearUndefined({
    id,
    projectId,
    metadata: metadata || extra,
    externalUserId,
    feedback,
  });

  let update: any = {}; // todo: type
  let operation = "insert";

  if (previousRun) {
    // Those are computed columns, so we need to remove them
    delete previousRun.duration;

    if (isRetry) {
      // copy previousRun data into new run with new id, set `sibling_of` to previousRun, clear output, then:
      // if bot message: set output with [message]
      // if user message: also replace input with [message]
      update = {
        ...previousRun,
        siblingRunId: previousRun.id,
        feedback: run.feedback || null, // reset feedback if retry
        output: OUTPUT_TYPES.includes(role) ? [coreMessage] : null,
        input: INPUT_TYPES.includes(role) ? [coreMessage] : previousRun.input,
      };

      delete update.id; // remove id to force using new one

      operation = "insert";
    } else if (previousRun.type === "custom-event") {
      operation = "insert";

      if (OUTPUT_TYPES.includes(role)) {
        update.output = [coreMessage];
      } else if (INPUT_TYPES.includes(role)) {
        update.input = [coreMessage];
      }
    } else if (OUTPUT_TYPES.includes(role)) {
      // append coreMessage to output (if if was an array, otherwise create an array)
      update.output = [...(previousRun.output || []), coreMessage];

      operation = "update";
    } else if (INPUT_TYPES.includes(role)) {
      if (previousRun.output) {
        // if last is bot message, create new run with input array
        update.input = [coreMessage];
        operation = "insert";
      } else {
        // append coreMessage to input (if if was an array, otherwise create an array)
        update.input = [...(previousRun.input || []), coreMessage];

        operation = "update";
      }
    }
  } else {
    // create new run with either input or output depending on role
    if (OUTPUT_TYPES.includes(role)) {
      update.output = [coreMessage];
    } else if (INPUT_TYPES.includes(role)) {
      update.input = [coreMessage];
    }
    operation = "insert";
  }

  if (operation === "insert") {
    update.type = "chat";
    update.createdAt = timestamp;
    update.endedAt = timestamp;
    update.parentRunId = run.parentRunId;

    const [run] = await sql`
      INSERT INTO run ${sql({ ...shared, ...update })} returning *
    `;

    if (Array.isArray(tags)) {
      const runTags = tags.map((tag: string) => ({ tag, runId: run.id }));
      await sql`insert into run_tag ${sql(runTags)} on conflict do update set tag = excluded.tag`;
    }
  } else if (operation === "update") {
    update.endedAt = timestamp;

    await sql`
      UPDATE run SET ${sql({ ...shared, ...update })} WHERE id = ${previousRun.id}
    `;

    if (Array.isArray(tags)) {
      const runTags = tags.map((tag: string) => ({
        tag,
        runId: previousRun.id,
      }));
      await sql`insert into run_tag ${sql(runTags)} on conflict do update set tag = excluded.tag`;
    }
  }
}
