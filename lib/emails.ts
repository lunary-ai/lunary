function extractFirstName(name: string) {
  if (!name) return "there"
  return name.split(" ")[0]
}

export function CONFIRM_EMAIL(
  email: string,
  name: string,
  confirmLink: string,
) {
  return {
    subject: `confirm your email`,
    to: [email],
    from: process.env.GENERIC_SENDER,

    text: `Hi ${extractFirstName(name)},

Thanks for signing up for Lunary.

Please confirm your email address by clicking on the link below:

${confirmLink}

You can reply to this email if you have any question.

Thanks
- The Lunary team`,
  }
}

export function RESET_PASSWORD(email: string, confirmLink: string) {
  return {
    subject: `Reset your password`,
    to: [email],
    from: process.env.GENERIC_SENDER,
    text: `Hi, 

Please click on the link below to reset your password:
${confirmLink}

You can reply to this email if you have any question.

- The Lunary team`,
  }
}

export function WELCOME_EMAIL(email: string, name: string, appId: string) {
  return {
    subject: `welcome to Lunary`,
    to: [email],
    from: process.env.PERSONAL_SENDER || process.env.GENERIC_SENDER,

    text: `Hi ${extractFirstName(name)},

I'm Vince, co-founder of lunary. 

Wanted to say welcome.

Although this is an automated email, I'm here to help get you started if you have any question.

Here's your app tracking ID: \`${appId}\`

You can use this to integrate your app with one of our SDKs.

In your opinion, what can we do to make lunary better?

Thanks
Vince`,
  }
}

export function UPGRADE_EMAIL(email: string, name: string) {
  return {
    subject: `welcome to lunary pro`,
    to: [email],
    from: process.env.GENERIC_SENDER,
    text: `Hi ${extractFirstName(name)},

Your account has been upgraded to the pro plan.

The extra features and higher limits are now available to you.

Reply to this email if you have any question.

The Lunary team`,
  }
}

export function CANCELED_EMAIL(email: string, name: string) {
  return {
    subject: `sorry to see you go`,
    to: [email],
    from: process.env.GENERIC_SENDER,
    text: `Hi ${extractFirstName(name)},

Your account has been downgraded to the free plan.

We're sorry to see you go.

Would you mind telling us why you canceled? We're always looking to improve.

Thank you for trying Lunary.`,
  }
}
