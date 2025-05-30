import type { EvaluatorConfig } from "@/types/evaluator-types"

export const availableEvaluators: EvaluatorConfig[] = [
  {
    id: "relevance",
    name: "Relevance",
    description: "Evaluates how relevant the response is to the user's query",
    enabled: false,
    parameters: {
      threshold: 0.7,
    },
    parameterDefinitions: [
      {
        id: "threshold",
        name: "Threshold",
        description: "Minimum score to consider the response relevant",
        type: "number",
        default: 0.7,
        min: 0,
        max: 1,
      },
    ],
  },
  {
    id: "accuracy",
    name: "Factual Accuracy",
    description: "Checks the factual accuracy of the response",
    enabled: false,
    parameters: {
      strictMode: false,
    },
    parameterDefinitions: [
      {
        id: "strictMode",
        name: "Strict Mode",
        description: "Enable stricter fact-checking",
        type: "boolean",
        default: false,
      },
    ],
  },
  {
    id: "helpfulness",
    name: "Helpfulness",
    description: "Evaluates how helpful the response is in addressing the user's needs",
    enabled: false,
    parameters: {
      considerContext: true,
    },
    parameterDefinitions: [
      {
        id: "considerContext",
        name: "Consider Context",
        description: "Take into account the context when evaluating helpfulness",
        type: "boolean",
        default: true,
      },
    ],
  },
  {
    id: "clarity",
    name: "Clarity",
    description: "Assesses the clarity and readability of the response",
    enabled: false,
    parameters: {
      readabilityLevel: "general",
    },
    parameterDefinitions: [
      {
        id: "readabilityLevel",
        name: "Readability Level",
        description: "Target audience readability level",
        type: "select",
        default: "general",
        options: [
          { label: "Simple", value: "simple" },
          { label: "General", value: "general" },
          { label: "Technical", value: "technical" },
        ],
      },
    ],
  },
  {
    id: "toxicity",
    name: "Toxicity Check",
    description: "Checks for harmful, toxic, or inappropriate content",
    enabled: false,
    parameters: {
      sensitivity: "medium",
    },
    parameterDefinitions: [
      {
        id: "sensitivity",
        name: "Sensitivity",
        description: "How sensitive the toxicity check should be",
        type: "select",
        default: "medium",
        options: [
          { label: "Low", value: "low" },
          { label: "Medium", value: "medium" },
          { label: "High", value: "high" },
        ],
      },
    ],
  },
  // Format Evaluators
  {
    id: "json_validator",
    name: "JSON Validator",
    description: "Checks if the output contains valid JSON",
    enabled: false,
    parameters: {
      strictMode: true,
      extractFromMarkdown: true,
    },
    parameterDefinitions: [
      {
        id: "strictMode",
        name: "Strict Mode",
        description: "Require the entire output to be valid JSON",
        type: "boolean",
        default: true,
      },
      {
        id: "extractFromMarkdown",
        name: "Extract from Markdown",
        description: "Try to extract JSON from markdown code blocks",
        type: "boolean",
        default: true,
      },
    ],
  },
  {
    id: "xml_validator",
    name: "XML Validator",
    description: "Checks if the output contains valid XML",
    enabled: false,
    parameters: {
      strictMode: false,
      extractFromMarkdown: true,
    },
    parameterDefinitions: [
      {
        id: "strictMode",
        name: "Strict Mode",
        description: "Require the entire output to be valid XML",
        type: "boolean",
        default: false,
      },
      {
        id: "extractFromMarkdown",
        name: "Extract from Markdown",
        description: "Try to extract XML from markdown code blocks",
        type: "boolean",
        default: true,
      },
    ],
  },
  {
    id: "markdown_structure",
    name: "Markdown Structure",
    description: "Checks if the output follows proper Markdown structure",
    enabled: false,
    parameters: {
      requireHeadings: true,
      requireCodeBlocks: false,
      requireLists: false,
    },
    parameterDefinitions: [
      {
        id: "requireHeadings",
        name: "Require Headings",
        description: "Check if the output contains proper markdown headings",
        type: "boolean",
        default: true,
      },
      {
        id: "requireCodeBlocks",
        name: "Require Code Blocks",
        description: "Check if the output contains properly formatted code blocks",
        type: "boolean",
        default: false,
      },
      {
        id: "requireLists",
        name: "Require Lists",
        description: "Check if the output contains properly formatted lists",
        type: "boolean",
        default: false,
      },
    ],
  },
  {
    id: "code_block_detector",
    name: "Code Block Detector",
    description: "Checks if the output contains properly formatted code blocks",
    enabled: false,
    parameters: {
      requireLanguage: true,
      languages: "any",
    },
    parameterDefinitions: [
      {
        id: "requireLanguage",
        name: "Require Language",
        description: "Check if code blocks specify a programming language",
        type: "boolean",
        default: true,
      },
      {
        id: "languages",
        name: "Languages",
        description: "Specific languages to check for (comma-separated) or 'any'",
        type: "string",
        default: "any",
      },
    ],
  },
  {
    id: "url_validator",
    name: "URL Validator",
    description: "Checks if the output contains valid URLs",
    enabled: false,
    parameters: {
      requireHttps: true,
      checkLinkValidity: false,
    },
    parameterDefinitions: [
      {
        id: "requireHttps",
        name: "Require HTTPS",
        description: "Check if URLs use HTTPS protocol",
        type: "boolean",
        default: true,
      },
      {
        id: "checkLinkValidity",
        name: "Check Link Validity",
        description: "Verify if links are properly formatted",
        type: "boolean",
        default: false,
      },
    ],
  },
]
