import { buffer } from "micro"
import { supabaseAdmin } from "@/lib/supabaseClient"
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

  const { data: org } = await supabaseAdmin
    .from("org")
    .update({
      stripe_customer: customer,
      stripe_subscription: subscription,
      canceled: false,
      plan,
      plan_period: period,
      limited: false,
      play_allowance: plan === "pro" ? 15 : 1000,
    })
    .eq("id", client_reference_id)
    .select("id,name")
    .single()
    .throwOnError()

  const { data: users } = await supabaseAdmin
    .from("profile")
    .select("email,name")
    .eq("org_id", org.id)
    .throwOnError()

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

  const { data: currentOrg } = await supabaseAdmin
    .from("org")
    .select("plan,plan_period,canceled")
    .eq("stripe_customer", customer)
    .single()
    .throwOnError()

  if (
    currentOrg.plan === plan &&
    currentOrg.plan_period === period &&
    canceled === currentOrg.canceled
  ) {
    console.log(`🔥 updateSubscription: nothing to update`)
    return
  }

  const { data: org } = await supabaseAdmin
    .from("org")
    .update({
      plan,
      plan_period: period,
      canceled,
    })
    .eq("stripe_customer", customer)
    .select("id,name")
    .single()
    .throwOnError()

  if (canceled) {
    const { data: users } = await supabaseAdmin
      .from("profile")
      .select("email,name")
      .eq("org_id", org.id)
      .throwOnError()

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

  const { data: org } = await supabaseAdmin
    .from("org")
    .update({
      plan: "free",
      canceled: false,
      stripe_subscription: null,
    })
    .eq("stripe_customer", customer)
    .select("id,name")
    .single()
    .throwOnError()

  const { data: users } = await supabaseAdmin
    .from("profile")
    .select("email,name")
    .eq("org_id", org.id)
    .throwOnError()

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
