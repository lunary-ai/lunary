export function extractJsonFromText(text: string): string {
  // Check if the text contains a markdown code block
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
  const match = text.match(codeBlockRegex)

  if (match && match[1]) {
    // Return the content inside the code block
    return match[1].trim()
  }

  // If no code block is found, return the original text
  return text.trim()
}

// Helper function to extract XML from potential markdown code blocks
export function extractXmlFromText(text: string): string {
  // Check if the text contains a markdown code block
  const codeBlockRegex = /```(?:xml)?\s*([\s\S]*?)\s*```/
  const match = text.match(codeBlockRegex)

  if (match && match[1]) {
    // Return the content inside the code block
    return match[1].trim()
  }

  // If no code block is found, return the original text
  return text.trim()
}

// Helper function to extract code blocks from text
export function extractCodeBlocks(text: string): { language: string; code: string }[] {
  const codeBlockRegex = /```([\w-]*)\s*([\s\S]*?)```/g
  const codeBlocks: { language: string; code: string }[] = []

  let match
  while ((match = codeBlockRegex.exec(text)) !== null) {
    codeBlocks.push({
      language: match[1].trim(),
      code: match[2].trim(),
    })
  }

  return codeBlocks
}

// Helper function to check if a string is valid JSON
export function isValidJson(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch (e) {
    return false
  }
}

// Helper function to check if a string is valid XML
export function isValidXml(text: string): boolean {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, "text/xml")
    const parseError = xmlDoc.getElementsByTagName("parsererror")
    return parseError.length === 0
  } catch (e) {
    return false
  }
}

// Helper function to check if a string contains valid markdown structure
export function checkMarkdownStructure(
  text: string,
  options: { requireHeadings: boolean; requireCodeBlocks: boolean; requireLists: boolean },
): {
  valid: boolean
  hasHeadings: boolean
  hasCodeBlocks: boolean
  hasLists: boolean
  details: string
} {
  const headingRegex = /^#{1,6}\s+.+$/m
  const codeBlockRegex = /```[\s\S]*?```/
  const listRegex = /^(\s*[-*+]|\s*\d+\.)\s+.+$/m

  const hasHeadings = headingRegex.test(text)
  const hasCodeBlocks = codeBlockRegex.test(text)
  const hasLists = listRegex.test(text)

  let valid = true
  const details = []

  if (options.requireHeadings && !hasHeadings) {
    valid = false
    details.push("Missing markdown headings")
  }

  if (options.requireCodeBlocks && !hasCodeBlocks) {
    valid = false
    details.push("Missing code blocks")
  }

  if (options.requireLists && !hasLists) {
    valid = false
    details.push("Missing lists")
  }

  return {
    valid,
    hasHeadings,
    hasCodeBlocks,
    hasLists,
    details: details.join(", ") || "All requirements met",
  }
}

// Helper function to check code blocks
export function checkCodeBlocks(
  text: string,
  options: { requireLanguage: boolean; languages: string },
): {
  valid: boolean
  codeBlocks: { language: string; code: string }[]
  details: string
} {
  const codeBlocks = extractCodeBlocks(text)
  let valid = codeBlocks.length > 0
  const details = []

  if (codeBlocks.length === 0) {
    details.push("No code blocks found")
    valid = false
  } else {
    if (options.requireLanguage) {
      const blocksWithoutLanguage = codeBlocks.filter((block) => !block.language)
      if (blocksWithoutLanguage.length > 0) {
        valid = false
        details.push(`${blocksWithoutLanguage.length} code block(s) without language specification`)
      }
    }

    if (options.languages !== "any") {
      const requiredLanguages = options.languages.split(",").map((lang) => lang.trim().toLowerCase())
      const languagesFound = codeBlocks.map((block) => block.language.toLowerCase()).filter((lang) => lang)

      const missingLanguages = requiredLanguages.filter((lang) => !languagesFound.includes(lang))
      if (missingLanguages.length > 0) {
        valid = false
        details.push(`Missing required languages: ${missingLanguages.join(", ")}`)
      }
    }
  }

  return {
    valid,
    codeBlocks,
    details: details.join(", ") || `Found ${codeBlocks.length} valid code block(s)`,
  }
}

// Helper function to check URLs
export function checkUrls(
  text: string,
  options: { requireHttps: boolean; checkLinkValidity: boolean },
): {
  valid: boolean
  urls: string[]
  details: string
} {
  // This regex matches URLs in text
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = text.match(urlRegex) || []
  let valid = urls.length > 0
  const details = []

  if (urls.length === 0) {
    details.push("No URLs found")
    valid = false
  } else {
    if (options.requireHttps) {
      const nonHttpsUrls = urls.filter((url) => !url.startsWith("https://"))
      if (nonHttpsUrls.length > 0) {
        valid = false
        details.push(`${nonHttpsUrls.length} URL(s) not using HTTPS`)
      }
    }

    if (options.checkLinkValidity) {
      // Basic URL format validation
      const invalidUrls = urls.filter((url) => {
        try {
          new URL(url)
          return false
        } catch (e) {
          return true
        }
      })

      if (invalidUrls.length > 0) {
        valid = false
        details.push(`${invalidUrls.length} invalid URL format(s)`)
      }
    }
  }

  return {
    valid,
    urls,
    details: details.join(", ") || `Found ${urls.length} valid URL(s)`,
  }
}
