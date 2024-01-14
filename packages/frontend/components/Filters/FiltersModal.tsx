import {
  Button,
  Card,
  Fieldset,
  Flex,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core"
import { IconCircleCheck, IconCirclePlus } from "@tabler/icons-react"
import classes from "./index.module.css"
import { FILTERS, Filter } from "shared"
import FILTERS_UI_DATA from "./UIData"

function FilterCard({ onItemClick, filter, isSelected }) {
  const theme = useMantineTheme()

  const uiData = FILTERS_UI_DATA[filter.id] || FILTERS_UI_DATA["other"]

  if (!uiData) {
    return null
  }

  return (
    <Card key={filter.id} onClick={() => onItemClick(filter.id)} withBorder>
      <UnstyledButton>
        <Flex
          justify="right"
          pos="absolute"
          top="6px"
          right="6px"
          h="30"
          w="30"
        >
          {isSelected ? (
            <IconCircleCheck size="20" color="#4589df" />
          ) : (
            <IconCirclePlus size="20" color="#bfc4cd" />
          )}
        </Flex>

        <Stack align="center" gap="0" pt="10" maw="100%">
          <uiData.icon color={theme.colors[uiData.color][7]} size="22px" />
          <Text size="xs" mt={7} fw="500">
            {filter.name}
          </Text>
        </Stack>
      </UnstyledButton>
    </Card>
  )
}

// TODO: search bar
// TODO: separate each filter type (basic, smart, ai) in tab
// TODO: coming soon badge
export default function FiltersModal({
  filters = FILTERS,
  opened,
  setOpened,
  selected,
  onItemClick,
}: {
  filters: Filter[]
  opened: boolean
  setOpened: (opened: boolean) => void
  selected: any
  onItemClick: (id: string) => void
}) {
  const types = ["Basic", "Smart", "AI"]

  return (
    <Modal
      title="Assertion Library"
      opened={opened}
      onClose={() => {
        setOpened(false)
      }}
      size="xl"
    >
      <Stack gap="xl">
        {types
          .filter((type) =>
            filters.some((filter) => filter.uiType === type.toLowerCase()),
          )
          .map((type) => (
            <Stack key={type} gap="md">
              <Fieldset
                variant="filled"
                legend={
                  <Title mt={-3} order={3}>
                    {type}
                  </Title>
                }
              >
                <SimpleGrid cols={5} spacing="md">
                  {filters
                    .filter((filter) => filter.uiType === type.toLowerCase())
                    .map((filter) => (
                      <FilterCard
                        key={filter.id}
                        filter={filter}
                        isSelected={selected.find((s) => s.id === filter.id)}
                        onItemClick={onItemClick}
                      />
                    ))}
                </SimpleGrid>
              </Fieldset>
            </Stack>
          ))}
      </Stack>

      <Flex
        className={classes["footer-container"]}
        align="center"
        justify="end"
      >
        <Button
          size="xs"
          onClick={() => {
            setOpened(false)
          }}
        >
          Add
        </Button>
      </Flex>
    </Modal>
  )
}
