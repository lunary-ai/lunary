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
    from: "llmonitor <hello@llmonitor.com>",
    to: ["vince@llmonitor.com", "me@hugh.sh"],
    reply_to: userEmail,
    text: message,
  }
}

export const WELCOME_EMAIL = (email: string, name: string, appId: string) => {
  return {
    subject: `welcome`,
    to: [email],
    from: "Vince Loewe <vince@llmonitor.com>",
    text: `Hi ${extractFirstName(name)},

I'm Vince, cofounder of llmonitor. 

Although this is an automated email, wanted to say welcome - I'm here to help you get started if you have any questions.

Here's your app tracking ID: \`${appId}\`

You can use this to integrate your app with one of our SDKs.

In your opinion what can we do to make the platform better?`,
  }
}
