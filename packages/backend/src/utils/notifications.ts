const channels = {
  billing: process.env.SLACK_BILLING_CHANNEL,
  users: process.env.SLACK_USERS_CHANNEL,
  feedback: process.env.SLACK_FEEDBACK_CHANNEL,
};

export const sendSlackMessage = async (
  msg: string,
  thread: "billing" | "users" | "feedback",
) => {
  if (!process.env.SLACK_BOT_TOKEN) return;

  if (msg.includes("test@lunary.ai")) return; // ignore test runner emails

  try {
    const channelId = channels[thread] || null;

    if (!channelId) {
      console.error("No channel found for", thread);
      return;
    }

    await fetch(`https://hooks.slack.com/services/${channelId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: msg,
      }),
    });
  } catch (e) {
    console.error(e);
  }
};
