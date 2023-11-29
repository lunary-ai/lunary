import { Box, Button, Menu } from "@mantine/core"
import { IconArrowBarUp, IconBraces, IconFileExport } from "@tabler/icons-react"
import { useProfile } from "../../utils/dataHooks"
import { modals } from "@mantine/modals"

export default function ExportButton({ exportUrl } = { exportUrl: "" }) {
  const { profile } = useProfile()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (profile?.org.plan === "free") {
      e.preventDefault()
      modals.openContextModal({
        modal: "upgrade",
        size: 900,
        innerProps: {
          highlight: "export",
        },
      })
    }
  }

  return (
    <Box>
      <Menu withArrow shadow="sm" position="bottom-end">
        <Menu.Target>
          <Button
            variant="outline"
            size="xs"
            leftSection={<IconArrowBarUp size="16" />}
          >
            Export
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            color="dark"
            leftSection={<IconFileExport size="16" />}
            component="a"
            href={exportUrl}
            onClick={handleClick}
          >
            Export to CSV
          </Menu.Item>
          <Menu.Item
            color="dark"
            disabled
            leftSection={<IconBraces size="16" />}
            onClick={handleClick}
          >
            Export to JSONL
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Box>
  )
}
