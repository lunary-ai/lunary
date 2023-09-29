import { buffer } from "micro"
import { supabaseAdmin } from "@/lib/supabaseClient"
import { sendEmail } from "@/lib/sendEmail"
import { CANCELED_EMAIL, UPGRADE_EMAIL } from "@/lib/emails"
import { sendTelegramMessage } from "@/lib/notifications"
import Stripe from "stripe"
import stripe from "@/lib/stripe"

export const config = {
  api: {
    bodyParser: false,
  },
}

// Webhook for subscription start, update profile plan to 'pro' & send email
// Webhook for subscription end, update profile plan to 'free'

const setupSubscription = async (object) => {
  const { customer, client_reference_id, email, mode, subscription } = object

  console.log(`🔥 setupSubscription: ${JSON.stringify(object)}`)

  if (mode !== "subscription") return

  const { error, data } = await supabaseAdmin
    .from("profile")
    .update({
      stripe_customer: customer,
      stripe_subscription: subscription,
      plan: "pro",
    })
    .eq("id", client_reference_id)
    .select("name,email")
    .single()

  if (error) {
    throw error
  }

  const { name } = data

  await sendEmail(UPGRADE_EMAIL(email, name))

  await sendTelegramMessage(`<b>💸 ${email} just upgraded</b>`)
}

const cancelSubscription = async (object) => {
  console.log(`🔥 cancelSubscription: ${JSON.stringify(object)}`)

  const { customer } = object

  const { error, data } = await supabaseAdmin
    .from("profile")
    .update({
      plan: "free",
    })
    .eq("stripe_customer", customer)
    .select("name,email")
    .single()

  if (error) {
    throw error
  }

  const { name, email } = data

  await sendEmail(CANCELED_EMAIL(email, name))

  await sendTelegramMessage(`<b>😭💔 ${email} just canceled</b>`)
}

export default async function StripeWebhook(req, res) {
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
}
