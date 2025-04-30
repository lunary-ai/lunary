import { useState, useEffect } from "react"
import { Button, Popover, Select, Text, Group, Slider, Stack, Switch } from "@mantine/core"
import { IconSettings, IconCheck } from "@tabler/icons-react"
import type { PromptVersion } from "@/types/prompt-types"

interface PromptVersionSelectorProps {
  version: PromptVersion
  availableVersions: PromptVersion[]
  onSelectVersion: (versionId: string) => void
  onUpdateVersion: (version: PromptVersion) => void
}

export function PromptVersionSelector({
  version,
  availableVersions,
  onSelectVersion,
  onUpdateVersion,
}: PromptVersionSelectorProps) {
  const [syncSettings, setSyncSettings] = useState(true)
  const [localVersion, setLocalVersion] = useState<PromptVersion>(version)

  // Update local state when props change
  useEffect(() => {
    setLocalVersion(version)
  }, [version])

  const handleModelChange = (modelValue: string | null) => {
    if (!modelValue) return

    console.log("Model changed to:", modelValue)
    const updatedVersion = {
      ...localVersion,
      model: modelValue,
    }
    setLocalVersion(updatedVersion)
    onUpdateVersion(updatedVersion)
  }

  const handleTemperatureChange = (value: number) => {
    console.log("Temperature changed to:", value)
    const updatedVersion = {
      ...localVersion,
      temperature: value,
    }
    setLocalVersion(updatedVersion)
    onUpdateVersion(updatedVersion)
  }

  const handleMaxTokensChange = (value: number) => {
    console.log("Max tokens changed to:", value)
    const updatedVersion = {
      ...localVersion,
      max_tokens: value,
    }
    setLocalVersion(updatedVersion)
    onUpdateVersion(updatedVersion)
  }

  const handleTopPChange = (value: number) => {
    console.log("Top P changed to:", value)
    const updatedVersion = {
      ...localVersion,
      top_p: value,
    }
    setLocalVersion(updatedVersion)
    onUpdateVersion(updatedVersion)
  }

  const models = [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ]

  return (
    <Group>
      <Select
        value={version.id || ""}
        onChange={onSelectVersion}
        data={availableVersions.map((v) => ({ value: v.id, label: v.name }))}
        placeholder="Select version"
        w={180}
      />

      <Popover width={300} position="bottom" shadow="md">
        <Popover.Target>
          <Button variant="outline" size="sm" p={0} w={32} h={32}>
            <IconSettings size={16} />
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack>
            <Group justify="space-between">
              <Text size="sm">Apply to both variants.</Text>
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  Sync
                </Text>
                <Switch
                  checked={syncSettings}
                  onChange={(event) => setSyncSettings(event.currentTarget.checked)}
                  size="md"
                  onLabel={<IconCheck size={12} />}
                  offLabel=""
                />
              </Group>
            </Group>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Model
              </Text>
              <Select
                value={localVersion.model}
                onChange={handleModelChange}
                data={models}
                placeholder="Select model"
              />
            </Stack>

            <Text size="sm" fw={500} mt="md">
              Model configuration
            </Text>

            <Stack gap="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Temperature
                  </Text>
                  <Text size="sm" ff="monospace">
                    {localVersion.temperature.toFixed(2)}
                  </Text>
                </Group>
                <Slider
                  min={0}
                  max={2}
                  step={0.01}
                  value={localVersion.temperature}
                  onChange={handleTemperatureChange}
                />
              </Stack>

              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Max tokens
                  </Text>
                  <Text size="sm" ff="monospace">
                    {localVersion.max_tokens}
                  </Text>
                </Group>
                <Slider min={1} max={8192} step={1} value={localVersion.max_tokens} onChange={handleMaxTokensChange} />
              </Stack>

              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Top P
                  </Text>
                  <Text size="sm" ff="monospace">
                    {localVersion.top_p.toFixed(2)}
                  </Text>
                </Group>
                <Slider min={0} max={1} step={0.01} value={localVersion.top_p} onChange={handleTopPChange} />
              </Stack>
            </Stack>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Group>
  )
}
