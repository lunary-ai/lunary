import { useState } from "react"

import ChatMessage from "@/components/SmartViewer/ChatMessage"
import { Anchor, Box, Modal, Stack } from "@mantine/core"

const getLastMessage = (messages) => {
  if (Array.isArray(messages)) {
    return messages[messages.length - 1]
  }

  return messages
}

export default function MessageViewer({ data, compact }) {
  const [expand, setExpand] = useState(false)

  const obj = Array.isArray(data) ? data : [data]

  return (
    <>
      {expand && (
        <Modal
          title="Chat History"
          size="lg"
          opened={expand}
          onClose={() => setExpand(false)}
        >
          <Stack>
            {obj.map((message) => (
              <ChatMessage key={message.id} data={message} />
            ))}
          </Stack>
        </Modal>
      )}

      <Box
        onClick={() => compact && setExpand(true)}
        sx={{ cursor: "pointer" }}
      >
        {compact ? (
          <ChatMessage data={getLastMessage(obj)} compact />
        ) : (
          <Stack>
            {obj.map((message) => (
              <ChatMessage key={message.id} data={message} />
            ))}
          </Stack>
        )}

        {obj.length > 1 && compact && (
          <Anchor onClick={() => setExpand(true)}>View all</Anchor>
        )}
      </Box>
      <style jsx>{`
        :global(.mantine-Modal-inner) {
          padding-left: 0; // weird centering bug
        }
      `}</style>
    </>
  )
}
