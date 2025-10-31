import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Input, Textarea } from "@mantine/core";
import classes from "./prompt-textarea.module.css";

const VARIABLE_REGEX = /\{\{[^}]+\}\}/g;

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHighlightHtml(value: string) {
  if (!value) {
    return "&nbsp;";
  }

  const variableMatches: string[] = [];
  const placeholderText = value.replace(VARIABLE_REGEX, (match) => {
    const index = variableMatches.length;
    variableMatches.push(match);
    return `__VAR_PLACEHOLDER_${index}__`;
  });

  let html = escapeHtml(placeholderText);
  variableMatches.forEach((match, idx) => {
    const escapedMatch = escapeHtml(match);
    html = html.replace(
      `__VAR_PLACEHOLDER_${idx}__`,
      `<span class="${classes.variable}">${escapedMatch}</span>`,
    );
  });

  if (value.endsWith("\n")) {
    html += "\n";
  }

  return html || "&nbsp;";
}

type PromptTextareaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  description?: string;
  error?: string;
  name?: string;
  id?: string;
  minHeight?: number;
};

export default function PromptTextarea({
  label,
  value,
  onChange,
  placeholder,
  required,
  description,
  error,
  name,
  id,
  minHeight = 300,
}: PromptTextareaProps) {
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sanitizedValue = value ?? "";

  const highlightHtml = useMemo(
    () => buildHighlightHtml(sanitizedValue),
    [sanitizedValue],
  );

  const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    if (!highlightRef.current) return;

    highlightRef.current.style.transform = `translate(${-target.scrollLeft}px, ${-target.scrollTop}px)`;
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;
    highlight.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
  }, [sanitizedValue]);

  const wrapperStyle: CSSProperties = {
    "--prompt-textarea-min-height": `${minHeight}px`,
    "--prompt-textarea-padding": "var(--mantine-spacing-sm)",
  };

  return (
    <Input.Wrapper
      id={id}
      required={required}
      label={label}
      description={description}
      error={error}
      className={classes.wrapper}
      style={wrapperStyle}
    >
      <div className={classes.container}>
        <div className={classes.highlight} aria-hidden="true">
          <div
            ref={highlightRef}
            className={classes.highlightContent}
            dangerouslySetInnerHTML={{ __html: highlightHtml }}
          />
        </div>
        <Textarea
          id={id}
          name={name}
          ref={textareaRef}
          value={sanitizedValue}
          placeholder={placeholder}
          autosize={false}
          size="sm"
          spellCheck={false}
          onChange={(event) => onChange(event.currentTarget.value)}
          onScroll={handleScroll}
          classNames={{
            root: classes.textareaRoot,
            input: classes.textareaInput,
          }}
        />
      </div>
    </Input.Wrapper>
  );
}
