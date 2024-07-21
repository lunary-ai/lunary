import Highlighter from "react-highlight-words"
import { useProject } from "@/utils/dataHooks"
import { Tooltip } from "@mantine/core"
import { getPIIColor } from "@/utils/colors"
import classes from "./index.module.css"

export default function HighlightPii({
  text,
  piiDetection,
}: {
  text: string
  piiDetection: { type: string; entity: string }[] // Contains the detected PII
}) {
  if (!piiDetection || piiDetection.length === 0) {
    return <>{text}</>
  }

  const { project } = useProject()

  // const { project } = { project: { blurPII: true } } // useProject()

  const HighlightBadge = ({ children }) => {
    const piiType = piiDetection.find((pii) => pii.entity === children)?.type
    const bgColor = `light-dark(var(--mantine-color-${getPIIColor(piiType)}-2), var(--mantine-color-${getPIIColor(piiType)}-9))`
    const length = children.length
    return (
      <Tooltip label={piiType} position="top" withArrow>
        <span
          style={{
            backgroundColor: bgColor,
            // color: `var(--mantine-color-${getPIIColor(piiType)}-10)`,
          }}
          className={`${classes.piiBadge} ${project.blurPII ? classes.blurred : ""}`}
        >
          {project.blurPII ? "x".repeat(length) : children}
        </span>
      </Tooltip>
    )
  }

  return (
    <Highlighter
      highlightTag={HighlightBadge}
      searchWords={piiDetection.map((pii) => pii.entity)}
      autoEscape={true}
      caseSensitive={true}
      textToHighlight={text}
    />
  )
}
