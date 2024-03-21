import { Text, ScrollArea, Group } from "@mantine/core"
import SmartViewer from "@/components/SmartViewer"
import TokensBadge from "../blocks/TokensBadge"
import { PromptEditor } from "./PromptEditor"

function TemplateInputArea({
  template,
  setTemplate,
  saveTemplate,
  setHasChanges,
  output,
  outputTokens,
  error,
}: {
  template: any
  setTemplate: (template: any) => void
  saveTemplate: () => void
  setHasChanges: (hasChanges: boolean) => void
  output: any
  outputTokens: number
  error: any
}) {
  const isText = typeof template?.content === "string"
  const handleContentChange = (newContent: any) => {
    setTemplate({ ...template, content: newContent })
    setHasChanges(true)
  }

  return (
    <ScrollArea h="100%">
      <PromptEditor
        value={template?.content}
        onChange={handleContentChange}
        isText={isText}
      />
      {(output || error) && (
        <>
          <Group justify="space-between" mb="lg">
            <Text fw="bold" size="sm">
              {error ? "Error" : "Output"}
            </Text>
            {outputTokens && <TokensBadge tokens={outputTokens} />}
          </Group>
          <SmartViewer data={output} error={error} />
        </>
      )}
    </ScrollArea>
  )
}

export default TemplateInputArea
