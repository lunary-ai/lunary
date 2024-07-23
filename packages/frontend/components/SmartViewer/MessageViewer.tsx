import { ChatMessage } from "@/components/SmartViewer/Message"
import { Stack } from "@mantine/core"
import classes from "./index.module.css"

function getLastMessage(messages) {
  if (Array.isArray(messages)) {
    return messages[messages.length - 1]
  }

  return messages
}

export default function MessageViewer({ data, compact, piiDetection }) {
  const obj = Array.isArray(data) ? data : [data]

  return compact ? (
    <ChatMessage data={getLastMessage(obj)} compact />
  ) : (
    <div className={classes.messageStack}>
      <Stack>
        {obj.map((message, i) => (
          <ChatMessage key={i} data={message} />
        ))}
      </Stack>
    </div>
  )
}
