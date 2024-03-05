import Router from "koa-router"

import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import stripe from "@/src/utils/stripe"

import { z } from "zod"

import { PassThrough } from "stream"

import { runAImodel } from "@/src/utils/playground"

const orgs = new Router({
  prefix: "/orgs/:orgId",
})

orgs.get("/", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string

  const [row] = await sql`
    select
      id,
      created_at,
      plan,
      billing,
      play_allowance,
      limited,
      verified,
      plan_period,
      canceled,
      stripe_customer,
      stripe_subscription,  
      name
    from
      org
    where
      id = ${orgId}
  `

  ctx.body = row
})

orgs.patch("/", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string
  const bodySchema = z.object({
    name: z.string(),
  })

  const { name } = bodySchema.parse(ctx.request.body)

  await sql`update org set name = ${name} where id = ${orgId}`
  ctx.status = 200
})

orgs.get("/usage", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string
  const { projectId } = ctx.request.query

  const rows = await sql`
    select
      date_trunc('day', r.created_at) as date,
      count(*) as count
    from
      run r 
    ${!projectId ? sql`join project p on r.project_id = p.id` : sql``}
    where
      ${!projectId ? sql`p.org_id = ${orgId} and` : sql``}
      ${projectId ? sql`r.project_id = ${projectId} and` : sql``}
      r.created_at > now() - interval '30 days'
    group by
      date
    order by
    date desc;
  `

  ctx.body = rows
})

orgs.get("/billing-portal", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string

  const [org] = await sql`
    select
      id,
      stripe_customer
    from
      org
    where
      id = ${orgId}
  `

  if (!org) throw new Error("Org not found")

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomer,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })

  ctx.body = { url: session.url }
})

orgs.post("/upgrade", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string

  const { plan, period, origin } = ctx.request.body as {
    plan: string
    period: string
    origin: string
  }

  const lookupKey = `${plan}_${period}`

  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
  })

  if (prices.data.length === 0) {
    throw new Error("No price found for this plan and period")
  }

  const priceId = prices.data[0].id as string

  const [org] = await sql`
    select
      id,
      plan,
      stripe_customer,
      stripe_subscription
    from
      org
    where
      id = ${orgId}
  `

  if (!org) throw new Error("Org not found")

  if (!org.stripe_subscription) {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: orgId,
      customer: org.stripeCustomer || undefined,
      metadata: {
        plan,
        period,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing/thank-you`,
      cancel_url: `${origin}/billing`,
    })

    return (ctx.body = { ok: true, url: checkoutSession.url })
  } else {
    const subscription = await stripe.subscriptions.retrieve(
      org.stripeSubscription,
    )

    const subItem = subscription.items.data[0].id

    // Update user subscription with new price
    await stripe.subscriptions.update(org.stripeSubscription, {
      cancel_at_period_end: false,
      metadata: {
        plan,
        period,
      },
      items: [
        {
          id: subItem,
          price: priceId,
        },
      ],
    })

    // Update org plan
    await sql`update org set plan = ${plan} where id = ${orgId}`
  }

  ctx.body = { ok: true }
})

type ChunkResult = {
  choices: { message: any }[]
  tokens: number
}

async function handleStream(
  stream: ReadableStream,
  onNewToken: (data: ChunkResult) => void,
  onComplete: () => void,
  onError: (e: Error) => void,
) {
  try {
    let tokens = 0
    let choices: any[] = []
    let res: ChunkResult
    for await (const part of stream) {
      // 1 chunk = 1 token
      tokens += 1

      const chunk = part.choices[0]

      const { index, delta } = chunk

      const { content, function_call, role, tool_calls } = delta

      if (!choices[index]) {
        choices.splice(index, 0, {
          message: { role, content: "", function_call, tool_calls: [] },
        })
      }

      if (content) choices[index].message.content += content || ""

      if (role) choices[index].message.role = role

      if (function_call?.name)
        choices[index].message.function_call.name = function_call.name

      if (function_call?.arguments)
        choices[index].message.function_call.arguments +=
          function_call.arguments

      if (tool_calls) {
        for (const tool_call of tool_calls) {
          const existingCallIndex = choices[index].message.tool_calls.findIndex(
            (tc) => tc.index === tool_call.index,
          )

          if (existingCallIndex === -1) {
            choices[index].message.tool_calls.push(tool_call)
          } else {
            const existingCall =
              choices[index].message.tool_calls[existingCallIndex]

            if (tool_call.function?.arguments) {
              existingCall.function.arguments += tool_call.function.arguments
            }
          }
        }
      }

      res = {
        choices,
        tokens,
      }

      onNewToken(res)
    }

    // remove the `index` property from the tool_calls if any
    // as it's only used to help us merge the tool_calls
    choices = choices.map((c) => {
      if (c.message.tool_calls) {
        c.message.tool_calls = c.message.tool_calls.map((tc) => {
          const { index, ...rest } = tc
          return rest
        })
      }
      return c
    })

    res = {
      choices,
      tokens,
    }

    onNewToken(res)

    onComplete()
  } catch (error) {
    console.error(error)
    onError(error)
  }
}

orgs.post("/playground", async (ctx: Context) => {
  const orgId = ctx.state.orgId as string
  const requestBodySchema = z.object({
    content: z.array(z.any()).or(z.string()),
    extra: z.any(),
    variables: z.record(z.string()),
  })
  const { content, extra, variables } = requestBodySchema.parse(
    ctx.request.body,
  )

  ctx.request.socket.setTimeout(0)
  ctx.request.socket.setNoDelay(true)
  ctx.request.socket.setKeepAlive(true)

  ctx.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })

  const [org] = await sql`
    select play_allowance
    from org
    where id = ${orgId}
  `

  if (org?.playAllowance <= 0) {
    throw new Error(
      "No allowance left today. Wait tomorrow or upgrade to continue using the playground.",
    )
  }

  // substract play allowance
  await sql`
    update org
    set play_allowance = play_allowance - 1
    where id = ${orgId}
  `
  const model = extra?.model || "gpt-3.5-turbo"

  const res = await runAImodel(content, extra, variables, model, true)

  const stream = new PassThrough()
  stream.pipe(ctx.res)
  ctx.status = 200
  ctx.body = stream

  handleStream(
    res,
    (data) => {
      stream.write(JSON.stringify(data) + "\n")
    },
    () => {
      stream.end()
    },
    () => {
      stream.end()
    },
  )
})

export default orgs
