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
