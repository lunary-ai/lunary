import {
  Box,
  Loader,
  Stack,
  Textarea,
  Text,
  ActionIcon,
  ScrollArea,
} from "@mantine/core"
import { IconCircleMinus, IconCirclePlus } from "@tabler/icons-react"
import { ChatMessage } from "@/components/Blocks/SmartViewer/Message"
import SmartViewer from "@/components/Blocks/SmartViewer"

interface TemplateInputAreaProps {
  loading: boolean
  template: any
  setTemplate: (template: any) => void
  setHasChanges: (hasChanges: boolean) => void
  saveTemplate: () => void
  output: any
  error: any
}

const TemplateInputArea: React.FC<TemplateInputAreaProps> = ({
  loading,
  template,
  setTemplate,
  saveTemplate,
  setHasChanges,
  output,
  error,
}) => {
  const isText = template?.mode === "text"

  return (
    <ScrollArea h="100%">
      {loading ? (
        <Loader />
      ) : isText ? (
        <Textarea
          value={typeof template?.content === "string" ? template?.content : ""}
          onChange={(e) => {
            setTemplate({ ...template, content: e.currentTarget.value })
            setHasChanges(true)
          }}
          minRows={5}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault()
              // Propagate to parent component or handle the save operation here
              saveTemplate()
            }
          }}
          autosize
        />
      ) : (
        <Stack>
          <Text fw="bold" size="sm">
            Input
          </Text>
          {typeof template?.content !== "undefined" &&
            Array.isArray(template?.content) &&
            template?.content?.map((message, i) => (
              <Box pos="relative" key={i}>
                <ChatMessage
                  data={message}
                  key={i}
                  editable={true}
                  onChange={(newMessage) => {
                    const newContent = template?.content
                      ? [...template?.content]
                      : []
                    newContent[i] = newMessage
                    setTemplate({ ...template, content: newContent })
                    setHasChanges(true)
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
                    const newContent = [...template?.content]
                    newContent.splice(i, 1)
                    setTemplate({ ...template, content: newContent })
                    setHasChanges(true)
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
              const newContent = [
                ...template.content,
                { content: " ", role: "user" },
              ]
              setTemplate({ ...template, content: newContent })
            }}
          >
            <IconCirclePlus size="16" />
          </ActionIcon>

          {(output || error) && (
            <>
              <Text fw="bold" size="sm">
                {error ? "Error" : "Output"}
              </Text>

              <SmartViewer data={output} error={error} />
            </>
          )}
        </Stack>
      )}
    </ScrollArea>
  )
}

export default TemplateInputArea
