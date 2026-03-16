#!/usr/bin/env python3
"""
File Edit Tracking Hook (afterFileEdit)

Cursor Hook: Tracks file edits to understand work patterns.
Used by completion-reflection to calculate session quality.

Input (stdin JSON):
{
  "conversation_id": "string",
  "generation_id": "string",
  "model": "string",
  "hook_event_name": "afterFileEdit",
  "cursor_version": "string",
  "workspace_roots": ["path"],
  "user_email": "string | null",
  "file_path": "string",
  "edits": [
    {
      "range": {"start": {"line": n, "character": n}, "end": {...}},
      "old_text": "string",
      "new_text": "string"
    }
  ]
}

Output (stdout JSON):
None (after hooks don't produce output)
"""

import json
import sys
import os
import uuid
from datetime import datetime
from pathlib import Path


def get_diary_path() -> Path:
    """Get the diary directory path, creating if needed."""
    diary_dir = Path.home() / ".shipmate" / "diary" / "entries" / datetime.now().strftime("%Y-%m-%d")
    diary_dir.mkdir(parents=True, exist_ok=True)
    return diary_dir


def analyze_edits(file_path: str, edits: list) -> dict:
    """Analyze the edits to understand the type of change."""
    analysis = {
        "lines_added": 0,
        "lines_removed": 0,
        "edit_count": len(edits),
        "file_type": Path(file_path).suffix.lstrip('.') if file_path else "unknown",
        "is_test_file": False,
        "is_config_file": False,
        "is_documentation": False
    }

    # Detect file type patterns
    file_lower = file_path.lower()
    if any(x in file_lower for x in ["test", "spec", "_test", ".test"]):
        analysis["is_test_file"] = True
    if any(x in file_lower for x in ["config", ".json", ".yaml", ".yml", ".toml", ".ini"]):
        analysis["is_config_file"] = True
    if any(x in file_lower for x in [".md", ".rst", ".txt", "readme", "doc"]):
        analysis["is_documentation"] = True

    # Count line changes
    for edit in edits:
        old_text = edit.get("old_text", "")
        new_text = edit.get("new_text", "")
        analysis["lines_removed"] += old_text.count('\n')
        analysis["lines_added"] += new_text.count('\n')

    return analysis


def create_edit_entry(file_path: str, edits: list, analysis: dict, input_data: dict) -> dict:
    """Create a diary entry for the file edit."""
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "conversation_id": input_data.get("conversation_id", "unknown"),
        "type": "file_edit",
        "severity": "low",
        "category": "execution",
        "context": {
            "file_path": file_path,
            "file_type": analysis["file_type"],
            "edit_count": analysis["edit_count"],
            "lines_added": analysis["lines_added"],
            "lines_removed": analysis["lines_removed"],
            "is_test_file": analysis["is_test_file"],
            "is_config_file": analysis["is_config_file"],
            "is_documentation": analysis["is_documentation"],
            "model": input_data.get("model", "unknown"),
            "workspace_roots": input_data.get("workspace_roots", [])
        },
        "learning": {
            "what_happened": f"Edited {analysis['file_type']} file: {Path(file_path).name}",
            "net_lines": analysis["lines_added"] - analysis["lines_removed"]
        },
        "metadata": {
            "hook_version": "1.0.0",
            "cursor_version": input_data.get("cursor_version", "unknown")
        }
    }

    return entry


def save_diary_entry(entry: dict) -> str:
    """Save diary entry to file."""
    diary_path = get_diary_path()
    filename = f"edit-{entry['id'][:8]}.json"
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

    file_path = input_data.get("file_path", "")
    edits = input_data.get("edits", [])

    if not file_path or not edits:
        sys.exit(0)

    # Analyze the edits
    analysis = analyze_edits(file_path, edits)

    # Create and save entry
    entry = create_edit_entry(file_path, edits, analysis, input_data)
    save_diary_entry(entry)

    # afterFileEdit doesn't produce output
    sys.exit(0)


if __name__ == "__main__":
    main()
