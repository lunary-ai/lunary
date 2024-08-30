import nodemailer from "nodemailer"
import config from "../utils/config"
import sql from "../utils/db"

export interface MailOptions {
  subject: string
  to: string
  from: string
  text: string
}

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: true,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASSWORD,
  },
})

export async function sendEmail(body: MailOptions) {
  if (
    !config.SMTP_HOST ||
    !config.SMTP_PORT ||
    !config.SMTP_USER ||
    !config.SMTP_PASSWORD
  ) {
    return console.warn(
      "[EMAIL] SMTP environment variables are not set. Skipping email sending.",
    )
  }

  // TODO: extract to another function
  const blockList = await sql`select email from _email_block_list`
  const blockedEmails = blockList.map(({ email }) => email)

  if (blockedEmails.includes(body.to)) {
    return console.warn("[EMAIL] Email in the block list, skipping sending.")
  }

  // TODO: should probably have an temp email server that checks if test account receives the mails
  if (body.to === "test@lunary.ai") {
    return console.warn("[EMAIL] Not sending email to test account")
  }

  await transporter.sendMail(body)
}
