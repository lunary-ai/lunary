import { Badge, Box, Stack, Text, Textarea } from "@mantine/core";
import { TemplateVariables } from "shared";

export default function PromptVariableEditor({
  value: templateVariables = {},
  onChange,
}: {
  value: TemplateVariables;
  onChange: (value: TemplateVariables) => void;
}) {
  return (
    <Box>
      <Stack gap="md">
        {Object.entries(templateVariables)
          .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
          .map(([name, value]) => (
            <Stack key={name} gap="xs">
              <Text
                size="xs"
                component="span"
                c="blue"
                ff="monospace"
              >{`{{${name}}}`}</Text>
              <Textarea
                size="sm"
                w="100%"
                radius="sm"
                placeholder="Enter an value here"
                minRows={3}
                maxRows={8}
                autosize
                value={value}
                onChange={(e) =>
                  onChange({
                    ...templateVariables,
                    [name]: e.currentTarget.value,
                  })
                }
              />
            </Stack>
          ))}
      </Stack>
    </Box>
  );
}
