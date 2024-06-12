import sql from "./db" // Fix import statement, assuming it's a default export

import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
  port: Number(process.env.SMTP_PORT),
  secure: true,
  host: process.env.SMTP_HOST,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export const mailOptions = {
  from: process.env.SMTP_FROM,
}

export async function sendEmail(body: any) {
  const blockList = await sql`select email from _email_block_list`
  const blockedEmails = blockList.map(({ email }) => email)

  if (blockedEmails.includes(body.to[0])) {
    return console.info("Email in the block list, skipping sending.")
  }

  if (body.to[0] === "test@lunary.ai") {
    return console.warn("Not sending email to test account")
  }

  try {
    await transporter.sendMail({
      ...mailOptions,
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
    })
  } catch (error) {
    console.info("Error sending email:", error)
  }
}
