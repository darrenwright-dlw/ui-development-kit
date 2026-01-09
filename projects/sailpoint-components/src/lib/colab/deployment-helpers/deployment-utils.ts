/**
 * Shared utility functions for CoLab deployments
 */

/**
 * Sanitize connector name to be a valid alias
 */
export function sanitizeConnectorName(name: string): string {
  // Remove special characters, replace spaces with hyphens, convert to lowercase
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50); // Limit length
}

/**
 * Extract GitHub repository URL from raw Discourse topic content
 * Looks for the "Repository Link" row in the markdown table
 * Supports both direct URLs and markdown link format [text](url)
 */
export function extractGitHubRepoUrl(rawContent: string): string | null {
  if (!rawContent) {
    return null;
  }

  // Pattern to match the Repository Link row in the markdown table
  // Format can be:
  // 1. Direct URL: :hammer_and_wrench: | **Repository Link** | https://github.com/...
  // 2. Markdown link: :hammer_and_wrench: | **Repository Link** | [text](https://github.com/...)
  
  // First, try to match markdown link format with URL in parentheses
  const markdownLinkPattern = /:hammer_and_wrench:\s*\|\s*\*\*Repository\s+Link\*\*\s*\|\s*\[[^\]]+\]\((https?:\/\/github\.com\/[^)]+)\)/i;
  const markdownMatch = rawContent.match(markdownLinkPattern);
  
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1].trim();
  }

  // Then try direct URL format (original pattern)
  const directUrlPattern = /:hammer_and_wrench:\s*\|\s*\*\*Repository\s+Link\*\*\s*\|\s*(https?:\/\/github\.com\/[^\s|\n\r]+)/i;
  const directMatch = rawContent.match(directUrlPattern);
  
  if (directMatch && directMatch[1]) {
    return directMatch[1].trim();
  }

  // Fallback: Try to find any GitHub URL in a table row that mentions "Repository"
  const fallbackPattern = /[^|]*Repository[^|]*\|\s*(?:\[[^\]]+\]\()?(https?:\/\/github\.com\/[^\s|)\n\r]+)/i;
  const fallbackMatch = rawContent.match(fallbackPattern);
  
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].trim();
  }

  return null;
}

