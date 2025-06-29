import {
  ActionIcon,
  Badge,
  Divider,
  FocusTrap,
  Group,
  Loader,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconDotsVertical,
  IconLayersSubtract,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { useTemplate, useTemplates, useUser } from "@/utils/dataHooks";
import { useHover } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

import { cleanSlug, formatCompactFromNow } from "@/utils/format";
import Router from "next/router";
import { useEffect, useState } from "react";
import { hasAccess } from "shared";
import SearchBar from "../blocks/SearchBar";

export const defaultTemplateVersion = {
  content: [
    { content: "You are a helpful assistant.", role: "system" },
    {
      content: "Hi! My name is {{user_name}}. Can you help me with {{task}}?",
      role: "user",
    },
  ],
  extra: {
    model: "gpt-4.1",
    temperature: 1.0,
    max_tokens: 2048,
    stream: true,
    top_p: 1.0,
  },
  testValues: {
    user_name: "Alice",
    task: "learning Python",
  },
  isDraft: true,
};

function TemplateListItem({
  template,
  activeTemplate,
  activeVersion,
  rename,
  setRename,
  switchTemplateVersion,
}) {
  const { templates, mutate, insert } = useTemplates();
  const { remove, update } = useTemplate(template?.id);
  const { user } = useUser();

  const lastDeployed = template.versions
    .filter((v) => v && !v.isDraft)
    .sort((a, b) => b.id - a.id)[0];

  const { hovered, ref } = useHover();

  const active = activeTemplate?.id === template.id;

  const sortedVersions = template.versions.sort((a, b) => b.id - a.id);

  const confirmDelete = () => {
    modals.openConfirmModal({
      title: (
        <Text size="lg" fw={700}>
          Please confirm your action
        </Text>
      ),
      confirmProps: { color: "red", "data-testid": "confirm" },
      children: (
        <Text size="sm">
          Are you sure you want to delete this prompt? This action cannot be
          undone and the prompt data will be lost forever.
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },

      onConfirm: async () => {
        switchTemplateVersion(null, defaultTemplateVersion);

        Router.replace(`/prompts`);

        mutate((templates) => templates.filter((t) => t.id !== template?.id), {
          revalidate: false,
        });

        remove();
      },
    });
  };

  async function applyRename(name) {
    setRename(null);
    // make sure it's a valid slug
    const slugified = cleanSlug(name);

    if (slugified === "" || slugified === template.slug) return;

    // if there is already a template with this slug, Show notif
    if (templates?.find((t) => t.slug === slugified && t.id !== template.id)) {
      notifications.show({
        title: "Error",
        message: "This template name is already taken",
        color: "red",
      });
      return;
    }

    await update({ ...template, slug: slugified });

    mutate();
  }

  async function duplicateTemplate() {
    const newTemplate = await insert({
      slug: `${template.slug}-copy`,
      mode: template.mode,
      content: sortedVersions[0].content,
      extra: sortedVersions[0].extra,
      testValues: sortedVersions[0].testValues,
    });

    notifications.show({
      title: "Template duplicated",
      message: `Template ${template.slug} has been duplicated`,
    });

    await mutate();

    switchTemplateVersion(newTemplate, newTemplate?.versions[0]);
  }

  return (
    <NavLink
      ref={ref}
      key={template.id}
      px="md"
      active={false}
      data-testid={`template-navlink-${template.slug}`}
      data-template-slug={template.slug}
      data-template-active={active ? "true" : "false"}
      onDoubleClick={() => {
        setRename(template.id);
      }}
      label={
        rename === template.id ? (
          <FocusTrap key={template.id}>
            <TextInput
              defaultValue={template.slug}
              variant="unstyled"
              data-testid="rename-template-input"
              h={35}
              px={10}
              onKeyPress={(e) => {
                if (e.key === "Enter") applyRename(e.target.value);
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
        paddingInlineStart: "2px",
      }}
      leftSection={
        (hasAccess(user.role, "prompts", "create") ||
          hasAccess(user.role, "prompts", "update") ||
          hasAccess(user.role, "prompts", "delete")) && (
          <Menu>
            <Menu.Target>
              {active || hovered ? (
                <ActionIcon size="sm" radius="sm" variant="subtle">
                  <IconDotsVertical size={12} />
                </ActionIcon>
              ) : (
                <span />
              )}
            </Menu.Target>
            <Menu.Dropdown>
              {hasAccess(user.role, "prompts", "update") && (
                <Menu.Item
                  leftSection={<IconPencil size={13} />}
                  onClick={() => {
                    setRename(template.id);
                  }}
                >
                  Rename
                </Menu.Item>
              )}

              {hasAccess(user.role, "prompts", "create") && (
                <Menu.Item
                  leftSection={<IconLayersSubtract size={13} />}
                  onClick={() => {
                    duplicateTemplate();
                  }}
                >
                  Duplicate
                </Menu.Item>
              )}

              {hasAccess(user.role, "prompts", "delete") && (
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={13} />}
                  onClick={() => {
                    confirmDelete();
                  }}
                >
                  Delete
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )
      }
      onClick={() => {
        if (sortedVersions[0])
          switchTemplateVersion(template, sortedVersions[0]);
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
                  {formatCompactFromNow(version?.createdAt)}
                </Text>
              </Group>
            }
            onClick={() => switchTemplateVersion(template, version)}
          />
        ))}
      </ScrollArea.Autosize>
    </NavLink>
  );
}

function TemplateList({
  activeTemplate,
  activeVersion,
  rename,
  setRename,
  createTemplate,
  isInserting,
  switchTemplateVersion,
}) {
  const { templates, loading } = useTemplates();
  const { user } = useUser();

  const [filter, setFilter] = useState("");
  const [filteredTemplates, setFilteredTemplates] = useState(templates);

  useEffect(() => {
    if (templates) {
      setFilteredTemplates(
        templates.filter((t) => t.slug.includes(filter.toLowerCase())),
      );
    }
  }, [filter, templates]);

  if (loading) return <Loader />;

  return (
    <ScrollArea h="100%">
      <div style={{ height: "63px", display: "flex", alignItems: "center" }}>
        <NavLink
          p="md"
          label="Prompt directory"
          fw="bold"
          variant="subtle"
          style={{ width: "100%" }}
          rightSection={
            hasAccess(user.role, "prompts", "create") && (
              <ActionIcon
                size="xs"
                radius="sm"
                variant="outline"
                loading={isInserting}
                data-testid="create-template"
                onClick={createTemplate}
              >
                <IconPlus size={12} />
              </ActionIcon>
            )
          }
        />
      </div>

      <Divider />

      <SearchBar
        placeholder="Filter..."
        query={filter}
        size="xs"
        w="fit-content"
        mx="md"
        my="xs"
        setQuery={setFilter}
      />

      {filteredTemplates?.map((template, index) => (
        <TemplateListItem
          key={index}
          template={template}
          activeTemplate={activeTemplate}
          activeVersion={activeVersion}
          rename={rename}
          setRename={setRename}
          switchTemplateVersion={switchTemplateVersion}
        />
      ))}
    </ScrollArea>
  );
}

export default TemplateList;
