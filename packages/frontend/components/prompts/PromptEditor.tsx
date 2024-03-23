import { Box, Stack, Textarea, ActionIcon } from "@mantine/core"
import { IconCircleMinus, IconCirclePlus } from "@tabler/icons-react"
import { ChatMessage } from "@/components/SmartViewer/Message"

export function PromptEditor({
  value,
  onChange,
  isText,
}: {
  value: any
  onChange: (value: any) => void
  isText: boolean
}) {
  if (isText) {
    return (
      <Textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.currentTarget.value)}
        minRows={5}
        data-testid="prompt-text-editor"
        mb="lg"
        autosize
      />
    )
  } else {
    return (
      <Stack>
        {Array.isArray(value) &&
          value.map((message, i) => (
            <Box pos="relative" key={i}>
              <ChatMessage
                data={message}
                key={i}
                editable={true}
                onChange={(newMessage) => {
                  const newContent = value ? [...value] : []
                  newContent[i] = newMessage
                  onChange(newContent)
                }}
              />
              <ActionIcon
                pos="absolute"
                top={4}
                right={4}
                size="sm"
                color="red"
                variant="transparent"
                onClick={() => {
                  const newContent = [...value]
                  newContent.splice(i, 1)
                  onChange(newContent)
                }}
              >
                <IconCircleMinus size="12" />
              </ActionIcon>
            </Box>
          ))}
        <ActionIcon
          mx="auto"
          mt="xs"
          variant="transparent"
          color="gray"
          onClick={() => {
            const newContent = [...(value || []), { content: "", role: "user" }]
            onChange(newContent)
          }}
        >
          <IconCirclePlus size="16" />
        </ActionIcon>
      </Stack>
    )
  }
}
