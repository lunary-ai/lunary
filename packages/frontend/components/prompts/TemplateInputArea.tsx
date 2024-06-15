import { Text, ScrollArea, Group, Box } from "@mantine/core"
import SmartViewer from "@/components/SmartViewer"
import TokensBadge from "../blocks/TokensBadge"
import { PromptEditor } from "./PromptEditor"

import DOMPurify from "dompurify"
import { Marked } from "marked"
import markedCodePreview from "marked-code-preview"

const marked = new Marked();

marked.use({ gfm: true });
marked.use(markedCodePreview());

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
    <Box h="100%">
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
          <SmartViewer data={output} error={error} controls={[
            { label: 'Text', value: 'text', parse: (data) => data },
            {
              value: 'md',
              label: 'Preview',
              parse: (data) => DOMPurify.sanitize(
                marked.parse(data) as string
              )
            }
          ]}/>
        </>
      )}
    </Box>
  )
}

export default TemplateInputArea
