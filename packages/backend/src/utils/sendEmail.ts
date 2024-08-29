import nodemailer from "nodemailer"

type EmailTemplate = {
  from?: string
  to: string[]
  text: string
  subject: string
  reply_to?: string
  html?: string
}

// sendEmail function using nodemailer which accepts a body and sends an email 
export async function sendEmail(body: EmailTemplate) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

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
