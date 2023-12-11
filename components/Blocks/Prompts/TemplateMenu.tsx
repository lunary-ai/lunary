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
import { useMemo } from "react"
import { generateSlug } from "random-word-slugs"
import { formatDistanceToNow } from "date-fns"
import Router from "next/router"

const TemplateList = ({ activeTemplate, switchTemplate }) => {
  const { app } = useCurrentApp()
  const { profile } = useProfile()

  const { templates, loading, update, insert } = useTemplates()

  // each version is a different row
  // group them by slug
  const templatesGrouped = useMemo(() => {
    const grouped = templates?.reduce((acc, template) => {
      const index = acc.findIndex((group) => group[0].slug === template.slug)
      if (index === -1) {
        acc.push([template])
      } else {
        acc[index].push(template)
      }

      return acc
    }, [])
    return grouped
      ?.sort((a, b) => new Date(b[0].created_at) - new Date(a[0].created_at)) // add a lastVersion property to the each template
      .map((group) => {
        const lastVersion = group.sort((a, b) => b.version - a.version)[0]
          .version
        return group.map((template) => ({ ...template, lastVersion }))
      })
  }, [templates])

  const createTemplate = async () => {
    const slug = generateSlug(2)
    const data = await insert([
      {
        ...defaultTemplate,
        name: slug,
        app_id: app.id,
        org_id: profile.org.id,
        version: 1,
        slug,
      },
    ])

    switchTemplate(data[0])
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
      {templatesGrouped?.map((versionGroup, index) => (
        <NavLink
          key={index}
          px="md"
          active={activeTemplate?.slug === versionGroup[0].slug}
          label={versionGroup[0]?.name}
          opened={activeTemplate?.slug === versionGroup[0].slug}
          onClick={() => switchTemplate(versionGroup[0])}
        >
          <ScrollArea.Autosize mah="200px">
            {versionGroup
              .sort((a, b) => b.version - a.version)
              .map((template, i) => (
                <NavLink
                  key={template.id}
                  active={activeTemplate?.id === template.id}
                  label={
                    <Group gap={8}>
                      <Text>{`v${template.version}`}</Text>
                      {i === 0 && (
                        <Badge size="xs" color="blue" variant="outline">
                          Live
                        </Badge>
                      )}

                      <Text c="dimmed" span size="sm" ml="auto">
                        {formatDistanceToNow(new Date(template.created_at), {
                          addSuffix: true,
                        })
                          .replace("minute", "min")
                          .replace(" hour", "h")}
                      </Text>
                    </Group>
                  }
                  onClick={() => switchTemplate(template)}
                />
              ))}
          </ScrollArea.Autosize>
        </NavLink>
      ))}
    </ScrollArea>
  )
}

export default TemplateList
