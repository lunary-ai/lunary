import { Select } from "@mantine/core";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MODELS } from "shared";
import classes from "./ModelSelect.module.css";
import { useCustomModels } from "@/utils/dataHooks/provider-configs";

interface Model {
  id: string;
  name: string;
  provider: string;
}
export default function ModelSelect({ handleChange, selectedModel }) {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>(MODELS);
  const { customModels } = useCustomModels();

  useEffect(() => {
    if (customModels.length) {
      setModels([...models, ...customModels]);
    }
  }, [customModels]);

  console.log(models);
  const groupedModels = groupModelsByProvider(models);

  // TODO: display provider name instead of provider id
  return (
    <Select
      data={groupedModels}
      classNames={{
        groupLabel: classes["group-label"],
      }}
      w={250}
      size="xs"
      searchable
      inputMode="search"
      value={selectedModel}
      onChange={handleChange}
    />
  );
}

interface GroupedData {
  group: string;
  items: { value: string; label: string }[];
}
function groupModelsByProvider(models: Model[]) {
  const groupedData: GroupedData[] = [];
  const providerGroups = {};

  for (const model of models) {
    const provider = model.provider;

    if (!providerGroups[provider]) {
      providerGroups[provider] = [];
      groupedData.push({
        group: provider,
        items: providerGroups[provider],
      });
    }

    providerGroups[provider].push({
      value: model.id,
      label: model.name,
    });
  }

  return groupedData;
}
