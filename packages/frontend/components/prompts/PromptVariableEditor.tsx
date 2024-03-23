import {
  Badge,
  Box,
  Group,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core"
import { IconInfoCircle } from "@tabler/icons-react"
import { TemplateVariables } from "shared"

export default function PromptVariableEditor({
  value = {},
  onChange,
}: {
  value: TemplateVariables
  onChange: (value: TemplateVariables) => void
}) {
  const hasVariables = Object.keys(value).length > 0
  return (
    <Box>
      <Group mb="md" align="center" justify="space-between">
        <Text size="sm" fw="bold">
          Variables
        </Text>
        <Tooltip label="Add variables to your template in the {{ mustache }} format">
          <IconInfoCircle size={16} />
        </Tooltip>
      </Group>

      {!hasVariables && (
        <Text c="dimmed" size="sm">
          {`Use {{variable}} to insert variables.`}
        </Text>
      )}
      <Stack mt="sm">
        {Object.keys(value)
          .sort()
          .map((variable) => (
            <Group
              key={variable}
              align="center"
              wrap="nowrap"
              justify="space-between"
              gap="lg"
            >
              <Badge
                key={variable}
                miw={30}
                maw="34%"
                miw={70}
                px={0}
                variant="outline"
                tt="none"
              >
                {variable}
              </Badge>
              <Textarea
                size="xs"
                w="100%"
                required={true}
                radius="sm"
                rows={1}
                autosize
                maxRows={4}
                defaultValue={value[variable]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [variable]: e.currentTarget.value,
                  })
                }
              />
            </Group>
          ))}
      </Stack>
    </Box>
  )
}
