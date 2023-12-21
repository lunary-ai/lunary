import { useCurrentApp, useProfile, useTemplates } from "@/utils/dataHooks"
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

import { generateSlug } from "random-word-slugs"
import { formatDistanceToNow } from "date-fns"
import { modals } from "@mantine/modals"
import { useState } from "react"
import { notifications } from "@mantine/notifications"
import { useHover } from "@mantine/hooks"

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
  // mode: "openai",
  extra: {
    model: "gpt-4-1106-preview",
    temperature: 1.0,
    max_tokens: 1000,
    // frequency_penalty: 0,
    // presence_penalty: 0,
    // top_p: 1,
  },
  test_values: {},
}

const TemplateListItem = ({
  template,
  activeTemplate,
  activeVersion,
  rename,
  applyRename,
  setRename,
  confirmDelete,
  switchTemplate,
  switchTemplateVersion,
}) => {
  const lastDeployed = template.versions
    .filter((v) => !v.is_draft)
    .sort((a, b) => b.id - a.id)[0]

  const { hovered, ref } = useHover()

  const active = activeTemplate?.id === template.id

  const sortedVersions = template.versions.sort((a, b) => b.id - a.id)

  return (
    <NavLink
      ref={ref}
      key={template.id}
      px="md"
      active={active}
      label={
        rename === template.id ? (
          <FocusTrap key={template.id}>
            <TextInput
              defaultValue={template.slug}
              variant="unstyled"
              h={35}
              px={10}
              onKeyPress={(e) => {
                if (e.key === "Enter") applyRename(e, template.id)
              }}
              onBlur={(e) => applyRename(e, template.id)}
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
                confirmDelete(template.id)
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

                <Text c="dimmed" span size="xs" ml="auto">
                  {formatDistanceToNow(new Date(version.created_at), {
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
  const { app } = useCurrentApp()
  const { profile } = useProfile()

  const { templates, loading, insert, insertVersion, update, remove, mutate } =
    useTemplates()

  const [rename, setRename] = useState(null)

  const createTemplate = async () => {
    const slug = generateSlug(2)
    const newTemplate = await insert([
      {
        mode: "openai",
        app_id: app?.id,
        org_id: profile?.org.id,
        slug,
      },
    ])

    switchTemplate(newTemplate?.[0])

    if (newTemplate) {
      setRename(newTemplate[0].id)

      const newVersion = await insertVersion([
        {
          template_id: newTemplate[0].id,
          version: 1,
          ...defaultTemplateVersion,
        },
      ])

      switchTemplateVersion(newVersion?.[0])
    }

    mutate()
  }

  const applyRename = async (e, id) => {
    setRename(null)
    // make sure it's a valid slug
    const slugified = slugify(e.target.value)

    if (slugified === "") return

    // if there is already a template with this slug, Show notif
    if (templates?.find((t) => t.slug === slugified && t.id !== id)) {
      notifications.show({
        title: "Error",
        message: "This template name is already taken",
        color: "red",
      })
      return
    }

    await update({ id, slug: slugified })

    mutate()
  }

  const confirmDelete = (id) => {
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
        await remove({ id })
        mutate()
        switchTemplate(null)
        // Router.push(`/prompts`)
      },
    })
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
          applyRename={applyRename}
          confirmDelete={confirmDelete}
          switchTemplate={switchTemplate}
          switchTemplateVersion={switchTemplateVersion}
        />
      ))}
    </ScrollArea>
  )
}

export default TemplateList
