const getDefaultAppId = () => {
  if (typeof process !== "undefined" && process.env?.LLMONITOR_APP_ID) {
    return process.env.LLMONITOR_APP_ID
  }

  if (typeof Deno !== "undefined" && Deno.env?.get("LLMONITOR_APP_ID")) {
    return Deno.env.get("LLMONITOR_APP_ID")
  }

  return undefined
}

interface LLMonitorOptions {
  appId?: string
  convoId?: string
  convoType?: string
  trackingUrl?: string
}

class LLMonitor {
  appId: string
  convoId: string
  convoType: string | undefined
  trackingUrl: string

  /**
   * @param {string} appId - App ID generated from the LLMonitor dashboard
   * @param {string} convoId - Tie to an existing conversation ID
   * @param {string} convoType - Add a label to the conversation
   * @param {string} trackingUrl - Custom tracking URL if you are self-hosting
   * @constructor
   * @example
   * const monitor = new LLMonitor({
   *   appId: "00000000-0000-0000-0000-000000000000",
   *   convoId: "my-convo-id",
   *   convoType: "my-convo-type",
   *   trackingUrl: "https://tracking.llmonitor.com"
   * })
   */

  constructor(options: LLMonitorOptions) {
    this.appId = options.appId || getDefaultAppId()
    this.convoId = options.convoId || crypto.randomUUID()
    this.convoType = options.convoType
    this.trackingUrl = options.trackingUrl || "https://tracking.llmonitor.com"
  }

  private async trackEvent(type, data: any = {}) {
    const eventData = {
      type,
      app: this.appId,
      convo: this.convoId,
      timestamp: new Date().toISOString(),
      ...data,
    }

    if (this.convoType) {
      eventData.convoType = this.convoType
    }

    // fetch
    await fetch(`${this.trackingUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: eventData }),
    })
  }

  promptReceived(message: string) {
    this.trackEvent("PROMPT", { message })
  }

  assistantAnswered(message: string) {
    this.trackEvent("ASSISTANT_ANSWER", { message })
  }

  LLMcall(chat, model?: string) {
    this.trackEvent("LLM_CALL", { chat, model })
  }

  LLMresult(intermediaryResult) {
    this.trackEvent("LLM_RESULT", { intermediaryResult })
  }

  log(message: string) {
    this.trackEvent("LOG", { message })
  }

  streamingStarts() {
    this.trackEvent("STREAMING_START")
  }

  userUpvotes() {
    this.trackEvent("FEEDBACK", { message: "GOOD" })
  }

  userDownvotes() {
    this.trackEvent("FEEDBACK", { message: "BAD" })
  }

  error(message, error) {
    this.trackEvent("ERROR", { message, error })
  }
}

export default LLMonitor
