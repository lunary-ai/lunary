import sql from "./db"
import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
  port: Number(process.env.SMTP_PORT),
  secure: Boolean(process.env.SMTP_SECURE),
  host: process.env.SMTP_HOST,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

const requiredEnvVars = [
  'SMTP_PORT',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_SECURE',
  'SMTP_FROM'
];


export async function sendEmail(body: any) {
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      return console.warn(`${varName} is not set, skipping email sending`);
    }
  }

  
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
      to: body.to,
      subject: body.subject,
      replyTo: body.reply_to,
      from: body.from,
      text: body.text,
     })
  } catch (error) {
    console.info("Error sending email:", error)
  }
}
