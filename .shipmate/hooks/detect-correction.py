#!/usr/bin/env python3
"""
Correction/Frustration Detection Hook (beforeSubmitPrompt)

Cursor Hook: Detects when users correct the agent or show frustration.
When implementation corrections are detected, injects context to help
the agent course-correct.

Input (stdin JSON):
{
  "conversation_id": "string",
  "generation_id": "string",
  "model": "string",
  "hook_event_name": "beforeSubmitPrompt",
  "cursor_version": "string",
  "workspace_roots": ["path"],
  "user_email": "string | null",
  "prompt": "string",
  "attachments": []
}

Output (stdout JSON):
{
  "continue": true,
  "user_message": "optional context injection for the agent"
}
"""

import json
import sys
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

# ============================================================================
# CORRECTION PATTERNS
# ============================================================================

# Implementation correction patterns - things that indicate the agent did something wrong
IMPLEMENTATION_CORRECTIONS = [
    # Wrong approach
    {"pattern": r"\b(that'?s?\s+not\s+(the\s+)?(right|correct)\s+(way|approach|method))", "type": "wrong_approach", "severity": "high"},
    {"pattern": r"\b(don'?t\s+(do\s+it\s+)?(like\s+)?that)", "type": "wrong_approach", "severity": "high"},
    {"pattern": r"\b(that'?s?\s+not\s+what\s+i\s+(meant|wanted|asked))", "type": "misunderstanding", "severity": "high"},
    {"pattern": r"\b(you\s+(should|need\s+to)\s+(have\s+)?(done|used|implemented))", "type": "wrong_approach", "severity": "medium"},

    # Wrong file/location
    {"pattern": r"\b(wrong\s+(file|place|location|directory|folder))", "type": "wrong_location", "severity": "high"},
    {"pattern": r"\b(that'?s?\s+not\s+the\s+(right|correct)\s+(file|place))", "type": "wrong_location", "severity": "high"},
    {"pattern": r"\b(put\s+it\s+in|move\s+it\s+to|should\s+be\s+in)", "type": "wrong_location", "severity": "medium"},

    # Wrong code/implementation
    {"pattern": r"\b(that\s+code\s+(is\s+)?(wrong|broken|doesn'?t\s+work))", "type": "wrong_code", "severity": "high"},
    {"pattern": r"\b(you\s+broke|that\s+broke|it'?s?\s+broken)", "type": "wrong_code", "severity": "high"},
    {"pattern": r"\b(that'?s?\s+not\s+(how|the\s+way)\s+(it\s+)?(should\s+)?(work|be))", "type": "wrong_code", "severity": "high"},
    {"pattern": r"\b(use\s+.+\s+instead)", "type": "use_instead", "severity": "medium"},

    # Undo/revert requests
    {"pattern": r"\b(undo|revert|rollback|go\s+back|restore)", "type": "undo_request", "severity": "high"},
    {"pattern": r"\b(put\s+it\s+back|change\s+it\s+back)", "type": "undo_request", "severity": "high"},

    # Stop/halt
    {"pattern": r"\b(stop|wait|hold\s+on|don'?t\s+continue)", "type": "stop_request", "severity": "high"},
    {"pattern": r"\b(no\s+no\s+no)", "type": "stop_request", "severity": "high"},

    # Missing something
    {"pattern": r"\b(you\s+(forgot|missed|didn'?t\s+(add|include|do)))", "type": "missing_work", "severity": "medium"},
    {"pattern": r"\b(what\s+about|you\s+need\s+to\s+also)", "type": "missing_work", "severity": "medium"},

    # Wrong understanding
    {"pattern": r"\b(no[,.]?\s+(i\s+)?(meant|want|need))", "type": "clarification", "severity": "medium"},
    {"pattern": r"\b(let\s+me\s+(clarify|explain|be\s+more\s+clear))", "type": "clarification", "severity": "low"},
    {"pattern": r"\b(i\s+mean|what\s+i\s+meant)", "type": "clarification", "severity": "low"},
]

# General frustration patterns
FRUSTRATION_PATTERNS = [
    {"pattern": r"\b(just\s+do\s+(it|what\s+i\s+(said|asked)))", "type": "impatience", "severity": "medium"},
    {"pattern": r"\b(i\s+(already|just)\s+(said|told\s+you))", "type": "repetition", "severity": "medium"},
    {"pattern": r"\b(why\s+(are|did|do)\s+you)", "type": "questioning", "severity": "medium"},
    {"pattern": r"\b(this\s+is\s+(wrong|broken|not\s+working))", "type": "failure_report", "severity": "medium"},
    {"pattern": r"[!]{3,}", "type": "frustration_punctuation", "severity": "medium"},
    {"pattern": r"\b[A-Z]{5,}\b", "type": "emphasis_caps", "severity": "low"},
]

# Positive patterns (false positive prevention)
POSITIVE_PATTERNS = [
    r"\b(no\s+problem|no\s+worries|no\s+rush)",
    r"\b(don'?t\s+worry)",
    r"\b(that'?s\s+(fine|ok|okay|good|great|perfect))",
    r"\b(thanks|thank\s+you)",
    r"\b(looks\s+good|well\s+done|nice)",
]

# Context injection templates based on correction type
CONTEXT_INJECTIONS = {
    "wrong_approach": "Note: User is indicating the approach taken was incorrect. Listen carefully to their guidance on the correct approach and follow their direction.",
    "wrong_location": "Note: User is indicating files were placed in wrong location. Pay close attention to where they want the code placed.",
    "wrong_code": "Note: User is indicating the implementation has errors. Carefully review their feedback and fix the issues they identify.",
    "use_instead": "Note: User is suggesting a different implementation. Follow their guidance on what to use instead.",
    "undo_request": "Note: User wants to revert recent changes. Carefully undo the specified changes and restore previous state.",
    "stop_request": "Note: User wants to pause/stop current action. Wait for their guidance before proceeding.",
    "missing_work": "Note: User is indicating something was forgotten or missed. Make sure to address what they mention.",
    "clarification": "Note: User is clarifying their intent. Pay close attention to their clarification and adjust accordingly.",
    "misunderstanding": "Note: There was a misunderstanding. Re-read the user's original request and their clarification carefully.",
}


def get_diary_path() -> Path:
    """Get the diary directory path, creating if needed."""
    diary_dir = Path.home() / ".shipmate" / "diary" / "entries" / datetime.now().strftime("%Y-%m-%d")
    diary_dir.mkdir(parents=True, exist_ok=True)
    return diary_dir


def get_correction_context_path() -> Path:
    """Get path for storing correction context between prompts."""
    context_dir = Path.home() / ".shipmate" / "context"
    context_dir.mkdir(parents=True, exist_ok=True)
    return context_dir / "active_corrections.json"


def is_positive_message(prompt: str) -> bool:
    """Check if the message is actually positive (false positive prevention)."""
    prompt_lower = prompt.lower()
    for pattern in POSITIVE_PATTERNS:
        if re.search(pattern, prompt_lower, re.IGNORECASE):
            return True
    return False


def detect_implementation_corrections(prompt: str) -> list:
    """Detect implementation-specific correction patterns."""
    if is_positive_message(prompt):
        return []

    prompt_lower = prompt.lower()
    detections = []

    for pattern_info in IMPLEMENTATION_CORRECTIONS:
        if re.search(pattern_info["pattern"], prompt_lower, re.IGNORECASE):
            # Extract context around the match
            match = re.search(pattern_info["pattern"], prompt_lower, re.IGNORECASE)
            start = max(0, match.start() - 30)
            end = min(len(prompt), match.end() + 50)
            context = prompt[start:end].strip()

            detections.append({
                "type": pattern_info["type"],
                "severity": pattern_info["severity"],
                "category": "implementation",
                "matched_text": match.group(),
                "context": context
            })

    return detections


def detect_frustration(prompt: str) -> list:
    """Detect general frustration patterns."""
    if is_positive_message(prompt):
        return []

    prompt_lower = prompt.lower()
    detections = []

    for pattern_info in FRUSTRATION_PATTERNS:
        if re.search(pattern_info["pattern"], prompt_lower, re.IGNORECASE):
            detections.append({
                "type": pattern_info["type"],
                "severity": pattern_info["severity"],
                "category": "frustration"
            })

    return detections


def get_correction_context(detections: list) -> str:
    """Generate context injection message based on detected corrections."""
    if not detections:
        return ""

    # Get the highest severity implementation correction
    impl_corrections = [d for d in detections if d.get("category") == "implementation"]

    if not impl_corrections:
        return ""

    severity_order = {"high": 3, "medium": 2, "low": 1}
    primary = max(impl_corrections, key=lambda d: severity_order.get(d["severity"], 0))

    # Get the context injection template
    context = CONTEXT_INJECTIONS.get(primary["type"], "")

    return context


def save_active_correction(conversation_id: str, detections: list, prompt: str):
    """Save active correction context for the conversation."""
    context_path = get_correction_context_path()

    # Load existing corrections
    corrections = {}
    if context_path.exists():
        try:
            with open(context_path, 'r') as f:
                corrections = json.load(f)
        except Exception:
            corrections = {}

    # Add/update this conversation's correction
    corrections[conversation_id] = {
        "timestamp": datetime.now().isoformat(),
        "detections": detections,
        "prompt_excerpt": prompt[:200],
        "correction_types": list(set(d["type"] for d in detections))
    }

    # Clean up old entries (older than 1 hour)
    cutoff = datetime.now().timestamp() - 3600
    corrections = {
        k: v for k, v in corrections.items()
        if datetime.fromisoformat(v["timestamp"]).timestamp() > cutoff
    }

    # Save
    with open(context_path, 'w') as f:
        json.dump(corrections, f, indent=2)


def create_diary_entry(prompt: str, detections: list, input_data: dict) -> dict:
    """Create a diary entry for the detected correction."""
    severity_order = {"high": 3, "medium": 2, "low": 1}
    primary = max(detections, key=lambda d: severity_order.get(d["severity"], 0))

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "conversation_id": input_data.get("conversation_id", "unknown"),
        "type": "correction",
        "severity": primary["severity"],
        "category": primary.get("category", "general"),
        "context": {
            "user_prompt": prompt[:500],
            "detection_type": primary["type"],
            "all_detections": [{"type": d["type"], "severity": d["severity"], "category": d.get("category")} for d in detections],
            "model": input_data.get("model", "unknown"),
            "workspace_roots": input_data.get("workspace_roots", [])
        },
        "learning": {
            "what_happened": f"User correction: {primary['type']}",
            "correction_type": primary["type"],
            "is_implementation_correction": primary.get("category") == "implementation",
            "improvement": "Agent should have understood user intent better"
        },
        "metadata": {
            "hook_version": "2.0.0",
            "cursor_version": input_data.get("cursor_version", "unknown"),
            "detection_count": len(detections)
        }
    }

    return entry


def save_diary_entry(entry: dict) -> str:
    """Save diary entry to file."""
    diary_path = get_diary_path()
    filename = f"correction-{entry['id'][:8]}.json"
    filepath = diary_path / filename

    with open(filepath, 'w') as f:
        json.dump(entry, f, indent=2)

    return str(filepath)


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"continue": True}))
        sys.exit(0)
    except Exception:
        print(json.dumps({"continue": True}))
        sys.exit(0)

    prompt = input_data.get("prompt", "")
    conversation_id = input_data.get("conversation_id", "unknown")

    if not prompt:
        print(json.dumps({"continue": True}))
        sys.exit(0)

    # Detect implementation corrections
    impl_corrections = detect_implementation_corrections(prompt)

    # Detect general frustration
    frustration = detect_frustration(prompt)

    # Combine all detections
    all_detections = impl_corrections + frustration

    output = {"continue": True}

    if all_detections:
        # Save to diary
        entry = create_diary_entry(prompt, all_detections, input_data)
        save_diary_entry(entry)

        # Save active correction context
        save_active_correction(conversation_id, all_detections, prompt)

        # Generate context injection for implementation corrections
        if impl_corrections:
            context_msg = get_correction_context(impl_corrections)
            if context_msg:
                # Inject context as a user_message that the agent will see
                output["user_message"] = context_msg

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
