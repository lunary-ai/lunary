import { FocusTrap, TextInput, Title } from "@mantine/core"
import { IconPencil } from "@tabler/icons-react"
import { useState } from "react"

function RenamableField({
  defaultValue,
  onRename,
  ...props
}: {
  defaultValue: string
  onRename: (newName: string) => void
  [key: string]: any
}) {
  const [focused, setFocused] = useState(false)

  const doRename = (e) => {
    setFocused(false)
    onRename(e.target.value)
  }

  return focused ? (
    <FocusTrap>
      <TextInput
        defaultValue={defaultValue}
        variant="unstyled"
        data-testid="rename-input"
        h={40}
        px={10}
        onKeyPress={(e) => {
          if (e.key === "Enter") doRename(e)
        }}
        onBlur={(e) => doRename(e)}
      />
    </FocusTrap>
  ) : (
    <Title
      order={3}
      onClick={() => setFocused(true)}
      style={{ cursor: "pointer" }}
      {...props}
    >
      {defaultValue} <IconPencil size="16" />
    </Title>
  )
}

export default RenamableField
