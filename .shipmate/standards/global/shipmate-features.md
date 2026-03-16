# Shipmate Features

**Scope:** Universal standard for all agents and commands

**Purpose:** Ensure all work leverages existing feature documentation and context before starting any task and progress is persisted and kept up to date.

---

## Core Principle

**CRITICAL:** Before starting ANY work on a feature or task, check `.shipmate/features/` for existing context and documentation.

This prevents:
- Duplicate work and wasted effort
- Contradicting existing designs or decisions
- Missing important context or constraints
- Reinventing solutions that already exist

---

## Pre-Work Checklist

Before beginning any task:

### 1. Identify the Feature Context

```bash
# Check if feature documentation exists
ls -la .shipmate/features/{JIRA-KEY}/

# Or search for related features
ls .shipmate/features/ | grep -i "{keyword}"
```

### 2. Load Existing Documentation

If a `.shipmate/features/{JIRA-KEY}/` directory exists, review:

| File | Purpose | Priority |
|------|---------|----------|
| `requirements.md` | Acceptance criteria, NFRs, constraints | **Required** |
| `tasks.md` | Implementation checklist, progress | **Required** |
| `design.md` | Technical design decisions | High |
| `analysis.md` | Investigation findings, root cause | High |
| `verification.md` | Test results, validation status | Medium |
| `deployment.md` | Deployment checklist, rollout plan | Medium |
| `notes.md` | Additional context, discussions | Low |

### 3. Check Related Features

```bash
# Look for related or dependent features
grep -r "{JIRA-KEY}" .shipmate/features/
grep -r "{keyword}" .shipmate/features/
```

### 4. Review Project Standards

Always check project-level configuration:

```bash
# Project-specific conventions
ls .shipmate/project/

# Common files:
# - pull-requests.md - PR conventions
# - branching.md - Branch naming
# - testing.md - Test requirements
```

---

## Context Loading by Task Type

### Bug Fixes / Troubleshooting

1. Check for existing `analysis.md` with investigation findings
2. Review `requirements.md` for original expected behavior
3. Check `verification.md` for previous test results

### New Feature Implementation

1. **Required:** Load `requirements.md` for acceptance criteria
2. **Required:** Load `tasks.md` for implementation checklist
3. Review `design.md` for architectural decisions
4. Check for related features that may be affected

### Code Review

1. Load `requirements.md` to verify PR meets acceptance criteria
2. Check `tasks.md` for completion status
3. Review `design.md` for architectural alignment
4. Check `verification.md` for test coverage expectations

### Verification / Testing

1. Load `requirements.md` for acceptance criteria to verify
2. Check `tasks.md` for what was implemented
3. Review existing `verification.md` for previous results

### Documentation

1. Load all feature files for comprehensive context
2. Check `requirements.md` for what needs documenting
3. Review `design.md` for technical details

---

## Creating Feature Context

If no feature documentation exists for your task:

### When to Create

- Starting work on a new JIRA ticket
- Investigating a complex bug
- Planning a significant change
- Any task that will span multiple sessions

### Minimum Required Files

```bash
mkdir -p .shipmate/features/{JIRA-KEY}
```

1. **`requirements.md`** - Capture what needs to be done
2. **`tasks.md`** - Break down into actionable tasks

### Template: requirements.md

```markdown
# {JIRA-KEY}: {Title}

**Status:** Planning | In Progress | In Review | Complete
**Created:** {date}
**JIRA:** https://sailpoint.atlassian.net/browse/{JIRA-KEY}

---

## Summary

{Brief description of what this feature/fix accomplishes}

---

## Acceptance Criteria

- [ ] AC-1: {criterion}
- [ ] AC-2: {criterion}
- [ ] AC-3: {criterion}

---

## Non-Functional Requirements

- **Performance:** {requirements}
- **Security:** {requirements}
- **Accessibility:** {requirements}

---

## Constraints

- {constraint 1}
- {constraint 2}

---

## Out of Scope

- {what this does NOT include}
```

### Template: tasks.md

```markdown
# Tasks - {JIRA-KEY}

## Implementation Checklist

### Phase 1: {Phase Name}
- [ ] Task 1
- [ ] Task 2

### Phase 2: {Phase Name}
- [ ] Task 3
- [ ] Task 4

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

### Documentation
- [ ] Code comments
- [ ] API docs (if applicable)
- [ ] Update README (if applicable)
```

---

## Context Awareness in Commands

All shipmate commands should automatically:

1. **Detect JIRA key** from branch name or user input
2. **Check for existing documentation** in `.shipmate/features/{JIRA-KEY}/`
3. **Load relevant context** before proceeding
4. **Update documentation** as work progresses
5. **Create documentation** if none exists

### Command Integration Example

```markdown
## Context to Load

**Required:**
- `@.shipmate/features/{JIRA-KEY}/requirements.md` - Acceptance criteria
- `@.shipmate/features/{JIRA-KEY}/tasks.md` - Implementation checklist

**If exists:**
- `@.shipmate/features/{JIRA-KEY}/design.md` - Technical decisions
- `@.shipmate/features/{JIRA-KEY}/analysis.md` - Investigation findings
```

---

## Best Practices

### Do

- Always check for existing context before starting
- Update documentation as you learn new information
- Cross-reference related features
- Keep documentation current throughout the task lifecycle

### Don't

- Start work without checking for existing documentation
- Duplicate investigation that's already been done
- Ignore constraints documented in requirements
- Leave documentation stale after completing work

---

## Integration with External Tools

### JIRA Integration

```bash
# Fetch ticket details to supplement local documentation
jira issue view {JIRA-KEY} --json

# Check for linked issues
jira issue list --jql "issue in linkedIssues({JIRA-KEY})"
```

### Confluence Integration

```bash
# Search for related documentation
confluence search --query "{JIRA-KEY}" --limit 5

# If design docs are linked in JIRA
confluence read {PAGE-ID}
```

### LaunchDarkly Integration

```bash
# If feature involves feature flags
ldcli flags get --project idn --flag {FLAG_KEY} --output json
```

---

## Compliance

All agents and commands MUST:

1. Implement feature context checking
2. Document the context sources they use
3. Update documentation as part of their workflow
4. Fail gracefully if documentation is missing (prompt to create it)

This standard ensures institutional knowledge is captured, preserved, and leveraged across all work.
