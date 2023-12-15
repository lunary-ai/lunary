import { useCurrentApp, useProfile, useTemplates } from "@/utils/dataHooks"
import {
  ActionIcon,
  Badge,
  Group,
  Loader,
  NavLink,
  ScrollArea,
  Text,
} from "@mantine/core"
import { IconPlus } from "@tabler/icons-react"

import { generateSlug } from "random-word-slugs"
import { formatDistanceToNow } from "date-fns"

export const defaultTemplate = {
  content: [
    { content: "You are an helpful assistant.", role: "system" },
    { content: "Hi!", role: "user" },
  ],
  mode: "openai",
  extra: {
    model: "gpt-4-1106-preview",
    temperature: 1.0,
    max_tokens: 1000,
    frequency_penalty: 0,
    presence_penalty: 0,
    top_p: 1,
  },
  test_values: {},
}

const TemplateList = ({
  activeTemplate,
  activeVersion,
  switchTemplate,
  switchTemplateVersion,
}) => {
  const { app } = useCurrentApp()
  const { profile } = useProfile()

  const { templates, loading, insert, insertVersion } = useTemplates()

  const createTemplate = async () => {
    const slug = generateSlug(2)
    const newTemplate = await insert([
      {
        mode: "openai",
        name: slug,
        app_id: app?.id,
        org_id: profile?.org.id,
        slug,
      },
    ])

    switchTemplate(newTemplate?.[0])

    if (newTemplate) {
      const newVersion = await insertVersion([
        {
          template_id: newTemplate[0].id,
          version: 1,
          ...defaultTemplate,
        },
      ])

      console.log(newVersion)

      switchTemplateVersion(newVersion?.[0])
    }
  }

  if (loading) return <Loader />

  return (
    <ScrollArea h="100%">
      <NavLink
        p="md"
        label="Prompts Directory"
        fw="bold"
        variant="subtle"
        rightSection={
          <ActionIcon
            size="xs"
            radius="sm"
            variant="outline"
            onClick={createTemplate}
          >
            <IconPlus size={12} />
          </ActionIcon>
        }
      />
      {templates?.map((template, index) => {
        const lastDeployed = template.versions
          .filter((v) => !v.is_draft)
          .sort((a, b) => b.id - a.id)[0]

        return (
          <NavLink
            key={index}
            px="md"
            active={activeTemplate?.id === template.id}
            label={template?.name}
            opened={activeTemplate?.id === template.id}
            onClick={() => switchTemplate(template)}
          >
            <ScrollArea.Autosize mah="200px">
              {template.versions
                .sort((a, b) => b.id - a.id)
                .map((version, i) => (
                  <NavLink
                    key={i}
                    active={activeVersion?.id === version.id}
                    label={
                      <Group gap={8}>
                        <Text>{`v${template.versions.length - i}`}</Text>

                        {version.is_draft && (
                          <Badge size="xs" color="yellow" variant="outline">
                            Draft
                          </Badge>
                        )}

                        {version.id === lastDeployed?.id && (
                          <Badge size="xs" color="blue" variant="outline">
                            Live
                          </Badge>
                        )}

                        <Text c="dimmed" span size="sm" ml="auto">
                          {formatDistanceToNow(new Date(version.created_at), {
                            addSuffix: true,
                          })
                            .replace("minute", "min")
                            .replace(" hour", "h")}
                        </Text>
                      </Group>
                    }
                    onClick={() => switchTemplateVersion(version)}
                  />
                ))}
            </ScrollArea.Autosize>
          </NavLink>
        )
      })}
    </ScrollArea>
  )
}

export default TemplateList
