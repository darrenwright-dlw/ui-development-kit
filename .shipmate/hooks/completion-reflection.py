#!/usr/bin/env python3
"""
Completion Reflection Hook (stop)

Cursor Hook: Performs brief self-reflection when agent completes a task.
Logs successful patterns and learnings for compounding engineering.

Input (stdin JSON):
{
  "conversation_id": "string",
  "generation_id": "string",
  "model": "string",
  "hook_event_name": "stop",
  "cursor_version": "string",
  "workspace_roots": ["path"],
  "user_email": "string | null",
  "status": "string",
  "loop_count": number
}

Output (stdout JSON):
{
  "followup_message": "optional message for agent to process"
}
"""

import json
import sys
import os
import uuid
from datetime import datetime
from pathlib import Path

# Track conversation stats in memory (reset per hook invocation)
# For persistent tracking, we'd need to read from diary entries
CONVERSATION_STATS_FILE = Path.home() / ".shipmate" / "diary" / ".conversation_stats.json"


def get_diary_path() -> Path:
    """Get the diary directory path, creating if needed."""
    diary_dir = Path.home() / ".shipmate" / "diary" / "entries" / datetime.now().strftime("%Y-%m-%d")
    diary_dir.mkdir(parents=True, exist_ok=True)
    return diary_dir


def get_conversation_stats(conversation_id: str) -> dict:
    """Get stats for this conversation from today's diary entries."""
    stats = {
        "corrections": 0,
        "errors": 0,
        "files_edited": [],
        "commands_run": 0
    }

    diary_dir = Path.home() / ".shipmate" / "diary" / "entries" / datetime.now().strftime("%Y-%m-%d")
    if not diary_dir.exists():
        return stats

    for entry_file in diary_dir.glob("*.json"):
        try:
            with open(entry_file, 'r') as f:
                entry = json.load(f)

            if entry.get("conversation_id") != conversation_id:
                continue

            entry_type = entry.get("type", "")
            if entry_type == "correction":
                stats["corrections"] += 1
            elif entry_type == "error_recovery":
                stats["errors"] += 1
            elif entry_type == "shell_execution":
                stats["commands_run"] += 1
                # Track file edits from command context if available
            elif entry_type == "file_edit":
                file_path = entry.get("context", {}).get("file_path", "")
                if file_path and file_path not in stats["files_edited"]:
                    stats["files_edited"].append(file_path)

        except Exception:
            continue

    return stats


def calculate_session_quality(stats: dict, loop_count: int) -> dict:
    """Calculate quality metrics for the session."""
    quality = {
        "score": 0.5,  # Base score
        "factors": []
    }

    # Corrections reduce quality
    if stats["corrections"] > 0:
        penalty = min(stats["corrections"] * 0.1, 0.3)
        quality["score"] -= penalty
        quality["factors"].append(f"-{penalty:.1f} for {stats['corrections']} correction(s)")

    # Errors reduce quality (but less than corrections - errors are normal)
    if stats["errors"] > 2:
        penalty = min((stats["errors"] - 2) * 0.05, 0.15)
        quality["score"] -= penalty
        quality["factors"].append(f"-{penalty:.1f} for {stats['errors']} errors")

    # File edits are positive signals
    if len(stats["files_edited"]) > 0:
        bonus = min(len(stats["files_edited"]) * 0.05, 0.2)
        quality["score"] += bonus
        quality["factors"].append(f"+{bonus:.1f} for {len(stats['files_edited'])} file(s) edited")

    # Completing with low loop count is positive
    if loop_count <= 3:
        quality["score"] += 0.1
        quality["factors"].append("+0.1 for efficient completion")

    quality["score"] = max(0.0, min(1.0, quality["score"]))
    return quality


def create_completion_entry(input_data: dict, stats: dict, quality: dict) -> dict:
    """Create a diary entry for the completion."""
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "conversation_id": input_data.get("conversation_id", "unknown"),
        "type": "completion",
        "severity": "low",
        "category": "workflow",
        "context": {
            "status": input_data.get("status", "unknown"),
            "loop_count": input_data.get("loop_count", 0),
            "model": input_data.get("model", "unknown"),
            "workspace_roots": input_data.get("workspace_roots", []),
            "session_stats": stats
        },
        "learning": {
            "what_happened": f"Session completed with status: {input_data.get('status', 'unknown')}",
            "quality_score": quality["score"],
            "quality_factors": quality["factors"],
            "corrections_count": stats["corrections"],
            "errors_count": stats["errors"],
            "files_edited_count": len(stats["files_edited"]),
            "improvement": "Reinforce successful patterns" if quality["score"] >= 0.6 else "Analyze for improvements"
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
    filename = f"completion-{entry['id'][:8]}.json"
    filepath = diary_path / filename

    with open(filepath, 'w') as f:
        json.dump(entry, f, indent=2)

    return str(filepath)


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({}))
        sys.exit(0)
    except Exception:
        print(json.dumps({}))
        sys.exit(0)

    conversation_id = input_data.get("conversation_id", "")
    loop_count = input_data.get("loop_count", 0)

    # Get conversation stats from today's diary
    stats = get_conversation_stats(conversation_id)

    # Calculate quality metrics
    quality = calculate_session_quality(stats, loop_count)

    # Create and save completion entry
    entry = create_completion_entry(input_data, stats, quality)
    save_diary_entry(entry)

    # Optionally provide a followup message for low-quality sessions
    output = {}
    if quality["score"] < 0.4 and stats["corrections"] > 2:
        output["followup_message"] = "Note: This session had multiple corrections. Consider reviewing the approach."

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
