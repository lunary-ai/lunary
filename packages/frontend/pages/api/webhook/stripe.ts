import { buffer } from "micro"
import { sendEmail } from "@/lib/sendEmail"
import {
  CANCELED_EMAIL,
  UPGRADE_EMAIL,
  FULLY_CANCELED_EMAIL,
} from "@/lib/emails"
import { sendTelegramMessage } from "@/lib/notifications"
import Stripe from "stripe"
import stripe from "@/lib/stripe"
import { apiWrapper } from "@/lib/api/helpers"
import sql from "@/lib/db"

export const config = {
  api: {
    bodyParser: false,
  },
}

// Webhook for subscription start, update profile plan to 'pro' & send email
// Webhook for subscription end, update profile plan to 'free'

const setupSubscription = async (object) => {
  const { customer, client_reference_id, mode, subscription, metadata } = object

  if (mode !== "subscription") return

  if (!client_reference_id) {
    throw new Error("client_reference_id is missing")
  }

  const plan = metadata.plan || "pro"
  const period = metadata.period || "monthly"

  const [org] = await sql`
    UPDATE org
    SET stripe_customer = ${customer},
        stripe_subscription = ${subscription},
        canceled = false,
        plan = ${plan},
        plan_period = ${period},
        limited = false,
        play_allowance = ${plan === "pro" ? 15 : 1000}
    WHERE id = ${client_reference_id}
    RETURNING id, name
  `

  const [users] = await sql`
    SELECT email, name
    FROM profile
    WHERE org_id = ${org.id}
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

const updateSubscription = async (object) => {
  const { customer, cancel_at_period_end, metadata, cancellation_details } =
    object

  const plan = metadata.plan || "pro"
  const period = metadata.period || "monthly"
  const canceled = cancel_at_period_end

  const [currentOrg] = await sql`
    SELECT plan, plan_period, canceled
    FROM org
    WHERE stripe_customer = ${customer}
  `

  if (
    currentOrg.plan === plan &&
    currentOrg.plan_period === period &&
    canceled === currentOrg.canceled
  ) {
    console.log(`🔥 updateSubscription: nothing to update`)
    return
  }

  const [org] = await sql`
    UPDATE org
    SET plan = ${plan},
        plan_period = ${period},
        canceled = ${canceled}
    WHERE stripe_customer = ${customer}
    RETURNING id, name
  `

  if (canceled) {
    const [users] = await sql`
      SELECT email, name
      FROM profile
      WHERE org_id = ${org.id}
    `

    const emailPromises = users.map((user) => {
      return sendEmail(CANCELED_EMAIL(user.email, user.name))
    })

    await Promise.all(emailPromises)

    await sendTelegramMessage(
      `<b>😭💔 ${org.name} subscription canceled their plans</b>`,
      "revenue",
    )
  } else {
    await sendTelegramMessage(
      `<b>🔔 ${org.name} subscription updated to: ${plan} (${period})</b>`,
      "revenue",
    )
  }
}

const cancelSubscription = async (object) => {
  const { customer } = object

  const [org] = await sql`
    UPDATE org
    SET plan = 'free',
        canceled = false,
        stripe_subscription = NULL
    WHERE stripe_customer = ${customer}
    RETURNING id, name
  `

  const [users] = await sql`
    SELECT email, name
    FROM profile
    WHERE org_id = ${org.id}
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

export default apiWrapper(async function StripeWebhook(req, res) {
  const buf = await buffer(req)
  const sig = req.headers["stripe-signature"]

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  let event: Stripe.Event

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).end("Method Not Allowed")
    return
  }

  try {
    if (!sig || !webhookSecret) return
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
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
  } catch (error) {
    console.error(error)
    return res.status(400).send(`Webhook Error: ${error.message}`)
  }

  res.json({ received: true })
})
