#!/usr/bin/env python3
"""
Repeated Command/Struggling Detection Hook (beforeShellExecution)

Cursor Hook: Detects when the agent is struggling by running the same or
similar commands repeatedly. Injects context to try a different approach.

Input (stdin JSON):
{
  "conversation_id": "string",
  "hook_event_name": "beforeShellExecution",
  "command": "string",
  "cwd": "string"
}

Output (stdout JSON):
{
  "permission": "allow",
  "user_message": "optional guidance",
  "agent_message": "optional agent guidance"
}
"""

import json
import sys
import re
import hashlib
from datetime import datetime
from pathlib import Path

# Command history for this session
HISTORY_FILE = Path.home() / ".shipmate" / "context" / "command_history.json"
STRUGGLE_THRESHOLD = 3  # Same command N times = struggling
SIMILAR_THRESHOLD = 5   # Similar commands N times = struggling
HISTORY_WINDOW = 20     # Only look at last N commands


def get_command_signature(command: str) -> str:
    """Get a normalized signature for a command (ignoring variable parts)."""
    # Remove quotes content
    normalized = re.sub(r'"[^"]*"', '""', command)
    normalized = re.sub(r"'[^']*'", "''", normalized)
    # Remove numbers
    normalized = re.sub(r'\d+', 'N', normalized)
    # Remove paths after common commands
    normalized = re.sub(r'(cd|cat|ls|rm|cp|mv|mkdir)\s+\S+', r'\1 PATH', normalized)
    return normalized.strip().lower()


def get_command_hash(command: str) -> str:
    """Get a hash of the exact command."""
    return hashlib.md5(command.encode()).hexdigest()[:12]


def load_history(conversation_id: str) -> dict:
    """Load command history for this conversation."""
    if not HISTORY_FILE.exists():
        return {"commands": [], "signatures": {}, "exact": {}}

    try:
        with open(HISTORY_FILE, 'r') as f:
            all_history = json.load(f)
        return all_history.get(conversation_id, {"commands": [], "signatures": {}, "exact": {}})
    except Exception:
        return {"commands": [], "signatures": {}, "exact": {}}


def save_history(conversation_id: str, history: dict):
    """Save command history."""
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)

    all_history = {}
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, 'r') as f:
                all_history = json.load(f)
        except Exception:
            pass

    # Keep only recent conversations (last hour)
    cutoff = datetime.now().timestamp() - 3600
    all_history = {
        k: v for k, v in all_history.items()
        if v.get("last_update", 0) > cutoff
    }

    history["last_update"] = datetime.now().timestamp()
    all_history[conversation_id] = history

    with open(HISTORY_FILE, 'w') as f:
        json.dump(all_history, f)


def detect_struggling(command: str, history: dict) -> dict:
    """Detect if we're struggling based on command patterns."""
    result = {
        "is_struggling": False,
        "struggle_type": None,
        "count": 0,
        "suggestion": None
    }

    cmd_hash = get_command_hash(command)
    cmd_sig = get_command_signature(command)

    # Check exact command repetition
    exact_count = history.get("exact", {}).get(cmd_hash, 0)
    if exact_count >= STRUGGLE_THRESHOLD:
        result["is_struggling"] = True
        result["struggle_type"] = "exact_repeat"
        result["count"] = exact_count
        result["suggestion"] = "This exact command has been run multiple times. Consider trying a different approach or checking for underlying issues."

    # Check similar command pattern
    sig_count = history.get("signatures", {}).get(cmd_sig, 0)
    if sig_count >= SIMILAR_THRESHOLD:
        result["is_struggling"] = True
        result["struggle_type"] = "similar_pattern"
        result["count"] = sig_count
        result["suggestion"] = "Similar commands have been attempted repeatedly. Step back and reconsider the approach."

    # Check for specific struggle patterns
    if re.search(r'\b(npm|yarn|pip|go)\s+(install|add|get)', command):
        pkg_attempts = sum(1 for c in history.get("commands", [])[-10:]
                         if re.search(r'\b(npm|yarn|pip|go)\s+(install|add|get)', c))
        if pkg_attempts >= 3:
            result["is_struggling"] = True
            result["struggle_type"] = "dependency_issues"
            result["count"] = pkg_attempts
            result["suggestion"] = "Multiple package install attempts detected. Check package.json/requirements.txt for conflicts or try clearing cache."

    # Check for permission issues
    if 'permission denied' in command.lower() or 'sudo' in command:
        perm_attempts = sum(1 for c in history.get("commands", [])[-5:]
                          if 'sudo' in c or 'chmod' in c)
        if perm_attempts >= 2:
            result["is_struggling"] = True
            result["struggle_type"] = "permission_issues"
            result["count"] = perm_attempts
            result["suggestion"] = "Permission issues detected. Check file ownership and permissions systematically."

    return result


def update_history(history: dict, command: str) -> dict:
    """Update history with new command."""
    cmd_hash = get_command_hash(command)
    cmd_sig = get_command_signature(command)

    # Add to command list (keep last N)
    history["commands"] = (history.get("commands", []) + [command])[-HISTORY_WINDOW:]

    # Update exact counts
    if "exact" not in history:
        history["exact"] = {}
    history["exact"][cmd_hash] = history["exact"].get(cmd_hash, 0) + 1

    # Update signature counts
    if "signatures" not in history:
        history["signatures"] = {}
    history["signatures"][cmd_sig] = history["signatures"].get(cmd_sig, 0) + 1

    return history


def log_struggle(conversation_id: str, command: str, struggle_info: dict):
    """Log struggling incident to diary."""
    diary_dir = Path.home() / ".shipmate" / "diary" / "entries" / datetime.now().strftime("%Y-%m-%d")
    diary_dir.mkdir(parents=True, exist_ok=True)

    entry = {
        "id": hashlib.md5(f"{conversation_id}{datetime.now().isoformat()}".encode()).hexdigest()[:8],
        "timestamp": datetime.now().isoformat(),
        "conversation_id": conversation_id,
        "type": "struggling",
        "severity": "medium",
        "category": "execution",
        "context": {
            "command": command[:200],
            "struggle_type": struggle_info["struggle_type"],
            "attempt_count": struggle_info["count"]
        },
        "learning": {
            "what_happened": f"Agent struggled: {struggle_info['struggle_type']}",
            "pattern": struggle_info["struggle_type"],
            "improvement": "Detect earlier and try different approach"
        }
    }

    filepath = diary_dir / f"struggle-{entry['id']}.json"
    with open(filepath, 'w') as f:
        json.dump(entry, f, indent=2)


def main():
    try:
        input_data = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"permission": "allow"}))
        sys.exit(0)

    command = input_data.get("command", "")
    conversation_id = input_data.get("conversation_id", "unknown")

    if not command:
        print(json.dumps({"permission": "allow"}))
        sys.exit(0)

    # Load history
    history = load_history(conversation_id)

    # Detect struggling
    struggle_info = detect_struggling(command, history)

    # Update history with this command
    history = update_history(history, command)
    save_history(conversation_id, history)

    # Build output
    output = {"permission": "allow"}

    if struggle_info["is_struggling"]:
        # Log to diary
        log_struggle(conversation_id, command, struggle_info)

        # Inject guidance
        output["agent_message"] = f"[Shipmate] {struggle_info['suggestion']}"

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
