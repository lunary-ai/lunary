/*
 * This minimal websocket server ingests events from the client SDKs and stores them in the DB.
 */

import { Application, Router } from "https://deno.land/x/oak@v12.4.0/mod.ts"
import supabase from "../lib/supabaseAdminClient.ts"

const app = new Application({ logErrors: true })
const router = new Router()
const port = Deno.env.get("PORT") || 8000

interface Event {
  type: string
  appId: string
  convoId: string
  timestamp: string
  returnId?: string
  model?: string
  message?: string
  history?: []
}

const handleEvent = async (event: Event): Promise<void> => {
  try {
    // Ingest the event in Supabase
    console.log("Ingesting event in Supabase", event)

    const { data, error } = await supabase
      .from("events")
      .insert([
        event,
      ])

    if (error) throw error

    console.log("Response from supa: ", data)
  } catch (e) {
    console.error(e.message)
  }
}

router.post("/", async (ctx) => {
  const reqBody = await ctx.request.body().value

  const { event } = reqBody

  try {
    console.log("Received event: ", event)
    await handleEvent(event)
  } catch (e) {
    console.error(`Error handling event.`)
    console.error(e)
  }

  return ctx.response.body = "OK"
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen({ port: +port })

console.log(`Listening on port ${port}`)
