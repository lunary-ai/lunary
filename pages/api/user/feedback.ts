import Email from "vercel-email"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextRequest, NextResponse } from "next/server"

export const config = {
  runtime: "edge",
}

export default async function handler(req: NextRequest) {
  const res = NextResponse.next()
  const { message, currentPage } = await req.json()

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  await Email.send({
    to: "vince@llmonitor.com",
    from: "feedback@llmonitor.com",
    replyTo: user.email,
    subject: `[llmonitor] Feedback left by ${user.email} from ${currentPage}`,
    text: message,
  })

  new NextResponse("ok")
}
