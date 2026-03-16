#!/usr/bin/env python3
"""
Success Pattern Capture Hook (afterAgentResponse)

Cursor Hook: Monitors agent responses and subsequent user feedback.
When user expresses satisfaction, captures the patterns that led to success.

Input (stdin JSON):
{
  "conversation_id": "string",
  "hook_event_name": "afterAgentResponse",
  "text": "string"  # The agent's response
}

Output: None (after hooks don't produce output)
"""

import json
import sys
import re
import hashlib
from datetime import datetime
from pathlib import Path

# Track pending responses awaiting user feedback
PENDING_FILE = Path.home() / ".shipmate" / "context" / "pending_success.json"

# Success indicators in user messages (checked in beforeSubmitPrompt)
SUCCESS_PATTERNS = [
    r"\b(perfect|excellent|great|awesome|amazing|wonderful)\b",
    r"\b(thanks|thank\s+you|thx|ty)\b",
    r"\b(that'?s?\s+(it|right|correct|exactly))\b",
    r"\b(looks?\s+good|well\s+done|nice\s+(work|job|one))\b",
    r"\b(works?\s+(great|perfectly|well|now))\b",
    r"\b(exactly\s+what\s+i\s+(wanted|needed|asked))\b",
    r"\b(you\s+(got|nailed)\s+it)\b",
    r"\blgtm\b",
    r"\bship\s+it\b",
]

# Patterns to extract from successful responses
RESPONSE_PATTERNS = {
    "used_tool": r"(using|used|ran|executed|called)\s+(\w+)",
    "created_file": r"(created|wrote|generated)\s+[`'\"]?([^`'\"]+\.\w+)",
    "modified_file": r"(modified|updated|changed|edited)\s+[`'\"]?([^`'\"]+\.\w+)",
    "approach": r"(approach|strategy|method|technique|pattern)\s*:?\s*([^.]+)",
    "solution": r"(solution|fix|resolved|fixed)\s*:?\s*([^.]+)",
}


def get_response_signature(text: str) -> dict:
    """Extract signature patterns from agent response."""
    signature = {
        "tools_mentioned": [],
        "files_created": [],
        "files_modified": [],
        "approaches": [],
        "key_actions": [],
        "length": len(text),
        "has_code_blocks": "```" in text,
    }

    text_lower = text.lower()

    # Extract tools
    tool_matches = re.findall(r'\b(grep|read|write|edit|bash|glob|task)\b', text_lower)
    signature["tools_mentioned"] = list(set(tool_matches))

    # Extract files
    file_matches = re.findall(r'[`"\']([^`"\']+\.(py|js|ts|tsx|jsx|go|rs|java|md|json|yaml|yml))[`"\']', text)
    signature["files_created"] = [m[0] for m in file_matches[:5]]

    # Extract key actions
    action_matches = re.findall(r'\b(created|implemented|fixed|added|updated|refactored|optimized)\s+(\w+(?:\s+\w+)?)', text_lower)
    signature["key_actions"] = [f"{a[0]} {a[1]}" for a in action_matches[:5]]

    # Check for specific patterns
    if re.search(r'test.*pass|pass.*test|all.*green', text_lower):
        signature["approaches"].append("test_driven")
    if re.search(r'step\s*\d|first.*then|1\.\s|2\.\s', text_lower):
        signature["approaches"].append("systematic_steps")
    if re.search(r'error.*fix|fix.*error|debug', text_lower):
        signature["approaches"].append("debugging")

    return signature


def save_pending_response(conversation_id: str, response_text: str):
    """Save response as pending, awaiting user feedback."""
    PENDING_FILE.parent.mkdir(parents=True, exist_ok=True)

    pending = {}
    if PENDING_FILE.exists():
        try:
            with open(PENDING_FILE, 'r') as f:
                pending = json.load(f)
        except Exception:
            pass

    # Clean old entries (> 30 min)
    cutoff = datetime.now().timestamp() - 1800
    pending = {k: v for k, v in pending.items() if v.get("timestamp", 0) > cutoff}

    # Save this response
    pending[conversation_id] = {
        "timestamp": datetime.now().timestamp(),
        "response_excerpt": response_text[:1000],
        "signature": get_response_signature(response_text)
    }

    with open(PENDING_FILE, 'w') as f:
        json.dump(pending, f, indent=2)


def check_for_success_feedback(prompt: str) -> bool:
    """Check if user message indicates success/satisfaction."""
    prompt_lower = prompt.lower()
    for pattern in SUCCESS_PATTERNS:
        if re.search(pattern, prompt_lower):
            return True
    return False


def get_pending_response(conversation_id: str) -> dict:
    """Get pending response for this conversation."""
    if not PENDING_FILE.exists():
        return None

    try:
        with open(PENDING_FILE, 'r') as f:
            pending = json.load(f)
        return pending.get(conversation_id)
    except Exception:
        return None


def log_success_pattern(conversation_id: str, pending: dict, user_feedback: str):
    """Log successful pattern to diary."""
    diary_dir = Path.home() / ".shipmate" / "diary" / "entries" / datetime.now().strftime("%Y-%m-%d")
    diary_dir.mkdir(parents=True, exist_ok=True)

    signature = pending.get("signature", {})

    entry = {
        "id": hashlib.md5(f"{conversation_id}{datetime.now().isoformat()}".encode()).hexdigest()[:8],
        "timestamp": datetime.now().isoformat(),
        "conversation_id": conversation_id,
        "type": "success_pattern",
        "severity": "low",
        "category": "workflow",
        "context": {
            "user_feedback": user_feedback[:200],
            "response_excerpt": pending.get("response_excerpt", "")[:500],
            "tools_used": signature.get("tools_mentioned", []),
            "files_touched": signature.get("files_created", []) + signature.get("files_modified", []),
            "approaches": signature.get("approaches", []),
            "key_actions": signature.get("key_actions", [])
        },
        "learning": {
            "what_happened": "User expressed satisfaction with agent response",
            "successful_patterns": signature.get("approaches", []),
            "tools_that_worked": signature.get("tools_mentioned", []),
            "improvement": "Reinforce these patterns"
        },
        "metadata": {
            "hook_version": "1.0.0",
            "had_code_blocks": signature.get("has_code_blocks", False),
            "response_length": signature.get("length", 0)
        }
    }

    filepath = diary_dir / f"success-{entry['id']}.json"
    with open(filepath, 'w') as f:
        json.dump(entry, f, indent=2)


def clear_pending(conversation_id: str):
    """Clear pending response after processing."""
    if not PENDING_FILE.exists():
        return

    try:
        with open(PENDING_FILE, 'r') as f:
            pending = json.load(f)
        if conversation_id in pending:
            del pending[conversation_id]
            with open(PENDING_FILE, 'w') as f:
                json.dump(pending, f, indent=2)
    except Exception:
        pass


def main():
    try:
        input_data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    hook_event = input_data.get("hook_event_name", "")
    conversation_id = input_data.get("conversation_id", "unknown")

    if hook_event == "afterAgentResponse":
        # Save agent response as pending
        response_text = input_data.get("text", "")
        if response_text:
            save_pending_response(conversation_id, response_text)

    elif hook_event == "beforeSubmitPrompt":
        # Check if user is giving positive feedback
        prompt = input_data.get("prompt", "")
        if check_for_success_feedback(prompt):
            pending = get_pending_response(conversation_id)
            if pending:
                log_success_pattern(conversation_id, pending, prompt)
                clear_pending(conversation_id)

    # After hooks don't produce output
    sys.exit(0)


if __name__ == "__main__":
    main()
