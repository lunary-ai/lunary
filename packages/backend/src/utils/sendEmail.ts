import nodemailer from "nodemailer"

import sql from "./db"

type EmailTemplate = {
  from: string
  to: string[]
  text: string
  subject: string
  reply_to: string
  html?: string
}

export function sendEmail(body: EmailTemplate) {
  if (process.env.RESEND_KEY) {
    return sendEmailResend(body)
  } else {
    return sendEmailNodemailer(body)
  }
}

export async function sendEmailResend(body: EmailTemplate) {
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

// sendEmail function using nodemailer which accepts a body and sends an email 
export async function sendEmailNodemailer(body: EmailTemplate) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: body.from,
    to: body.to,
    subject: body.subject,
    text: body.text,
    html: body.html,
  });

  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

  return info;
}
