#!/usr/bin/env python3
"""
Code Quality Gate Hook (afterFileEdit)

Cursor Hook: Performs quick quality checks after file edits.
Runs lightweight validation and logs issues for learning.

Input (stdin JSON):
{
  "conversation_id": "string",
  "hook_event_name": "afterFileEdit",
  "file_path": "string",
  "edits": [{"range": {}, "old_text": "", "new_text": ""}]
}

Output: None (after hooks don't produce output)
"""

import json
import sys
import re
import subprocess
import hashlib
from datetime import datetime
from pathlib import Path

# File extensions and their quality checks
QUALITY_CHECKS = {
    ".py": {
        "syntax": "python3 -m py_compile {file}",
        "patterns": [
            {"pattern": r"import \*", "issue": "wildcard_import", "severity": "medium"},
            {"pattern": r"except:", "issue": "bare_except", "severity": "medium"},
            {"pattern": r"print\(", "issue": "debug_print", "severity": "low"},
            {"pattern": r"# TODO|# FIXME|# XXX|# HACK", "issue": "todo_comment", "severity": "low"},
            {"pattern": r"password\s*=\s*['\"][^'\"]+['\"]", "issue": "hardcoded_secret", "severity": "high"},
            {"pattern": r"api_key\s*=\s*['\"][^'\"]+['\"]", "issue": "hardcoded_secret", "severity": "high"},
        ]
    },
    ".js": {
        "syntax": None,  # Requires node, may not be available
        "patterns": [
            {"pattern": r"console\.log\(", "issue": "debug_log", "severity": "low"},
            {"pattern": r"var\s+", "issue": "var_usage", "severity": "medium"},
            {"pattern": r"==(?!=)", "issue": "loose_equality", "severity": "medium"},
            {"pattern": r"# TODO|// TODO|// FIXME", "issue": "todo_comment", "severity": "low"},
            {"pattern": r"eval\(", "issue": "eval_usage", "severity": "high"},
        ]
    },
    ".ts": {
        "syntax": None,
        "patterns": [
            {"pattern": r"console\.log\(", "issue": "debug_log", "severity": "low"},
            {"pattern": r"any(?:\s|,|\))", "issue": "any_type", "severity": "medium"},
            {"pattern": r"@ts-ignore", "issue": "ts_ignore", "severity": "medium"},
            {"pattern": r"// TODO|// FIXME", "issue": "todo_comment", "severity": "low"},
        ]
    },
    ".tsx": {
        "syntax": None,
        "patterns": [
            {"pattern": r"console\.log\(", "issue": "debug_log", "severity": "low"},
            {"pattern": r"any(?:\s|,|\))", "issue": "any_type", "severity": "medium"},
            {"pattern": r"@ts-ignore", "issue": "ts_ignore", "severity": "medium"},
            {"pattern": r"dangerouslySetInnerHTML", "issue": "xss_risk", "severity": "high"},
        ]
    },
    ".jsx": {
        "syntax": None,
        "patterns": [
            {"pattern": r"console\.log\(", "issue": "debug_log", "severity": "low"},
            {"pattern": r"dangerouslySetInnerHTML", "issue": "xss_risk", "severity": "high"},
        ]
    },
    ".go": {
        "syntax": None,  # Requires go, may not be available
        "patterns": [
            {"pattern": r"fmt\.Print", "issue": "debug_print", "severity": "low"},
            {"pattern": r"// TODO|// FIXME", "issue": "todo_comment", "severity": "low"},
            {"pattern": r"panic\(", "issue": "panic_usage", "severity": "medium"},
        ]
    },
    ".rs": {
        "syntax": None,
        "patterns": [
            {"pattern": r"println!\(", "issue": "debug_print", "severity": "low"},
            {"pattern": r"unwrap\(\)", "issue": "unwrap_usage", "severity": "medium"},
            {"pattern": r"// TODO|// FIXME", "issue": "todo_comment", "severity": "low"},
        ]
    },
    ".java": {
        "syntax": None,
        "patterns": [
            {"pattern": r"System\.out\.print", "issue": "debug_print", "severity": "low"},
            {"pattern": r"// TODO|// FIXME", "issue": "todo_comment", "severity": "low"},
            {"pattern": r"catch\s*\(\s*Exception\s+", "issue": "broad_catch", "severity": "medium"},
        ]
    },
    ".sh": {
        "syntax": "bash -n {file}",
        "patterns": [
            {"pattern": r"rm\s+-rf\s+/", "issue": "dangerous_rm", "severity": "high"},
            {"pattern": r"eval\s+", "issue": "eval_usage", "severity": "high"},
            {"pattern": r"\$\([^)]+\)", "issue": "command_substitution", "severity": "low"},
        ]
    },
    ".sql": {
        "syntax": None,
        "patterns": [
            {"pattern": r"DROP\s+TABLE", "issue": "drop_table", "severity": "high"},
            {"pattern": r"DELETE\s+FROM\s+\w+\s*;", "issue": "delete_without_where", "severity": "high"},
            {"pattern": r"SELECT\s+\*", "issue": "select_star", "severity": "low"},
        ]
    },
    ".yaml": {
        "syntax": None,
        "patterns": [
            {"pattern": r"password:\s*[^\n]+", "issue": "password_in_yaml", "severity": "high"},
            {"pattern": r"secret:\s*[^\n]+", "issue": "secret_in_yaml", "severity": "high"},
        ]
    },
    ".yml": {
        "syntax": None,
        "patterns": [
            {"pattern": r"password:\s*[^\n]+", "issue": "password_in_yaml", "severity": "high"},
            {"pattern": r"secret:\s*[^\n]+", "issue": "secret_in_yaml", "severity": "high"},
        ]
    },
    ".json": {
        "syntax": "python3 -m json.tool {file} > /dev/null",
        "patterns": [
            {"pattern": r'"password"\s*:\s*"[^"]+"', "issue": "password_in_json", "severity": "high"},
            {"pattern": r'"api_key"\s*:\s*"[^"]+"', "issue": "api_key_in_json", "severity": "high"},
        ]
    },
    ".md": {
        "syntax": None,
        "patterns": [
            {"pattern": r"\[.*?\]\(\s*\)", "issue": "empty_link", "severity": "low"},
            {"pattern": r"TODO|FIXME", "issue": "todo_comment", "severity": "low"},
        ]
    },
}


def get_file_extension(file_path: str) -> str:
    """Get the file extension."""
    return Path(file_path).suffix.lower()


def check_syntax(file_path: str, check_cmd: str) -> dict:
    """Run syntax check command."""
    if not check_cmd:
        return {"passed": True}

    cmd = check_cmd.format(file=file_path)
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=5
        )
        return {
            "passed": result.returncode == 0,
            "error": result.stderr[:500] if result.returncode != 0 else None
        }
    except subprocess.TimeoutExpired:
        return {"passed": True, "skipped": "timeout"}
    except Exception as e:
        return {"passed": True, "skipped": str(e)}


def check_patterns(content: str, patterns: list) -> list:
    """Check content against quality patterns."""
    issues = []
    lines = content.split('\n')

    for pattern_info in patterns:
        pattern = pattern_info["pattern"]
        for line_num, line in enumerate(lines, 1):
            if re.search(pattern, line, re.IGNORECASE):
                issues.append({
                    "issue": pattern_info["issue"],
                    "severity": pattern_info["severity"],
                    "line": line_num,
                    "context": line.strip()[:100]
                })

    return issues


def calculate_quality_score(syntax_result: dict, pattern_issues: list) -> float:
    """Calculate overall quality score (0-1)."""
    score = 1.0

    # Syntax failure is major
    if not syntax_result.get("passed", True):
        score -= 0.4

    # Pattern issues reduce score based on severity
    severity_weights = {"high": 0.15, "medium": 0.08, "low": 0.03}
    for issue in pattern_issues:
        score -= severity_weights.get(issue["severity"], 0.03)

    return max(0.0, min(1.0, score))


def get_edit_summary(edits: list) -> dict:
    """Summarize edits made."""
    total_added = 0
    total_removed = 0

    for edit in edits:
        old_text = edit.get("old_text", "")
        new_text = edit.get("new_text", "")
        total_removed += len(old_text.split('\n')) if old_text else 0
        total_added += len(new_text.split('\n')) if new_text else 0

    return {
        "lines_added": total_added,
        "lines_removed": total_removed,
        "net_change": total_added - total_removed,
        "edit_count": len(edits)
    }


def log_quality_issues(conversation_id: str, file_path: str, quality_data: dict):
    """Log quality issues to diary."""
    # Only log if there are issues worth noting
    if quality_data["quality_score"] >= 0.9 and not quality_data["pattern_issues"]:
        return  # Skip clean files

    diary_dir = Path.home() / ".shipmate" / "diary" / "entries" / datetime.now().strftime("%Y-%m-%d")
    diary_dir.mkdir(parents=True, exist_ok=True)

    entry = {
        "id": hashlib.md5(f"{conversation_id}{file_path}{datetime.now().isoformat()}".encode()).hexdigest()[:8],
        "timestamp": datetime.now().isoformat(),
        "conversation_id": conversation_id,
        "type": "quality_gate",
        "severity": "high" if quality_data["quality_score"] < 0.6 else "medium" if quality_data["quality_score"] < 0.8 else "low",
        "category": "code_quality",
        "context": {
            "file_path": file_path,
            "file_type": quality_data["file_type"],
            "quality_score": quality_data["quality_score"],
            "syntax_passed": quality_data["syntax_result"].get("passed", True),
            "syntax_error": quality_data["syntax_result"].get("error"),
            "issues": quality_data["pattern_issues"][:10],  # Limit to first 10
            "edit_summary": quality_data["edit_summary"]
        },
        "learning": {
            "what_happened": f"Quality check on {Path(file_path).name}",
            "quality_score": quality_data["quality_score"],
            "issue_count": len(quality_data["pattern_issues"]),
            "high_severity_count": sum(1 for i in quality_data["pattern_issues"] if i["severity"] == "high"),
            "improvement": "Review and fix flagged issues"
        },
        "metadata": {
            "hook_version": "1.0.0",
            "checks_run": quality_data["checks_run"]
        }
    }

    filepath = diary_dir / f"quality-{entry['id']}.json"
    with open(filepath, 'w') as f:
        json.dump(entry, f, indent=2)


def main():
    try:
        input_data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    file_path = input_data.get("file_path", "")
    conversation_id = input_data.get("conversation_id", "unknown")
    edits = input_data.get("edits", [])

    if not file_path:
        sys.exit(0)

    # Get file extension and check config
    ext = get_file_extension(file_path)
    check_config = QUALITY_CHECKS.get(ext)

    if not check_config:
        sys.exit(0)  # Unknown file type, skip

    # Read current file content
    try:
        with open(file_path, 'r') as f:
            content = f.read()
    except Exception:
        sys.exit(0)  # Can't read file, skip

    # Run checks
    syntax_result = check_syntax(file_path, check_config.get("syntax"))
    pattern_issues = check_patterns(content, check_config.get("patterns", []))

    # Calculate quality score
    quality_score = calculate_quality_score(syntax_result, pattern_issues)

    # Get edit summary
    edit_summary = get_edit_summary(edits)

    # Log if there are issues
    quality_data = {
        "file_type": ext,
        "quality_score": quality_score,
        "syntax_result": syntax_result,
        "pattern_issues": pattern_issues,
        "edit_summary": edit_summary,
        "checks_run": ["syntax" if check_config.get("syntax") else None, "patterns"]
    }

    log_quality_issues(conversation_id, file_path, quality_data)

    # After hooks don't produce output
    sys.exit(0)


if __name__ == "__main__":
    main()
