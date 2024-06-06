import sql from "./db"

export async function sendEmail(body: any) {
  if (!process.env.RESEND_KEY) {
    return console.warn("RESEND_KEY is not set, skipping email sending")
  }

  const blockList = await sql`select email from _email_block_list`
  const blockedEmails = blockList.map(({ email }) => email)

  if (blockedEmails.includes(body.to[0])) {
    return console.info("Email in the block list, skipping sending.")
  }

  if (body.to[0] === "test@lunary.ai") {
    return console.warn("Not sending email to test account")
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Error sending with resend: ${await res.text()}`)
  }

  return await res.json()
}
