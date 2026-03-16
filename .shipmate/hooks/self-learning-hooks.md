# Self-Learning Hooks System

Shipmate's self-learning and compounding engineering hooks for Cursor IDE.

## Overview

```
User Interaction → Detection Hooks → Diary Entries → /shipmate-digest → Rule Updates
```

## Hook Architecture

### Cursor Hook Events Used

| Hook Script | Cursor Event | Purpose |
|-------------|--------------|---------|
| `detect-correction.py` | `beforeSubmitPrompt` | Detect user corrections/frustration |
| `capture-success.py` | `beforeSubmitPrompt`, `afterAgentResponse` | Capture successful patterns |
| `detect-struggling.py` | `beforeShellExecution` | Detect repeated commands (struggling) |
| `track-errors.py` | `afterShellExecution` | Track command errors |
| `track-file-edits.py` | `afterFileEdit` | Track file modifications |
| `code-quality-gate.py` | `afterFileEdit` | Quick code quality checks |
| `completion-reflection.py` | `stop` | Reflect on session quality |

### 1. Correction Detection Hook (beforeSubmitPrompt)

Detects when users correct the agent or show frustration.

**Input:**
```json
{
  "conversation_id": "string",
  "prompt": "string",
  "attachments": []
}
```

**Output:**
```json
{
  "continue": true,
  "user_message": "optional context injection"
}
```

**Triggers:**
- Explicit corrections: "no", "wrong", "that's not what I meant", "undo"
- Repeated instructions (agent didn't understand)
- Frustration signals: excessive caps, "!!!", "just do X", "I already said"
- Negative feedback: "that's wrong", "you broke it", "stop"

**Context Injection:**
When implementation corrections are detected, injects guidance like:
- "Note: User is indicating the approach taken was incorrect..."
- "Note: User wants to revert recent changes..."

### 2. Success Pattern Capture Hook (beforeSubmitPrompt + afterAgentResponse)

Two-phase hook that captures successful interaction patterns.

**Phase 1 - afterAgentResponse:**
Saves agent response signature as "pending" awaiting user feedback.

**Phase 2 - beforeSubmitPrompt:**
Checks if user expresses satisfaction and logs the success pattern.

**Success Indicators:**
- Explicit praise: "perfect", "excellent", "great", "awesome"
- Gratitude: "thanks", "thank you", "thx"
- Confirmation: "that's it", "exactly", "works perfectly"
- Approval: "looks good", "well done", "lgtm", "ship it"

**Captures:**
- Tools used in successful response
- Files created/modified
- Approaches that worked (test-driven, systematic steps, debugging)
- Response characteristics (length, code blocks)

### 3. Struggling Detection Hook (beforeShellExecution)

Detects when agent is struggling by running same/similar commands repeatedly.

**Input:**
```json
{
  "conversation_id": "string",
  "hook_event_name": "beforeShellExecution",
  "command": "string",
  "cwd": "string"
}
```

**Output:**
```json
{
  "permission": "allow",
  "agent_message": "optional guidance"
}
```

**Detection Patterns:**
- Same exact command run 3+ times
- Similar command patterns run 5+ times
- Repeated package install attempts
- Permission issue loops (sudo/chmod cycles)

**Guidance Injection:**
When struggling detected, provides suggestions like:
- "This exact command has been run multiple times. Consider trying a different approach..."
- "Multiple package install attempts detected. Check package.json for conflicts..."

### 4. Error Tracking Hook (afterShellExecution)

Tracks shell command errors and recovery patterns.

**Input:**
```json
{
  "conversation_id": "string",
  "command": "string",
  "output": "string",
  "duration": number
}
```

**Output:** None (after hooks don't produce output)

**Error Categories:**
- Tooling: command not found, module not found
- Permissions: permission denied, access denied
- Filesystem: file/directory not found
- Syntax: syntax errors in scripts
- Dependencies: package/module issues
- Build: compilation failures

### 5. File Edit Tracking Hook (afterFileEdit)

Tracks file modifications for session analysis.

**Input:**
```json
{
  "conversation_id": "string",
  "file_path": "string",
  "edits": [{"range": {}, "old_text": "", "new_text": ""}]
}
```

**Output:** None

**Captures:**
- Files edited per session
- Lines added/removed
- File types worked on

### 6. Code Quality Gate Hook (afterFileEdit)

Performs quick quality checks after file edits.

**Input:**
```json
{
  "conversation_id": "string",
  "file_path": "string",
  "edits": [{"range": {}, "old_text": "", "new_text": ""}]
}
```

**Output:** None

**Quality Checks by File Type:**
- **Python** (.py): Syntax check, wildcard imports, bare excepts, debug prints, hardcoded secrets
- **JavaScript** (.js): Debug logs, var usage, loose equality, eval usage
- **TypeScript** (.ts/.tsx): Debug logs, any types, ts-ignore, XSS risks
- **Go** (.go): Debug prints, panic usage
- **Rust** (.rs): Debug prints, unwrap usage
- **Java** (.java): Debug prints, broad exception catches
- **Shell** (.sh): Syntax check, dangerous rm, eval usage
- **SQL** (.sql): DROP TABLE, DELETE without WHERE, SELECT *
- **YAML/JSON**: Hardcoded passwords/secrets/API keys
- **Markdown** (.md): Empty links, TODO comments

**Quality Score:**
Calculates 0-1 quality score based on:
- Syntax validation pass/fail
- Pattern issue severity weights (high: -0.15, medium: -0.08, low: -0.03)

### 7. Completion Reflection Hook (stop)

Brief self-reflection when agent stops/completes.

**Input:**
```json
{
  "conversation_id": "string",
  "status": "string",
  "loop_count": number
}
```

**Output:**
```json
{
  "followup_message": "optional"
}
```

**Captures:**
- Session quality score based on corrections/errors
- Patterns that succeeded
- Time spent vs complexity

## Installation

Run the install script from your project root:

```bash
bash /path/to/core/hooks/install-hooks.sh .
```

This will:
1. Create `.cursor/hooks/` with all hook scripts
2. Create `.cursor/hooks.json` with the configuration
3. Set up `~/.shipmate/diary/` for cross-project learnings

## Configuration

The install script creates `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      { "command": "python3 .cursor/hooks/detect-correction.py" },
      { "command": "python3 .cursor/hooks/capture-success.py" }
    ],
    "beforeShellExecution": [
      { "command": "python3 .cursor/hooks/detect-struggling.py" }
    ],
    "afterShellExecution": [
      { "command": "python3 .cursor/hooks/track-errors.py" }
    ],
    "afterFileEdit": [
      { "command": "python3 .cursor/hooks/track-file-edits.py" },
      { "command": "python3 .cursor/hooks/code-quality-gate.py" }
    ],
    "afterAgentResponse": [
      { "command": "python3 .cursor/hooks/capture-success.py" }
    ],
    "stop": [
      { "command": "python3 .cursor/hooks/completion-reflection.py" }
    ]
  }
}
```

## Diary Entry Schema

```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "conversation_id": "string",
  "type": "correction|completion|error_recovery|file_edit|quality_gate|struggling|success_pattern",
  "severity": "low|medium|high|critical",
  "category": "understanding|execution|communication|tooling|workflow|code_quality",
  "context": {
    "user_prompt": "the triggering user message",
    "model": "model used",
    "workspace_roots": ["project paths"]
  },
  "learning": {
    "what_happened": "description of the event",
    "root_cause": "why it happened",
    "pattern": "generalizable pattern",
    "improvement": "suggested improvement"
  },
  "metadata": {
    "hook_version": "1.0.0",
    "cursor_version": "version string"
  }
}
```

## Diary Location

Diary entries stored at: `~/.shipmate/diary/`

Structure:
```
~/.shipmate/diary/
  ├── entries/
  │   ├── 2025-12-05/
  │   │   ├── correction-abc123.json
  │   │   ├── completion-def456.json
  │   │   ├── error-ghi789.json
  │   │   ├── edit-jkl012.json
  │   │   ├── quality-mno345.json
  │   │   ├── struggle-pqr678.json
  │   │   └── success-stu901.json
  │   └── 2025-12-06/
  │       └── ...
  ├── summaries/
  │   ├── weekly-2025-W49.json
  │   └── monthly-2025-12.json
  └── improvements/
      ├── rules-updates.json
      └── workflow-updates.json
```

## Context Files

Temporary context files stored at: `~/.shipmate/context/`

- `pending_success.json` - Responses awaiting user feedback
- `command_history.json` - Command history for struggle detection
- `active_corrections.json` - Active correction context
- `session_stats.json` - Session statistics

## Usage

### Automatic Collection
Hooks run automatically during Cursor sessions. No user action needed.

### Digest Processing
```
/shipmate-digest
```
Processes all diary entries and distills improvements to rules/prompts/workflows.

### View Learnings
```
/shipmate-learnings
```
Shows recent diary entries and patterns.

## Related Commands

- `/shipmate-digest` - Process diary and update rules
- `/shipmate-learnings` - View learning history

## References

- [Cursor Hooks Documentation](https://cursor.com/docs/agent/hooks)
- [Cursor Changelog 1.7](https://cursor.com/changelog/1-7)
