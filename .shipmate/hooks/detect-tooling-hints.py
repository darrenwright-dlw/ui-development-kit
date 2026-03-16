#!/usr/bin/env python3
"""
Tooling Hints Detection Hook (beforeSubmitPrompt)

Cursor Hook: Detects URLs and patterns in user prompts that require
specific tools, and injects reminders to use the correct CLI/tool.

Input (stdin JSON):
{
  "conversation_id": "string",
  "hook_event_name": "beforeSubmitPrompt",
  "prompt": "string",
  "attachments": []
}

Output (stdout JSON):
{
  "continue": true,
  "user_message": "optional tool hint"
}
"""

import json
import sys
import re

# Tool hints configuration
# Pattern → (tool_name, hint_message)
TOOL_HINTS = [
    {
        "name": "confluence",
        "patterns": [
            r"sailpoint\.atlassian\.net/wiki",
            r"confluence\.sailpoint\.com",
            r"atlassian\.net/wiki/spaces",
        ],
        "hint": "Use the Confluence CLI (`confluence`) to fetch this content. Do not use WebFetch for Confluence pages.",
        "severity": "high"
    },
    {
        "name": "github",
        "patterns": [
            r"github\.com/[^/]+/[^/]+/(issues|pull|discussions|releases)",
            r"github\.com/[^/]+/[^/]+/blob",
            r"github\.com/[^/]+/[^/]+/tree",
        ],
        "hint": "Use the GitHub CLI (`gh`) to fetch this content. Example: `gh issue view`, `gh pr view`, `gh api`.",
        "severity": "medium"
    },
    {
        "name": "jira",
        "patterns": [
            r"sailpoint\.atlassian\.net/browse/[A-Z]+-\d+",
            r"jira\.sailpoint\.com",
            r"\b[A-Z]{2,}-\d{3,}\b",  # JIRA ticket pattern like PLAT-1234
        ],
        "hint": "Use the JIRA CLI or API to fetch ticket details. Do not use WebFetch for JIRA pages.",
        "severity": "medium"
    },
    {
        "name": "aws",
        "patterns": [
            r"\baws\s+(s3|ec2|lambda|iam|cloudformation|eks|ecr|rds|dynamodb)",
            r"s3://[a-z0-9.-]+",
            r"arn:aws:",
        ],
        "hint": "Ensure your AWS_PROFILE is set correctly before running AWS CLI commands.",
        "severity": "low"
    },
]


def detect_tool_hints(prompt: str) -> list:
    """Detect which tools should be used based on prompt content."""
    hints = []

    for tool in TOOL_HINTS:
        for pattern in tool["patterns"]:
            if re.search(pattern, prompt, re.IGNORECASE):
                hints.append({
                    "tool": tool["name"],
                    "hint": tool["hint"],
                    "severity": tool["severity"]
                })
                break  # Only add each tool hint once

    return hints


def format_hints(hints: list) -> str:
    """Format hints into a user message."""
    if not hints:
        return ""

    # Sort by severity (high first)
    severity_order = {"high": 0, "medium": 1, "low": 2}
    hints.sort(key=lambda h: severity_order.get(h["severity"], 2))

    if len(hints) == 1:
        return f"[Tooling Hint] {hints[0]['hint']}"

    messages = ["[Tooling Hints]"]
    for hint in hints:
        messages.append(f"- {hint['hint']}")

    return "\n".join(messages)


def main():
    try:
        input_data = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"continue": True}))
        sys.exit(0)

    prompt = input_data.get("prompt", "")

    if not prompt:
        print(json.dumps({"continue": True}))
        sys.exit(0)

    # Detect tool hints
    hints = detect_tool_hints(prompt)

    output = {"continue": True}

    if hints:
        hint_message = format_hints(hints)
        if hint_message:
            output["user_message"] = hint_message

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
