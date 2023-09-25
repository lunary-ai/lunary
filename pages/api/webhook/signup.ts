import { WELCOME_EMAIL } from "@/lib/emails"
import { sendTelegramMessage } from "@/lib/notifications"
import { sendEmail } from "@/lib/sendEmail"
import { supabaseAdmin } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"
export const dynamic = "force-dynamic"

// This sets up the user profile after signing up
export default async function handler(req: NextRequest) {
  const { type, table, record } = await req.json()

  if (type !== "INSERT" || table !== "users") {
    return new NextResponse()
  }

  const {
    email,
    id,
    raw_user_meta_data: { projectName, name, teamOwner },
  } = record

  // create profile

  await supabaseAdmin.from("profile").insert([
    {
      id,
      email,
      name,
      team_owner: teamOwner,
    },
  ])

  // create first app

  const { data, error } = await supabaseAdmin
    .from("app")
    .insert([
      {
        name: projectName,
        owner: id,
      },
    ])
    .select()
    .single()

  const appId = data.id

  await sendEmail(WELCOME_EMAIL(email, name, appId))

  await sendTelegramMessage(
    `<b>🔔 New signup from ${email}</b>
    
${name} is building ${projectName}.`
  )

  new NextResponse("ok")
}
