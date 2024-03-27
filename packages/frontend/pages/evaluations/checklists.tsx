import RenamableField from "@/components/blocks/RenamableField"
import CheckPicker from "@/components/checks/Picker"
import { useChecklist, useChecklists, useUser } from "@/utils/dataHooks"
import { cleanSlug } from "@/utils/format"

import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Container,
  Group,
  InputDescription,
  InputLabel,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { generateSlug } from "random-word-slugs"
import { useState } from "react"
import { CheckLogic, hasAccess } from "shared"

function ChecklistCard({ defaultValue, onDelete }) {
  const { checklist, update, remove } = useChecklist(
    defaultValue?.id,
    defaultValue,
  )

  return (
    <Card p="lg" withBorder pos="relative" style={{ overflow: "visible" }}>
      <ActionIcon
        pos="absolute"
        top={-15}
        right={-15}
        style={{ zIndex: 10 }}
        onClick={async () => {
          modals.openConfirmModal({
            title: "Please confirm your action",
            confirmProps: { color: "red" },
            children: (
              <Text size="sm">
                Are you sure you want to delete this checklist? This action
                cannot be undone.
              </Text>
            ),
            labels: { confirm: "Confirm", cancel: "Cancel" },

            onConfirm: async () => {
              onDelete()
              remove()
            },
          })
        }}
        color="red"
        variant="subtle"
      >
        <IconTrash size={16} />
      </ActionIcon>
      <Stack>
        <Group>
          <RenamableField
            defaultValue={checklist?.slug}
            onRename={(newName) => {
              const cleaned = cleanSlug(newName)
              update(
                { slug: cleaned },
                { optimisticData: (data) => ({ ...data, slug: cleaned }) },
              )
            }}
          />
        </Group>
        <CheckPicker
          value={checklist?.data}
          restrictTo={(filter) => !filter.disableInEvals}
          onChange={(newData) => {
            update(
              { data: newData },
              { optimisticData: (data) => ({ ...data, data: newData }) },
            )
          }}
        />
      </Stack>
    </Card>
  )
}

export function ChecklistModal({ open, onClose }) {
  const [slug, setSlug] = useState(generateSlug())
  const [data, setData] = useState<CheckLogic>(["AND"])

  const { insert, isInserting, mutate } = useChecklists("evaluation")

  async function createChecklist() {
    if (!slug.length || data.length < 2) return

    const res = await insert({
      slug: cleanSlug(slug),
      data,
      type: "evaluation",
    })
    await mutate()
    onClose(res?.id)
  }

  const canCreate = slug.length > 0 && data.length > 1

  return (
    <Modal
      title="Create a new checklist"
      size="lg"
      opened={open}
      onClose={onClose}
    >
      <Stack>
        <TextInput
          label="Slug"
          description="A unique identifier for this set of checks. Can be used in the SDK."
          placeholder="Checklist name"
          value={slug}
          onChange={(e) => setSlug(e.currentTarget.value)}
        />
        <Stack gap={0}>
          <InputLabel mb={-5}>Checks</InputLabel>
          <InputDescription mb={16}>
            Define the checks that will result in a{" "}
            <Text c="green" span fw="bold">
              PASS
            </Text>
            .
          </InputDescription>
          <CheckPicker
            restrictTo={(filter) => !filter.disableInEvals}
            value={data}
            onChange={setData}
          />
        </Stack>
        <Group mt="lg" align="right" justify="space-between">
          <Button onClick={onClose} variant="subtle">
            Cancel
          </Button>
          <Button
            onClick={createChecklist}
            loading={isInserting}
            disabled={!canCreate}
          >
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

export default function Checklists() {
  const { checklists, loading, mutate } = useChecklists("evaluation")
  const { user } = useUser()
  const [checklistModal, setChecklistModal] = useState(false)

  return (
    <Container>
      <ChecklistModal
        open={checklistModal}
        onClose={() => {
          setChecklistModal(false)
          mutate()
        }}
      />
      <Stack>
        <Group align="center" justify="space-between">
          <Group align="center">
            <Title>Checklists</Title>
          </Group>

          {hasAccess(user.role, "checklists", "create") && (
            <Button
              leftSection={<IconPlus size={12} />}
              variant="default"
              onClick={() => setChecklistModal(true)}
            >
              New Checklist
            </Button>
          )}
        </Group>

        <Text size="lg" mb="md">
          Checklists are collections of assertions that you can use in
          evaluations (SDK or Dashboard).
        </Text>

        {loading ? (
          <Loader />
        ) : (
          <Stack gap="xl">
            <>
              {!checklists?.length ? (
                <Alert color="gray" title="No checklist yet" />
              ) : (
                <>
                  {checklists?.map((checklist) => (
                    <ChecklistCard
                      key={checklist.id}
                      defaultValue={checklist}
                      onDelete={() => {
                        mutate(
                          checklists.filter((c) => c.id !== checklist.id),
                          {
                            revalidate: false,
                          },
                        )
                      }}
                    />
                  ))}
                </>
              )}
            </>
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
