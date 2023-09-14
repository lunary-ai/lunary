const extractFirstName = (name: string) => {
  if (!name) return "there"
  return name.split(" ")[0]
}

export const FEEDBACK_EMAIL = (
  userEmail: string,
  message: string,
  currentPage: string
) => {
  return {
    subject: `[llmonitor] Feedback left by ${userEmail} from ${currentPage}`,
    from: process.env.GENERIC_SENDER,
    to: ["hello@llmonitor.com"],
    reply_to: userEmail,
    text: message,
  }
}

export const WELCOME_EMAIL = (email: string, name: string, appId: string) => {
  return {
    subject: `welcome`,
    to: [email],
    from: process.env.PERSONAL_SENDER || process.env.GENERIC_SENDER,
    text: `Hi ${extractFirstName(name)},

I'm Vince, co-founder of llmonitor. 

Wanted to say welcome.

Although this is an automated email, I'm here to help get you started if you have any question.

Here's your app tracking ID: \`${appId}\`

You can use this to integrate your app with one of our SDKs.

In your opinion, what can we do to make llmonitor better?

Thanks
Vince`,
  }
}
