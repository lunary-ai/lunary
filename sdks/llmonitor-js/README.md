# LLMonitor JS SDK

LLMonitor is an open-source logging and analytics platform for LLM-powered apps.

You can use it with any LLM models, not limited to GPT. 

This is the JS isomorphic library compatible with Node.js, Deno and the browser.

## Installation

```bash
npm install llmonitor
```

## Simple usage

```typescript
import LLMonitor from 'llmonitor';

const systemMessage = {role: 'system', content: `You are an assistant...`}

const handleUserMessage = async (prompt) => {

  // If you already have a convo id, set it as parameter, otherwise leave empty
  const convo = new LLMonitor({
    convoId, // Optional (uuid): tie to an existing conversation
    convoType, // Optional (string): to filter conversations in the dashboard by type
    appId, // Optional (uuid): if you haven't defined process.env.LLMONITOR_APP_ID
  })

  try {

    convo.promptReceived(prompt)

    const input = [prompt]
    const answer = await doLLMquery(input)

    convo.assistantAnswered(answer, input)

    return { answer, convoId: convo.id}

  } catch (err)

    convo.trackError(stage, error)
  }
}
```


## Advanced Usage (agents with chains and multiple steps)

```typescript
import LLMonitor from 'llmonitor';


const handleUserMessage = (userPrompt) => {

  const monitor = new LLMonitor({
    convoId, // Optional (uuid): tie to an existing conversation
    convoType, // Optional (string): to filter conversations in the dashboard by type
    appId, // Optional (uuid): if you haven't defined process.env.LLMONITOR_APP_ID
  })

  try {
    
    // An user message was received and you're starting a chain / agent.
    monitor.promptReceived(userPrompt)

    let finished = false
    
    while (!finished) {
      const chat = [systemMessage, userPrompt]

      monitor.LLMcall(chat, model)
      const intermediaryResult = await doLLMquery(chat)
      monitor.LLMresult(intermediaryResult)

      // Log anything else use
      monitor.log(`Running tool Google Search with input xxxxx`)
    }

    // Optional: track when the response starts streaming to the user
    monitor.streamingStarts()

    // Track when you've received the final answer (streaming finished) to send the user
    monitor.assistantAnswered(answer)

    // pass the convoId to keep the context in the next queries
    return { answer, convoId: convo.id }

  } catch (err) {
    // Track errors at any point
    monitor.error('Some error', error)
  }
}

```

