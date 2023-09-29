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

export const UPGRADE_EMAIL = (email: string, name: string) => {
  return {
    subject: `welcome to llmonitor pro`,
    to: [email],
    from: process.env.GENERIC_SENDER,
    text: `Hi ${extractFirstName(name)},

Your account has been upgraded to the pro plan.

The extra features and higher limits are now available to you.

Reply to this email if you have any question.

The LLMonitor team`,
  }
}

export const CANCELED_EMAIL = (email: string, name: string) => {
  return {
    subject: `sorry to see you go`,
    to: [email],
    from: process.env.GENERIC_SENDER,
    text: `Hi ${extractFirstName(name)},

Your account has been downgraded to the free plan.

We're sorry to see you go.

Would you mind telling us why you canceled? We're always looking to improve.

Thank you for trying LLMonitor.`,
  }
}
