import { ActionIcon, Group, Select } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { MODELS } from "shared";

// TODO: interface for Model
export default function ModelSelect({ handleChange, selectedModel }) {
  const router = useRouter();
  const [models, setModels] = useState(MODELS);

  return (
    <Select
      data={MODELS.map((model) => ({
        value: model.id,
        label: model.name,
      }))}
      w={250}
      size="xs"
      searchable
      inputMode="search"
      value={selectedModel}
      onChange={handleChange}
    />
  );
}
