import { Badge, Box, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { TemplateVariables } from "shared";
import VariableTextarea from "./VariableTextarea";

export default function PromptVariableEditor({
  value: templateVariables = {},
  onChange,
}: {
  value: TemplateVariables;
  onChange: (value: TemplateVariables) => void;
}) {
  const hasVariables = Object.keys(templateVariables).length > 0;

  return (
    <Box>
      {!hasVariables && (
        <Text c="dimmed" size="sm">
          {`No variables defined. Use {{variable}} in your prompt.`}
        </Text>
      )}
      <Stack>
        {Object.entries(templateVariables)
          .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
          .map(([name, value]) => (
            <Group
              key={name}
              align="center"
              wrap="nowrap"
              justify="space-between"
              gap="lg"
            >
              <Badge
                key={name}
                miw="fit-content"
                maw={100}
                px="sm"
                variant="outline"
                tt="none"
              >
                {name}
              </Badge>
              <VariableTextarea
                size="xs"
                w="100%"
                required={true}
                radius="sm"
                placeholder="Enter content here"
                rows={1}
                maxRows={1}
                name={name}
                value={value}
                onChange={(e) =>
                  onChange({
                    ...templateVariables,
                    [name]: e.currentTarget.value,
                  })
                }
              />
            </Group>
          ))}
      </Stack>
    </Box>
  );
}
