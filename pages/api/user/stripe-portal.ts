import { NextRequest, NextResponse } from "next/server"
import stripe from "@/lib/stripe"
import { sendTelegramMessage } from "@/lib/notifications"

export const runtime = "edge"
export const dynamic = "force-dynamic"

// Redirect to Stripe customer portal
export default async function handler(req: NextRequest) {
  const { customer, origin } = await req.json()

  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: origin + "/billing",
  })

  return new NextResponse(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  })
}
