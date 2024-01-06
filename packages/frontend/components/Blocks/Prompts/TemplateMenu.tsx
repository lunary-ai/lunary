import {
  ActionIcon,
  Badge,
  FocusTrap,
  Group,
  Loader,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  TextInput,
} from "@mantine/core"
import { IconDotsVertical, IconPlus, IconTrash } from "@tabler/icons-react"

import {
  useCurrentProject,
  useOrg,
  useTemplate,
  useTemplates,
} from "@/utils/newDataHooks"
import { useHover } from "@mantine/hooks"
import { modals } from "@mantine/modals"
import { notifications } from "@mantine/notifications"
import { formatDistanceToNow } from "date-fns"
import { generateSlug } from "random-word-slugs"
import { useState } from "react"

const slugify = (text: string): string =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")

export const defaultTemplateVersion = {
  content: [
    { content: "You are an helpful assistant.", role: "system" },
    { content: "Hi!", role: "user" },
  ],
  extra: {
    model: "gpt-4-1106-preview",
    temperature: 1.0,
    max_tokens: 1000,
  },
  testValues: {},
  isDraft: true,
}

const TemplateListItem = ({
  template,
  activeTemplate,
  activeVersion,
  rename,

  setRename,

  switchTemplate,
  switchTemplateVersion,
}) => {
  const { templates, mutate } = useTemplates()
  const { remove, update } = useTemplate(template?.id)

  const lastDeployed = template.versions
    .filter((v) => v && !v.isDraft)
    .sort((a, b) => b.id - a.id)[0]

  const { hovered, ref } = useHover()

  const active = activeTemplate?.id === template.id

  const sortedVersions = template.versions.sort((a, b) => b.id - a.id)

  const confirmDelete = () => {
    modals.openConfirmModal({
      title: "Please confirm your action",
      confirmProps: { color: "red" },
      children: (
        <Text size="sm">
          Are you sure you want to delete this prompt? This action cannot be
          undone and the prompt data will be lost forever.
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },

      onConfirm: async () => {
        await remove()

        mutate()

        switchTemplate(null)
        // Router.push(`/prompts`)
      },
    })
  }

  const applyRename = async (name) => {
    setRename(null)
    // make sure it's a valid slug
    const slugified = slugify(name)

    if (slugified === "" || slugified === template.slug) return

    // if there is already a template with this slug, Show notif
    if (templates?.find((t) => t.slug === slugified && t.id !== template.id)) {
      notifications.show({
        title: "Error",
        message: "This template name is already taken",
        color: "red",
      })
      return
    }

    await update({ ...template, slug: slugified })

    mutate()
  }

  return (
    <NavLink
      ref={ref}
      key={template.id}
      px="md"
      active={active}
      onDoubleClick={() => {
        setRename(template.id)
      }}
      label={
        rename === template.id ? (
          <FocusTrap key={template.id}>
            <TextInput
              defaultValue={template.slug}
              variant="unstyled"
              h={35}
              px={10}
              onKeyPress={(e) => {
                if (e.key === "Enter") applyRename(e.target.value)
              }}
              onBlur={(e) => applyRename(e.target.value)}
            />
          </FocusTrap>
        ) : (
          template.slug
        )
      }
      opened={active}
      style={{
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
      leftSection={
        <Menu withArrow>
          <Menu.Target>
            {active || hovered ? (
              <ActionIcon size="sm" radius="sm" variant="light">
                <IconDotsVertical size={12} />
              </ActionIcon>
            ) : (
              <span />
            )}
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              onClick={() => {
                setRename(template.id)
              }}
            >
              Rename
            </Menu.Item>

            <Menu.Item
              color="red"
              leftSection={<IconTrash size={13} />}
              onClick={() => {
                confirmDelete()
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      }
      onClick={() => {
        switchTemplate(template)
        if (sortedVersions[0]) switchTemplateVersion(sortedVersions[0])
      }}
    >
      <ScrollArea.Autosize mah="200px">
        {sortedVersions.map((version, i) => (
          <NavLink
            key={i}
            pl={20}
            py={4}
            active={activeVersion?.id === version?.id}
            label={
              <Group gap={8}>
                <Text>{`v${template.versions.length - i}`}</Text>

                {version?.isDraft && (
                  <Badge size="xs" color="yellow" variant="outline">
                    Draft
                  </Badge>
                )}

                {version?.id === lastDeployed?.id && (
                  <Badge size="xs" color="blue" variant="outline">
                    Live
                  </Badge>
                )}

                <Text c="dimmed" span size="xs" ml="auto">
                  {formatDistanceToNow(new Date(version?.createdAt), {
                    addSuffix: true,
                  })
                    .replace("about", "~")
                    .replace("minute", "min")
                    .replace(" hours", "h")
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
}

const TemplateList = ({
  activeTemplate,
  activeVersion,
  switchTemplate,
  switchTemplateVersion,
}) => {
  const { org } = useOrg()

  const { templates, loading, insert, mutate } = useTemplates()

  const [rename, setRename] = useState(null)

  const createTemplate = async () => {
    const slug = generateSlug(2)
    const newTemplate = await insert({
      mode: "openai",
      orgId: org?.id,
      slug,
      ...defaultTemplateVersion,
    })

    switchTemplate(newTemplate)
    setRename(newTemplate.id)
    switchTemplateVersion(newTemplate.versions[0])

    mutate()
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
      {templates?.map((template, index) => (
        <TemplateListItem
          key={index}
          template={template}
          activeTemplate={activeTemplate}
          activeVersion={activeVersion}
          rename={rename}
          setRename={setRename}
          switchTemplate={switchTemplate}
          switchTemplateVersion={switchTemplateVersion}
        />
      ))}
    </ScrollArea>
  )
}

export default TemplateList
