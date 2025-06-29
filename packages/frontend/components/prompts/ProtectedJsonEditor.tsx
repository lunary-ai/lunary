import { Box, Text, ActionIcon, Modal, Button, useMantineColorScheme } from "@mantine/core";
import { IconArrowsMaximize } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import Editor, { Monaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";

interface ProtectedJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  protectedKeys: string[];
  minRows?: number;
  maxRows?: number;
}

export default function ProtectedJsonEditor({
  value,
  onChange,
  protectedKeys,
  minRows = 4,
  maxRows = 10,
}: ProtectedJsonEditorProps) {
  const editorRef = useRef<any>(null);
  const modalEditorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const { colorScheme } = useMantineColorScheme();

  // Validate JSON (strip comments for validation)
  useEffect(() => {
    try {
      // Remove single-line comments
      const jsonWithoutComments = value
        .split('\n')
        .map(line => {
          const commentIndex = line.indexOf('//');
          if (commentIndex > -1) {
            return line.substring(0, commentIndex);
          }
          return line;
        })
        .join('\n')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '');
      
      JSON.parse(jsonWithoutComments);
      setParseError(null);
    } catch (e) {
      setParseError("Invalid JSON");
    }
  }, [value]);


  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    
    // Configure JSON language
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [],
    });
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    // Function to find protected key ranges
    const findProtectedRanges = () => {
      const model = editor.getModel();
      if (!model) return [];

      const text = model.getValue();
      const ranges: any[] = [];

      // Find all occurrences of protected keys in the JSON
      protectedKeys.forEach(key => {
        // Find the key and its entire value (including nested objects/arrays)
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let keyIndex = text.indexOf(`"${key}"`);
        
        while (keyIndex !== -1) {
          // Find the colon after the key
          let colonIndex = text.indexOf(':', keyIndex);
          if (colonIndex === -1) break;
          
          // Find the start of the value (skip whitespace)
          let valueStart = colonIndex + 1;
          while (valueStart < text.length && /\s/.test(text[valueStart])) {
            valueStart++;
          }
          
          // Find the end of the value
          let valueEnd = valueStart;
          depth = 0;
          inString = false;
          escapeNext = false;
          
          for (let i = valueStart; i < text.length; i++) {
            const char = text[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString;
            }
            
            if (!inString) {
              if (char === '{' || char === '[') depth++;
              if (char === '}' || char === ']') depth--;
              
              // End of value found
              if (depth === 0 && (char === ',' || char === '}' || char === ']')) {
                valueEnd = i;
                break;
              }
            }
          }
          
          // If we didn't find a proper end, take the rest of the text
          if (valueEnd === valueStart) {
            valueEnd = text.length;
          }
          
          const startPos = model.getPositionAt(keyIndex);
          const endPos = model.getPositionAt(valueEnd);
          
          ranges.push({
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          });
          
          // Look for next occurrence
          keyIndex = text.indexOf(`"${key}"`, valueEnd);
        }
      });

      return ranges;
    };

    // Set up decorations for protected keys
    const updateDecorations = () => {
      const ranges = findProtectedRanges();
      
      // Apply decorations (only hover message, no visual decoration)
      editor.deltaDecorations([], ranges.map(range => ({
        range,
        options: {
          hoverMessage: { value: '🔒 This field is protected and cannot be edited' },
        }
      })));
    };

    // Initial decoration
    updateDecorations();

    // Store protected ranges for edit checking
    let protectedRanges: any[] = [];
    
    const updateProtectedRanges = () => {
      protectedRanges = findProtectedRanges();
    };
    
    updateProtectedRanges();

    // Intercept edits to protected fields
    editor.onDidChangeModelContent((e: any) => {
      const model = editor.getModel();
      if (!model) return;

      let shouldRevert = false;
      
      // Check if any change affects protected ranges
      e.changes.forEach((change: any) => {
        const changeRange = change.range;
        
        // Check if this change intersects with any protected range
        for (const protectedRange of protectedRanges) {
          // Check if ranges overlap
          if (!(changeRange.endLineNumber < protectedRange.startLineNumber ||
                changeRange.startLineNumber > protectedRange.endLineNumber ||
                (changeRange.endLineNumber === protectedRange.startLineNumber && 
                 changeRange.endColumn < protectedRange.startColumn) ||
                (changeRange.startLineNumber === protectedRange.endLineNumber && 
                 changeRange.startColumn > protectedRange.endColumn))) {
            shouldRevert = true;
            break;
          }
        }
      });

      if (shouldRevert) {
        // Revert the change
        editor.trigger('keyboard', 'undo', null);
        
        // Show a warning message
        monaco.editor.setModelMarkers(model, 'protectedFields', [{
          startLineNumber: e.changes[0].range.startLineNumber,
          startColumn: e.changes[0].range.startColumn,
          endLineNumber: e.changes[0].range.endLineNumber,
          endColumn: e.changes[0].range.endColumn,
          message: 'Cannot edit protected fields (messages, model_params)',
          severity: monaco.MarkerSeverity.Error,
        }]);
        
        // Clear the error marker after 3 seconds
        setTimeout(() => {
          monaco.editor.setModelMarkers(model, 'protectedFields', []);
        }, 3000);
      } else {
        // Valid change, update the value and protected ranges
        const currentValue = model.getValue();
        try {
          JSON.parse(currentValue);
          onChange(currentValue);
          // Update protected ranges for next edit
          updateProtectedRanges();
          updateDecorations();
        } catch {
          // Invalid JSON, still allow the change but don't update
        }
      }
    });

    // Configure editor options
    editor.updateOptions({
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      formatOnPaste: true,
      formatOnType: true,
    });

    // Function to fold only the contents of protected fields
    const foldProtectedFields = () => {
      const model = editor.getModel();
      if (!model) return;

      const text = model.getValue();
      
      // Fold only the contents inside protected fields
      protectedKeys.forEach(key => {
        const keyPattern = `"${key}"`;
        let searchIndex = 0;
        
        while (true) {
          const keyIndex = text.indexOf(keyPattern, searchIndex);
          if (keyIndex === -1) break;
          
          const position = model.getPositionAt(keyIndex);
          const line = position.lineNumber;
          const lineContent = model.getLineContent(line);
          
          // Check if the opening brace/bracket is on the same line
          const afterKey = lineContent.substring(lineContent.indexOf(keyPattern) + keyPattern.length);
          const sameLine = afterKey.includes('{') || afterKey.includes('[');
          
          if (sameLine) {
            // If opening brace/bracket is on the same line, fold from current line
            editor.setPosition({ lineNumber: line, column: 1 });
            editor.trigger('fold', 'editor.fold', null);
          } else {
            // Find the opening brace/bracket on next lines
            let foundOpening = false;
            for (let i = 1; i <= 3 && line + i <= model.getLineCount(); i++) {
              const nextLineContent = model.getLineContent(line + i);
              if (nextLineContent.trim().startsWith('{') || nextLineContent.trim().startsWith('[')) {
                // Fold from the line with the opening brace/bracket
                editor.setPosition({ lineNumber: line + i, column: 1 });
                editor.trigger('fold', 'editor.fold', null);
                foundOpening = true;
                break;
              }
            }
          }
          
          searchIndex = keyIndex + 1;
        }
      });
      
      // Clear selection
      editor.setPosition({ lineNumber: 1, column: 1 });
    };

    // Don't fold anything by default
    // setTimeout(() => {
    //   foldProtectedFields();
    // }, 100);
  };

  if (parseError) {
    return (
      <Box>
        <Text size="sm" c="red" mb="xs">{parseError}</Text>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            minHeight: `${minRows * 24}px`,
            maxHeight: `${maxRows * 24}px`,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid var(--mantine-color-gray-4)",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
        />
      </Box>
    );
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title="Edit JSON Payload"
        size="xl"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        <Box
          style={{
            border: "1px solid var(--mantine-color-default-border)",
            borderRadius: "4px",
            overflow: "hidden",
            height: "60vh",
          }}
        >
          <Editor
            height="100%"
            language="json"
            value={value}
            onChange={(newValue) => {
              onChange(newValue || "{}");
            }}
            beforeMount={handleEditorWillMount}
            onMount={(editor, monaco) => {
              modalEditorRef.current = editor;
              // Apply same configuration as main editor
              handleEditorDidMount(editor, monaco);
            }}
            theme={colorScheme === "dark" ? "vs-dark" : "vs"}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineHeight: 20,
              fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace",
              wordWrap: "on",
              automaticLayout: true,
              lineNumbers: "on",
              glyphMargin: false,
              folding: true,
              foldingHighlight: false,
              renderLineHighlight: "all",
              suggestOnTriggerCharacters: false,
              quickSuggestions: false,
              parameterHints: { enabled: false },
              suggest: { enabled: false },
            }}
          />
        </Box>
      </Modal>

      <Box style={{ position: "relative" }}>
        <Box
          style={{
            border: "1px solid var(--mantine-color-default-border)",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <Editor
            height={`${Math.min(Math.max((value || "{}").split('\n').length, minRows), maxRows) * 19}px`}
            language="json"
            value={value || "{}"}
            onChange={(newValue) => {
              onChange(newValue || "{}");
            }}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
            theme={colorScheme === "dark" ? "vs-dark" : "vs"}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineHeight: 19,
              fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace",
              wordWrap: "on",
              automaticLayout: true,
              scrollbar: {
                vertical: "hidden",
                horizontal: "hidden",
                alwaysConsumeMouseWheel: false,
              },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              lineNumbers: "off",
              glyphMargin: false,
              folding: true,
              foldingHighlight: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              renderLineHighlight: "all",
              suggestOnTriggerCharacters: false,
              quickSuggestions: false,
              parameterHints: { enabled: false },
              suggest: { enabled: false },
            }}
          />
        </Box>
        <ActionIcon
          size="xs"
          onClick={() => {
            open();
          }}
          aria-label="expand json editor"
          variant="transparent"
          style={{
            position: "absolute",
            right: "10px",
            bottom: "7px",
          }}
        >
          <IconArrowsMaximize size={14} />
        </ActionIcon>
      </Box>
    </>
  );
}