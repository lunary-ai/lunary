import { NextRequest } from "next/server"
import stripe from "@/lib/stripe"

import { edgeWrapper } from "@/lib/api/edgeHelpers"
import { jsonResponse } from "@/lib/api/jsonResponse"
import { ensureIsLogged } from "@/lib/api/ensureAppIsLogged"

export const runtime = "edge"
export const dynamic = "force-dynamic"

// Redirect to Stripe customer portal
export default edgeWrapper(async function handler(req: NextRequest) {
  const { supabase } = await ensureIsLogged(req)

  const { plan, period, orgId, origin } = await req.json()

  const lookupKey = `${plan}_${period}`

  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
  })

  if (prices.data.length === 0) {
    throw new Error("No price found for this plan and period")
  }

  const priceId = prices.data[0].id as string

  const { data: org } = await supabase
    .from("org")
    .select("id,plan,stripe_customer,stripe_subscription")
    .eq("id", orgId)
    .single()
    .throwOnError()

  if (!org) throw new Error("Org not found")

  if (!org.stripe_subscription) {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: orgId,
      customer: org.stripe_customer || undefined,
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

    return jsonResponse(200, { ok: true, url: checkoutSession.url })
  } else {
    const subscription = await stripe.subscriptions.retrieve(
      org.stripe_subscription,
    )

    const subItem = subscription.items.data[0].id

    // Update user subscription with new price
    await stripe.subscriptions.update(org.stripe_subscription, {
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
    await supabase.from("org").update({ plan }).eq("id", orgId).throwOnError()
  }

  return jsonResponse(200, { ok: true })
})
