import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"
import stripe from "@/utils/stripe"

const orgs = new Router({
  prefix: "/orgs/:orgId",
})

orgs.get("/", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string

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
  const orgId = ctx.params.orgId as string

  const name = (ctx.request.body as { name: string }).name

  await sql`
      update org
      set
        name = ${name}
      where
        id = ${orgId}
    `
  ctx.body = {}
})

orgs.get("/projects", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string

  const rows = await sql`
    select
      id,
      created_at,
      name,
      org_id,
      exists(select * from run where app = app.id) as activated
    from
      app
    where
      org_id = ${orgId}
  `

  ctx.body = rows
})

orgs.get("/usage", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string
  const { projectId } = ctx.request.query

  const rows = await sql`
    select
      date_trunc('day', r.created_at) as date,
      count(*) as count
    from
      run r 
    ${!projectId ? sql`join app a on r.app = a.id` : sql``}
    where
      ${!projectId ? sql`a.org_id = ${orgId} and` : sql``}
      ${projectId ? sql`r.app = ${projectId} and` : sql``}
      r.created_at > now() - interval '30 days'
    group by
      date
    order by
    date desc;
  `

  ctx.body = rows
})

orgs.post("/upgrade", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string

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
    await sql`
      update org
      set
        plan = ${plan}
      where
        id = ${orgId}
    `
  }

  ctx.body = { ok: true }
})

export default orgs
