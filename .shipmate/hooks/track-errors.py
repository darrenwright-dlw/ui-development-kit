#!/usr/bin/env python3
"""
Error Tracking Hook (afterShellExecution)

Cursor Hook: Tracks shell command errors and patterns to learn from failures.
Logs error patterns that can inform future improvements.

Input (stdin JSON):
{
  "conversation_id": "string",
  "generation_id": "string",
  "model": "string",
  "hook_event_name": "afterShellExecution",
  "cursor_version": "string",
  "workspace_roots": ["path"],
  "user_email": "string | null",
  "command": "string",
  "output": "string",
  "duration": number
}

Output (stdout JSON):
None (after hooks don't produce output)
"""

import json
import sys
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

# Error patterns to detect
ERROR_PATTERNS = [
    # General errors
    {"pattern": r"^error:", "category": "general", "severity": "medium"},
    {"pattern": r"^Error:", "category": "general", "severity": "medium"},
    {"pattern": r"^ERROR", "category": "general", "severity": "medium"},
    {"pattern": r"\bfailed\b", "category": "execution", "severity": "medium"},
    {"pattern": r"\bFailed\b", "category": "execution", "severity": "medium"},

    # Specific error types
    {"pattern": r"command not found", "category": "tooling", "severity": "high"},
    {"pattern": r"permission denied", "category": "permissions", "severity": "high"},
    {"pattern": r"No such file or directory", "category": "filesystem", "severity": "medium"},
    {"pattern": r"ModuleNotFoundError", "category": "dependencies", "severity": "medium"},
    {"pattern": r"ImportError", "category": "dependencies", "severity": "medium"},
    {"pattern": r"SyntaxError", "category": "syntax", "severity": "high"},
    {"pattern": r"TypeError", "category": "type_error", "severity": "medium"},
    {"pattern": r"AttributeError", "category": "attribute_error", "severity": "medium"},
    {"pattern": r"KeyError", "category": "key_error", "severity": "medium"},
    {"pattern": r"IndexError", "category": "index_error", "severity": "medium"},
    {"pattern": r"ValueError", "category": "value_error", "severity": "medium"},
    {"pattern": r"RuntimeError", "category": "runtime", "severity": "high"},

    # Build/compile errors
    {"pattern": r"compilation failed", "category": "compilation", "severity": "high"},
    {"pattern": r"build failed", "category": "build", "severity": "high"},
    {"pattern": r"npm ERR!", "category": "npm", "severity": "medium"},
    {"pattern": r"yarn error", "category": "yarn", "severity": "medium"},
    {"pattern": r"go: cannot find", "category": "go", "severity": "medium"},
    {"pattern": r"cargo error", "category": "rust", "severity": "medium"},

    # Test failures
    {"pattern": r"FAIL\s", "category": "test_failure", "severity": "medium"},
    {"pattern": r"test failed", "category": "test_failure", "severity": "medium"},
    {"pattern": r"assertion.*failed", "category": "assertion", "severity": "medium"},

    # Git errors
    {"pattern": r"fatal:", "category": "git", "severity": "high"},
    {"pattern": r"merge conflict", "category": "git_conflict", "severity": "high"},
    {"pattern": r"CONFLICT", "category": "git_conflict", "severity": "high"},

    # Exit codes
    {"pattern": r"exit code [1-9]", "category": "exit_code", "severity": "medium"},
    {"pattern": r"exited with code [1-9]", "category": "exit_code", "severity": "medium"},
]

# False positive patterns
FALSE_POSITIVE_PATTERNS = [
    r"error handling",
    r"error message",
    r"handleError",
    r"onError",
    r"errorHandler",
    r"logError",
    r"isError",
    r"hasError",
    r"\.error\(",
    r"console\.error",
    r"--ignore-error",
    r"suppress.*error",
]


def get_diary_path() -> Path:
    """Get the diary directory path, creating if needed."""
    diary_dir = Path.home() / ".shipmate" / "diary" / "entries" / datetime.now().strftime("%Y-%m-%d")
    diary_dir.mkdir(parents=True, exist_ok=True)
    return diary_dir


def is_false_positive(content: str, match_start: int, match_end: int) -> bool:
    """Check if the error match is a false positive."""
    context_start = max(0, match_start - 50)
    context_end = min(len(content), match_end + 50)
    context = content[context_start:context_end]

    for fp_pattern in FALSE_POSITIVE_PATTERNS:
        if re.search(fp_pattern, context, re.IGNORECASE):
            return True
    return False


def detect_errors(output: str) -> list:
    """Detect error patterns in command output."""
    if not output:
        return []

    detections = []
    seen_categories = set()

    for pattern_info in ERROR_PATTERNS:
        for match in re.finditer(pattern_info["pattern"], output, re.IGNORECASE | re.MULTILINE):
            if pattern_info["category"] in seen_categories:
                continue  # One detection per category

            if not is_false_positive(output, match.start(), match.end()):
                # Get context around the error
                start = max(0, match.start() - 50)
                end = min(len(output), match.end() + 150)
                context = output[start:end].strip()

                detections.append({
                    "category": pattern_info["category"],
                    "severity": pattern_info["severity"],
                    "matched_text": match.group()[:100],
                    "context": context[:300]
                })
                seen_categories.add(pattern_info["category"])

    return detections


def create_error_entry(command: str, output: str, duration: float, detections: list, input_data: dict) -> dict:
    """Create a diary entry for the detected error."""
    severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    primary_detection = max(detections, key=lambda d: severity_order.get(d["severity"], 0))

    # Sanitize command (remove sensitive info)
    safe_command = command[:200]
    if any(secret in command.lower() for secret in ["password", "token", "key", "secret"]):
        safe_command = "[REDACTED - contains sensitive data]"

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "conversation_id": input_data.get("conversation_id", "unknown"),
        "type": "error_recovery",
        "severity": primary_detection["severity"],
        "category": primary_detection["category"],
        "context": {
            "command": safe_command,
            "error_context": primary_detection["context"],
            "duration_ms": duration,
            "all_errors": [d["category"] for d in detections],
            "model": input_data.get("model", "unknown"),
            "workspace_roots": input_data.get("workspace_roots", [])
        },
        "learning": {
            "what_happened": f"Command error: {primary_detection['category']}",
            "error_type": primary_detection["category"],
            "matched_text": primary_detection["matched_text"],
            "improvement": "Analyze pattern for prevention"
        },
        "metadata": {
            "hook_version": "1.0.0",
            "cursor_version": input_data.get("cursor_version", "unknown"),
            "error_count": len(detections)
        }
    }

    return entry


def save_diary_entry(entry: dict) -> str:
    """Save diary entry to file."""
    diary_path = get_diary_path()
    filename = f"error-{entry['id'][:8]}.json"
    filepath = diary_path / filename

    with open(filepath, 'w') as f:
        json.dump(entry, f, indent=2)

    return str(filepath)


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)
    except Exception:
        sys.exit(0)

    command = input_data.get("command", "")
    output = input_data.get("output", "")
    duration = input_data.get("duration", 0)

    if not output:
        sys.exit(0)

    # Detect errors
    detections = detect_errors(output)

    if detections:
        entry = create_error_entry(command, output, duration, detections, input_data)
        save_diary_entry(entry)

    # afterShellExecution doesn't produce output
    sys.exit(0)


if __name__ == "__main__":
    main()
