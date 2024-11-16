import Highlighter from "react-highlight-words";
import { useProject, useProjectRules } from "@/utils/dataHooks";
import { Tooltip } from "@mantine/core";
import { getPIIColor } from "@/utils/colors";
import classes from "./index.module.css";

export default function HighlightPii({
  text,
  piiDetection,
}: {
  text: string;
  piiDetection: { type: string; entity: string }[]; // Contains the detected PII
}) {
  if (!piiDetection || piiDetection.length === 0) {
    return <>{text}</>;
  }

  const { maskingRule } = useProjectRules();

  const HighlightBadge = ({ children }) => {
    const piiType = piiDetection.find((pii) => pii.entity === children)?.type;
    const bgColor = `light-dark(var(--mantine-color-${getPIIColor(piiType)}-2), var(--mantine-color-${getPIIColor(piiType)}-9))`;
    const length = children.length;
    return (
      <Tooltip
        label={`${piiType} ${maskingRule ? "masked" : "detected"}`}
        position="top"
        withArrow
      >
        <span
          style={{
            backgroundColor: bgColor,
          }}
          className={`${classes.piiBadge} ${maskingRule ? classes.blurred : ""}`}
        >
          {maskingRule ? "x".repeat(length) : children}
        </span>
      </Tooltip>
    );
  };

  return (
    <Highlighter
      highlightTag={HighlightBadge}
      searchWords={piiDetection.map((pii) => pii.entity)}
      autoEscape={true}
      caseSensitive={true}
      textToHighlight={text}
    />
  );
}
