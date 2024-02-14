import { Badge, Box, Group, Stack, Text, Textarea } from "@mantine/core"
import { TemplateVariables } from "shared"

export default function PromptVariableEditor({
  variables = {},
  updateVariable,
}: {
  variables: TemplateVariables
  updateVariable: any
}) {
  const hasVariables = Object.keys(variables).length > 0
  return (
    <Box>
      <Text size="sm" fw="500">
        Variables
      </Text>

      {!hasVariables && (
        <Text c="dimmed" size="sm">
          {`You can use {{variable}} to insert variables into your prompts`}
        </Text>
      )}
      <Stack mt="sm">
        {Object.keys(variables).map((variable) => (
          <Group key={variable} align="center" justify="space-between" gap="lg">
            <Badge
              key={variable}
              maw="14%"
              variant="outline"
              style={{ textTransform: "none" }}
            >
              {variable}
            </Badge>
            <Textarea
              size="xs"
              w="85%"
              required={true}
              radius="sm"
              rows={1}
              value={variables[variable]}
              onChange={(e) => updateVariable(variable, e.target.value)}
            />
          </Group>
        ))}
      </Stack>
    </Box>
  )
}
