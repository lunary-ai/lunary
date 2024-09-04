import { MailOptions } from "."
import config from "../utils/config"
import { extractFirstName } from "./utils"

export function INVITE_EMAIL(
  email: string,
  orgName: string,
  inviteLink: string,
): MailOptions {
  return {
    subject: "You've been invited to Lunary",
    to: email,
    from: config.GENERIC_SENDER_ADDRESS!,
    text: `Hi, 

You've been invited to join ${orgName} on Lunary. 

Please click on the following link to accept the invitation: 

${inviteLink}

${
  !config.IS_SELF_HOSTED
    ? `We're looking forward to having you on board!

You can reply to this email if you have any question.

Thanks
- The Lunary team
`
    : ""
}
`,
  }
}

export function CONFIRM_EMAIL(
  email: string,
  name: string,
  confirmLink: string,
): MailOptions {
  return {
    subject: `Confirm your email`,
    to: email,
    from: config.GENERIC_SENDER_ADDRESS!,

    text: `Hi ${extractFirstName(name)},

Thanks for signing up for Lunary.

Please confirm your email address by clicking on the link below:

${confirmLink}

You can reply to this email if you have any question.

Thanks
- The Lunary team`,
  }
}

export function RESET_PASSWORD(
  email: string,
  confirmLink: string,
): MailOptions {
  return {
    subject: `Reset your password`,
    to: email,
    from: config.GENERIC_SENDER_ADDRESS!,
    text: `Hi, 

Please click on the link below to reset your password:

${confirmLink}

You can reply to this email if you have any question.

- The Lunary team`,
  }
}

export function WELCOME_EMAIL(
  email: string,
  name: string,
  projectId: string,
): MailOptions {
  return {
    subject: `Welcome to Lunary`,
    to: email,
    from: config.PERSONAL_SENDER_ADDRESS || config.GENERIC_SENDER_ADDRESS!,
    text: `Hi ${extractFirstName(name)},

I'm Vince, co-founder of lunary. 

Wanted to say welcome.

Although this is an automated email, I'm here to help get you started if you have any question.

Here's your project tracking ID: \`${projectId}\`

You can use this to integrate your app with one of our SDKs.

In your opinion, what can we do to make lunary better?

Thanks
Vince`,
  }
}

export function UPGRADE_EMAIL(
  email: string,
  name: string,
  plan: string,
): MailOptions {
  return {
    subject: `Your account has been upgraded`,
    to: email,
    from: config.GENERIC_SENDER_ADDRESS!,
    text: `Hi ${extractFirstName(name)},

Your account has been upgraded to the ${plan} plan.

The extra features and higher limits are now available to you.

Reply to this email if you have any question.

- The Lunary team`,
  }
}

export function CANCELED_EMAIL(email: string, name: string): MailOptions {
  return {
    subject: `Important: subscription canceled`,
    to: email,
    from: config.GENERIC_SENDER_ADDRESS!,
    text: `Hi ${extractFirstName(name)},

You have canceled your subscription. We're sad to see you go :(

At the end of your billing period, your account will be downgraded to the free plan.

*Important: any data older than 30 days (free plan limits) will be permanently deleted.*

If this was a mistake, you can upgrade again at any time here: ${process.env.APP_URL}/billing

Would you mind telling us why you canceled? We're always looking to improve. 

Thank you for trying Lunary.

- The Lunary team`,
  }
}

export function FULLY_CANCELED_EMAIL(email: string, name: string): MailOptions {
  return {
    subject: `Sorry to see you go...`,
    to: email,
    from: config.GENERIC_SENDER_ADDRESS!,
    text: `Hi ${extractFirstName(name)},

Your account has been downgraded to the free plan.

Would you mind telling us why you canceled? We're always looking to improve. 

If you can take 30 seconds to reply to this email with one of the following reasons, it would help us a lot:

1. I don't need it anymore
2. I found a better alternative
3. I'm missing a feature
4. It's too expensive
5. Other: ____________

If this was a mistake, you can upgrade again at any time here: ${process.env.APP_URL}/billing

Thank you for trying Lunary.

- The Lunary team`,
  }
}

export function LIMITED_EMAIL(email: string, name: string): MailOptions {
  return {
    subject: `Action Required: Events limit reached`,
    to: email,
    from: config.GENERIC_SENDER_ADDRESS!,
    text: `Hi ${extractFirstName(name)},
  
Congratulations! You've reached your free ingested event limit for the month, which means you're making great use of Lunary. 

As a result, your account has been temporarily limited (don't worry, your data is safe and sound).

To continue enjoying our services without interruption, please consider upgrading your account here: ${process.env.APP_URL}/billing

If you have any questions, feel free to reply to this email.

Thank you for being a part of Lunary.

- The Lunary team`,
  }
}
