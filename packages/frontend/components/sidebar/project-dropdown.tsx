import { useMemo, useState } from "react";

import {
  Button,
  Combobox,
  Input,
  InputBase,
  ThemeIcon,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { IconAnalyze, IconPlus } from "@tabler/icons-react";

type ProjectSummary = {
  id: string;
  name: string;
};

interface ProjectDropdownProps {
  project?: ProjectSummary | null;
  projects: ProjectSummary[];
  onSelect: (projectId: string) => Promise<void> | void;
  onCreateProject: () => Promise<void> | void;
  createProjectLoading: boolean;
}

export function ProjectDropdown({
  project,
  projects,
  onSelect,
  onCreateProject,
  createProjectLoading,
}: ProjectDropdownProps) {
  const [search, setSearch] = useState("");

  const projectsCombobox = useCombobox({
    onDropdownClose: () => {
      projectsCombobox.resetSelectedOption();
      setSearch("");
    },
    onDropdownOpen: () => {
      projectsCombobox.focusSearchInput();
    },
  });

  const projectOptions = useMemo(() => {
    return projects
      .filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => (
        <Combobox.Option value={item.id} key={item.id}>
          {item.name}
        </Combobox.Option>
      ));
  }, [projects, search]);

  return (
    <Combobox
      store={projectsCombobox}
      withinPortal={false}
      onOptionSubmit={async (id) => {
        if (!id) return;

        await onSelect(id);
        projectsCombobox.closeDropdown();
      }}
      styles={{
        dropdown: { minWidth: "fit-content", maxWidth: 600 },
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          size="xs"
          variant="unstyled"
          w="100%"
          fw={500}
          fz="xl"
          type="button"
          style={{
            textOverflow: "ellipsis",
            overflow: "hidden",
          }}
          pointer
          leftSection={
            <ThemeIcon size={19} ml={-4} variant="light">
              <IconAnalyze size={15} />
            </ThemeIcon>
          }
          rightSection={<Combobox.Chevron />}
          onClick={() => projectsCombobox.toggleDropdown()}
          rightSectionPointerEvents="none"
        >
          <Tooltip label={project?.name}>
            {project?.name ? (
              <span
                style={{
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  height: "100%",
                  display: "block",
                }}
              >
                {project.name}
              </span>
            ) : (
              <Input.Placeholder>Select project</Input.Placeholder>
            )}
          </Tooltip>
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown w={400}>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Type to filter..."
          style={{
            top: 0,
            zIndex: 2,
            position: "sticky",
          }}
        />
        <Combobox.Options>
          {projectOptions.length > 0 ? (
            projectOptions
          ) : (
            <Combobox.Empty>No projects found</Combobox.Empty>
          )}
        </Combobox.Options>
        <Combobox.Footer>
          <Button
            loading={createProjectLoading}
            onClick={onCreateProject}
            data-testid="new-project"
            variant="light"
            fullWidth
            leftSection={<IconPlus size={12} />}
          >
            Create Project
          </Button>
        </Combobox.Footer>
      </Combobox.Dropdown>
    </Combobox>
  );
}
