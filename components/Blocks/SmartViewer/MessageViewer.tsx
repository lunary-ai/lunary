import { ChatMessage } from "@/components/Blocks/SmartViewer/Message"
import { ScrollArea, Stack } from "@mantine/core"

const getLastMessage = (messages) => {
  if (Array.isArray(messages)) {
    return messages[messages.length - 1]
  }

  return messages
}

export default function MessageViewer({ data, compact }) {
  const obj = Array.isArray(data) ? data : [data]

  return (
    <>
      {compact ? (
        <ChatMessage data={getLastMessage(obj)} compact />
      ) : (
        <ScrollArea.Autosize mah={700}>
          <Stack>
            {obj.map((message) => (
              <ChatMessage key={message.id} data={message} />
            ))}
          </Stack>
        </ScrollArea.Autosize>
      )}

      <style jsx>{`
        :global(.mantine-Modal-inner) {
          padding-left: 0; // weird centering bug
        }
      `}</style>
    </>
  )
}
