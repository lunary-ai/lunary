import { Group, Pill, Select, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { Model, MODELS, PROVIDERS } from "shared";
import classes from "./ModelSelect.module.css";
import { useCustomModels } from "@/utils/dataHooks/provider-configs";

export default function ModelSelect({ handleChange }) {
  const defaultModel = MODELS[0];
  const [selectedModel, setSelectedModel] = useState<{
    label: string;
    value: string;
    isCustom: boolean;
  }>(() => ({
    label: defaultModel?.name ?? "",
    value: defaultModel?.id ?? "",
    isCustom: Boolean(defaultModel?.isCustom),
  }));
  const { customModels, isLoading } = useCustomModels();

  const models = useMemo(() => {
    const modelsMap = new Map<string, Model>();

    MODELS.forEach((model) => {
      modelsMap.set(model.id, model);
    });

    customModels.forEach((model) => {
      modelsMap.set(model.id, model);
    });

    return Array.from(modelsMap.values());
  }, [customModels]);

  const groupedModels = groupModelsByProvider(models);
  const modelsById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );

  useEffect(() => {
    const fallback = models[0];

    if (!selectedModel.value) {
      if (fallback) {
        setSelectedModel({
          value: fallback.id,
          label: fallback.name,
          isCustom: Boolean(fallback.isCustom),
        });
        handleChange(fallback);
      }
      return;
    }

    const matchingModel = modelsById.get(selectedModel.value);

    if (!matchingModel) {
      if (fallback) {
        setSelectedModel({
          value: fallback.id,
          label: fallback.name,
          isCustom: Boolean(fallback.isCustom),
        });
        handleChange(fallback);
      } else {
        setSelectedModel({ value: "", label: "", isCustom: false });
      }
      return;
    }

    if (
      matchingModel.name !== selectedModel.label ||
      Boolean(matchingModel.isCustom) !== selectedModel.isCustom
    ) {
      setSelectedModel({
        value: matchingModel.id,
        label: matchingModel.name,
        isCustom: Boolean(matchingModel.isCustom),
      });
    }
  }, [
    handleChange,
    models,
    modelsById,
    selectedModel.label,
    selectedModel.isCustom,
    selectedModel.value,
  ]);

  const selectedValue = modelsById.has(selectedModel.value)
    ? selectedModel.value
    : null;

  return (
    <Select
      data={groupedModels}
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
      value={selectedValue}
      rightSection={selectedModel.isCustom ? <Pill>Custom</Pill> : null}
      rightSectionWidth={selectedModel.isCustom ? 80 : 30}
      rightSectionPointerEvents="none"
      onChange={(_value, model) => {
        if (model) {
          const matchingModel = modelsById.get(model.value);
          setSelectedModel({
            value: model.value,
            label: model.label,
            isCustom: matchingModel?.isCustom ?? false,
          });
          if (matchingModel) {
            handleChange(matchingModel);
          }
        }
      }}
    />
  );
}

interface ModelOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

interface GroupedData {
  group: string;
  items: ModelOption[];
}

function groupModelsByProvider(models: Model[]) {
  const grouped = new Map<string, ModelOption[]>();

  models.forEach((model) => {
    if (!grouped.has(model.provider)) {
      grouped.set(model.provider, []);
    }

    grouped.get(model.provider)!.push({
      value: model.id,
      label: model.name,
      isCustom: model.isCustom,
    });
  });

  const knownProviders = PROVIDERS.filter(({ name }) => grouped.has(name)).map(
    (provider) => ({
      group: provider.displayName,
      items: grouped.get(provider.name)!,
    }),
  );

  const remainingProviders = Array.from(grouped.entries())
    .filter(([providerName]) => !PROVIDERS.some(({ name }) => name === providerName))
    .map(([providerName, items]) => ({
      group: providerName,
      items,
    }));

  return [...knownProviders, ...remainingProviders];
}
