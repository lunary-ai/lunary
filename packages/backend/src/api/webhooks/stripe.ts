import { sendEmail } from "@/src/utils/sendEmail"
import {
  CANCELED_EMAIL,
  UPGRADE_EMAIL,
  FULLY_CANCELED_EMAIL,
} from "@/src/utils/emails"
import { sendTelegramMessage } from "@/src/utils/notifications"
import Stripe from "stripe"
import stripe from "@/src/utils/stripe"

import sql from "@/src/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const router = new Router({
  prefix: "/stripe",
})

const setupSubscription = async (object: Stripe.Checkout.Session) => {
  console.log("🔔 setupSubscription", object)
  const { customer, client_reference_id, mode, subscription, metadata } = object

  if (mode !== "subscription") return

  if (!client_reference_id) {
    throw new Error("client_reference_id is missing")
  }

  const plan = metadata?.plan || "pro"
  const period = metadata?.period || "monthly"

  const orgData = {
    stripeCustomer: customer as string,
    stripeSubscription: subscription as string,
    canceled: false,
    plan,
    planPeriod: period,
    limited: false,
    playAllowance: 1000,
    radarAllowance: 1000,
    evalAllowance: 1000,
  }

  const [org] = await sql`
    UPDATE org
    SET ${sql(orgData)}
    WHERE id = ${client_reference_id}
    RETURNING id, name
  `

  const users = await sql`
    select email, name
    from account
    where org_id = ${org.id}
  `

  const emailPromises = users.map((user) =>
    sendEmail(UPGRADE_EMAIL(user.email, user.name, plan)),
  )

  await Promise.all(emailPromises)

  await sendTelegramMessage(
    `<b>💸${org.name} just upgraded to ${plan} (${period})</b>`,
    "revenue",
  )
}

const updateSubscription = async (object: Stripe.Subscription) => {
  const { customer, cancel_at_period_end, metadata, id, cancellation_details } =
    object

  const plan = metadata.plan
  const period = metadata.period
  const canceled = cancel_at_period_end

  const [currentOrg] = await sql`
    SELECT plan, plan_period, canceled
    FROM org
    WHERE stripe_customer = ${customer as string} AND stripe_subscription = ${id}
  `

  if (!currentOrg) {
    throw new Error("Org with matching subscription not found")
  }

  if (
    canceled === currentOrg.canceled &&
    ((!plan && !period) ||
      (currentOrg.plan === plan && currentOrg.plan_period === period))
  ) {
    console.log(`🔥 updateSubscription: nothing to update`)
    return
  }

  const [org] = await sql`
    UPDATE org
    SET ${sql({ plan, planPeriod: period, canceled })}
    WHERE stripe_customer = ${customer as string}
    RETURNING id, name
  `

  if (canceled) {
    const [users] = await sql`
      select email, name
      from account
      where org_id = ${org.id}
    `

    const emailPromises = users.map((user) => {
      return sendEmail(CANCELED_EMAIL(user.email, user.name))
    })

    await Promise.all(emailPromises)

    await sendTelegramMessage(
      `<b>😭💔 ${org.name} subscription canceled their plans</b>`,
      "revenue",
    )
  } else if (plan || period) {
    await sendTelegramMessage(
      `<b>🔔 ${org.name} subscription updated to: ${plan} (${period})</b>`,
      "revenue",
    )
  }
}

const cancelSubscription = async (object: Stripe.Subscription) => {
  const { customer, id } = object

  const [org] = await sql`
    UPDATE org
    SET ${sql({ plan: "free", canceled: false, stripeSubscription: null })} 
    WHERE stripe_customer = ${customer as string} AND stripe_subscription = ${id}
    RETURNING id, name
  `

  if (!org) {
    throw new Error("Org with subscription not found")
  }

  const [users] = await sql`
    select email, name
    from account
    where org_id = ${org.id}
  `

  const emailPromises = users.map((user) => {
    return sendEmail(FULLY_CANCELED_EMAIL(user.email, user.name))
  })

  await Promise.all(emailPromises)

  await sendTelegramMessage(
    `<b>😭💔 ${org.name} subscription is now deleted</b>`,
    "revenue",
  )
}

router.post("/", async (ctx: Context) => {
  const sig = ctx.request.headers["stripe-signature"]

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  let event: Stripe.Event

  try {
    if (!sig || !webhookSecret) throw new Error("Missing Stripe signature")
    event = await stripe.webhooks.constructEventAsync(
      ctx.request.rawBody,
      sig,
      webhookSecret,
    )

    switch (event.type) {
      case "checkout.session.completed":
        // reconcile user with customer using client_reference_id
        await setupSubscription(event.data.object)
        break

      case "customer.subscription.updated":
        await updateSubscription(event.data.object)
        break

      case "customer.subscription.deleted":
        await cancelSubscription(event.data.object)
        break

      default:
        console.warn(`Unhandled event type ${event.type}`)
    }
  } catch (error: unknown) {
    console.error(error)
    ctx.throw(400, `Webhook Error: ${error.message}`)
  }

  ctx.body = { received: true }
})

export default router
