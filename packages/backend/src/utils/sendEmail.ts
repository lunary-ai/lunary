export async function sendEmail(body: any) {
  if (!process.env.RESEND_KEY) {
    return console.warn("RESEND_KEY is not set, skipping email sending")
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
