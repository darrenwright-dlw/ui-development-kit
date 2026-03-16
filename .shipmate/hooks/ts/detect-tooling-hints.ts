#!/usr/bin/env bun
/**
 * Tooling Hints Detection Hook (beforeSubmitPrompt)
 *
 * Detects URLs and patterns that require specific CLI tools
 * and injects reminders.
 */

interface HookInput {
  conversation_id: string;
  hook_event_name: string;
  prompt: string;
  attachments?: unknown[];
}

interface HookOutput {
  continue: boolean;
  user_message?: string;
}

interface ToolHint {
  name: string;
  patterns: RegExp[];
  hint: string;
  severity: 'high' | 'medium' | 'low';
}

const TOOL_HINTS: ToolHint[] = [
  {
    name: 'confluence',
    patterns: [
      /sailpoint\.atlassian\.net\/wiki/i,
      /confluence\.sailpoint\.com/i,
      /atlassian\.net\/wiki\/spaces/i,
    ],
    hint: 'Use the Confluence CLI (`confluence`) to fetch this content. Do not use WebFetch for Confluence pages.',
    severity: 'high',
  },
  {
    name: 'github',
    patterns: [
      /github\.com\/[^/]+\/[^/]+\/(issues|pull|discussions|releases)/i,
      /github\.com\/[^/]+\/[^/]+\/blob/i,
      /github\.com\/[^/]+\/[^/]+\/tree/i,
    ],
    hint: 'Use the GitHub CLI (`gh`) to fetch this content. Example: `gh issue view`, `gh pr view`, `gh api`.',
    severity: 'medium',
  },
  {
    name: 'jira',
    patterns: [
      /sailpoint\.atlassian\.net\/browse\/[A-Z]+-\d+/i,
      /jira\.sailpoint\.com/i,
      /\b[A-Z]{2,}-\d{3,}\b/,
    ],
    hint: 'Use the JIRA CLI or API to fetch ticket details. Do not use WebFetch for JIRA pages.',
    severity: 'medium',
  },
  {
    name: 'aws',
    patterns: [
      /\baws\s+(s3|ec2|lambda|iam|cloudformation|eks|ecr|rds|dynamodb)/i,
      /s3:\/\/[a-z0-9.-]+/i,
      /arn:aws:/i,
    ],
    hint: 'Ensure your AWS_PROFILE is set correctly before running AWS CLI commands.',
    severity: 'low',
  },
];

function detectToolHints(prompt: string): Array<{ tool: string; hint: string; severity: string }> {
  const hints: Array<{ tool: string; hint: string; severity: string }> = [];

  for (const tool of TOOL_HINTS) {
    for (const pattern of tool.patterns) {
      if (pattern.test(prompt)) {
        hints.push({
          tool: tool.name,
          hint: tool.hint,
          severity: tool.severity,
        });
        break;
      }
    }
  }

  return hints;
}

function formatHints(hints: Array<{ hint: string }>): string {
  if (hints.length === 0) return '';
  if (hints.length === 1) return `[Tooling Hint] ${hints[0].hint}`;

  return ['[Tooling Hints]', ...hints.map((h) => `- ${h.hint}`)].join('\n');
}

async function main() {
  try {
    const input: HookInput = await Bun.stdin.json();
    const output: HookOutput = { continue: true };

    if (input.prompt) {
      const hints = detectToolHints(input.prompt);
      const message = formatHints(hints);
      if (message) {
        output.user_message = message;
      }
    }

    console.log(JSON.stringify(output));
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
