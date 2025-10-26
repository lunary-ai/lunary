import {
  ActionIcon,
  Box,
  Badge,
  FocusTrap,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Skeleton,
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
      disableRightSectionRotation
      onDoubleClick={() => {
        setRename(template.id);
      }}
      styles={{
        children: {
          paddingInlineStart: 0,
        },
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
      rightSection={
        (hasAccess(user.role, "prompts", "create") ||
          hasAccess(user.role, "prompts", "update") ||
          hasAccess(user.role, "prompts", "delete")) && (
          <Menu withinPortal position="right-start">
            <Menu.Target>
              <div
                data-template-menu-trigger="true"
                style={{ display: "flex", alignItems: "center" }}
              >
                {active || hovered ? (
                  <ActionIcon
                    size="sm"
                    radius="sm"
                    variant="subtle"
                    data-template-menu-trigger="true"
                  >
                    <IconDotsVertical size={12} />
                  </ActionIcon>
                ) : (
                  <span />
                )}
              </div>
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
      onClick={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("[data-template-menu-trigger='true']")) {
          return;
        }

        if (sortedVersions[0]) {
          switchTemplateVersion(template, sortedVersions[0]);
        }
      }}
    >
      <ScrollArea.Autosize mah="200px">
        {sortedVersions.map((version, i) => (
          <NavLink
            key={i}
            pl={20}
            // py={4}
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
  const [filteredTemplates, setFilteredTemplates] = useState(templates ?? []);

  useEffect(() => {
    if (!templates) {
      setFilteredTemplates([]);
      return;
    }

    setFilteredTemplates(
      templates.filter((t) => t.slug.includes(filter.toLowerCase())),
    );
  }, [filter, templates]);

  const skeletonWidths = [72, 60, 66, 54, 68, 58];

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        style={{
          height: "63px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgba(120, 120, 120, 0.1)",
        }}
      >
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
      </Box>

      <Box px="md" py="xs">
        <SearchBar
          placeholder="Filter..."
          query={filter}
          setQuery={setFilter}
          size="xs"
          w="100%"
        />
      </Box>

      <ScrollArea
        style={{ flex: 1 }}
        offsetScrollbars
        type="auto"
        scrollbarSize={6}
      >
        {loading ? (
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "12px 10px",
            }}
          >
            {skeletonWidths.map((width, index) => (
              <Box
                key={index}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(120, 120, 120, 0.06)",
                }}
              >
                <Group justify="space-between" align="center" gap="xs">
                  <Skeleton height={14} width={`${width}%`} radius="sm" />
                  <Skeleton height={18} width={18} radius="xl" />
                </Group>
              </Box>
            ))}
          </Box>
        ) : (
          filteredTemplates?.map((template, index) => (
            <TemplateListItem
              key={index}
              template={template}
              activeTemplate={activeTemplate}
              activeVersion={activeVersion}
              rename={rename}
              setRename={setRename}
              switchTemplateVersion={switchTemplateVersion}
            />
          ))
        )}
      </ScrollArea>
    </Box>
  );
}

export default TemplateList;
