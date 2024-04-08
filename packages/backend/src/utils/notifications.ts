const threads = {
  revenue: 3,
  users: 13,
  bugs: 19,
}

export const sendTelegramMessage = async (
  msg: string,
  thread: "revenue" | "users" | "bugs",
) => {
  if (!process.env.TELEGRAM_BOT_KEY || !process.env.TELEGRAM_CHAT_ID) return

  if (msg.includes("test@lunary.ai")) return // ignore test runner emails

  try {
    const threadId = threads[thread] || null

    await fetch(
      `https://api.telegram.org/bot${
        process.env.TELEGRAM_BOT_KEY
      }/sendMessage?chat_id=${
        process.env.TELEGRAM_CHAT_ID
      }&parse_mode=HTML&disable_web_page_preview=True&text=${encodeURIComponent(
        msg,
      )}${threadId ? `&reply_to_message_id=${threadId}` : ""}`,
    )
  } catch (e) {
    console.error(e)
  }
}
