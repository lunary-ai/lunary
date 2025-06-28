import { Group, Pill, Select, Text } from "@mantine/core";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Model, MODELS, PROVIDERS } from "shared";
import classes from "./ModelSelect.module.css";
import { useCustomModels } from "@/utils/dataHooks/provider-configs";

export default function ModelSelect({ handleChange }) {
  const [models, setModels] = useState<Model[]>(MODELS);
  const [selectedModel, setSelectedModel] = useState<{
    label: string;
    value: string;
    isCustom: boolean;
  }>({
    label: MODELS[0].name,
    value: MODELS[0].id,
    isCustom: false,
  });
  const { customModels, isLoading } = useCustomModels();

  useEffect(() => {
    if (customModels.length) {
      const dedupedCustom = Array.from(
        new Map(customModels.map((model) => [model.id, model])).values(),
      );
      setModels([...models, ...dedupedCustom]);
    }
  }, [customModels]);

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  const groupedModels = groupModelsByProvider(models);

  const uniqueOptions = Array.from(
    new Map(
      models.map((model) => [
        model.id,
        { value: model.id, label: model.name, isCustom: model.isCustom },
      ]),
    ),
  ).map((entry) => entry[1]);

  return (
    <Select
      data={uniqueOptions}
      classNames={{
        groupLabel: classes["group-label"],
      }}
      renderOption={(item) => {
        if (item.option.isCustom) {
          return (
            <Group key={`${item.option.value}-custom`}>
              <Text size="xs">{item.option.label}</Text>
              <Pill>Custom</Pill>
            </Group>
          );
        }
        return <Group key={item.option.value}>{item.option.label}</Group>;
      }}
      style={{ flex: 1 }}
      size="sm"
      searchable
      inputMode="search"
      value={selectedModel.value}
      rightSection={selectedModel.isCustom ? <Pill>Custom</Pill> : null}
      rightSectionWidth={selectedModel.isCustom ? 80 : 30}
      rightSectionPointerEvents="none"
      onChange={(_value, model) => {
        if (model) {
          setSelectedModel({
            value: model.value,
            label: model.label,
            isCustom: models.find((m) => m.id === model.value)?.isCustom,
          });
          handleChange(models.find((m) => m.id === model.value));
        }
      }}
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
      isCustom: model.isCustom,
    });
  }

  return groupedData.map(({ group, items }) => {
    const provider = PROVIDERS.find((provider) => provider.name === group);
    return {
      group: provider?.displayName || provider?.name,
      items,
    };
  });
}
