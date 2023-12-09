import { NextApiRequest, NextApiResponse } from "next"
import postgres from "postgres"
import { z } from "zod"
import { apiWrapper } from "@/lib/api/helpers"
import { ensureIsUUID } from "@/lib/ingest"

const sql = postgres(process.env.DB_URI, { transform: postgres.camel })

const querySchema = z.object({
  appId: z.string(),
  threadId: z.string().transform(async (id) => await ensureIsUUID(id)),
  userId: z.optional(z.string()),
  messages: z.array(
    z.object({
      id: z
        .optional(z.string())
        .transform(async (id) =>
          id ? await ensureIsUUID(id) : crypto.randomUUID(),
        ),
      role: z.string(),
      text: z.optional(z.string()),
      timestamp: z.optional(z.date()),
      extra: z.optional(z.any()),
      feedback: z.optional(z.any()),
    }),
  ),
})

export default apiWrapper(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // make sure it's POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const { messages, appId, threadId, userId } = await querySchema.parseAsync(
    req.body,
  )

  for (const message of messages) {
    await sql`insert into run (id, type, user) values (${threadId}, 'thread') on conflict do nothing returning *`

    // const isEnd = message.role === "bot"

    const existingRun = await sql`select * from run where id = ${message.id}`

    // if there is already run w/ ID:
    //   if this is bot message, then append to previous output's array
    //     if this is user message:
    //     if previous run output has bot then create new run and add to input array
    //   if previous run is user and this is user, then append to previous input array
    // else
    //   create new run with either input or output depending on role
  }

  // insert threadId as a new run if it doesn't exist

  res.status(200).json({})
})
