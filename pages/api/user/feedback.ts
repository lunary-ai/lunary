import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/sendEmail"
import { FEEDBACK_EMAIL } from "@/lib/emails"
import { sendTelegramMessage } from "@/lib/notifications"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function handler(req: NextRequest) {
  const res = NextResponse.next()
  const { message, currentPage } = await req.json()

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  await sendEmail(FEEDBACK_EMAIL(user.email, message, currentPage))

  await sendTelegramMessage(`<b>🔔 Feedback from ${user?.email || "unknown"}</b>

${message}

(sent from <code>${currentPage}</code>)`)

  return new NextResponse("ok")
}
