export const sendEmail = async (body: any) => {
  if (!process.env.RESEND_KEY) {
    return console.warn("RESEND_KEY is not set, skipping email sending")
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_KEY}`,
    },
    body: JSON.stringify(body),
  })

  return res.json()
}
