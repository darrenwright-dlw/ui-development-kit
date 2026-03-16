---
version: 1.0
context:
  - @README.md
  - @.shipmate/workflows/specification/**/*
  - @.shipmate/agents/**/*
---
# Create Spec (Multi-Agent)

**Command:** `/shipmate-spec --multi-agent` (Cursor) or `@.shipmate/commands/spec/multi-agent/spec.md` (other tools)

**Purpose:** Transform feature plan into detailed technical specification by delegating to the spec-creator subagent.

**Agent:** Spec Creator - Technical Specification Specialist (`@.shipmate/agents/spec-creator.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Prerequisites

- `.shipmate/features/{JIRA-KEY}/requirements.md` exists (run `/shipmate-plan` first)
- Product vision loaded
- Standards available

---

## Multi-Phase Process

### PHASE 1: Verify Prerequisites

First, verify that the feature plan exists:

**Check for:** `.shipmate/features/{JIRA-KEY}/requirements.md`

**If missing:** Ask user to run `/shipmate-plan {JIRA-KEY}` first.

---

### PHASE 2: Delegate to Spec Creator Subagent

Delegate to the **spec-creator** subagent to create the detailed technical specification.

**Provide to the subagent:**
- The Jira ticket ID: `{JIRA-KEY}`
- Path to requirements: `.shipmate/features/{JIRA-KEY}/requirements.md`
- Path to assets: `.shipmate/features/{JIRA-KEY}/assets/`
- Product vision context: `.shipmate/project/`
- Standards: `.shipmate/standards/`

**Instruct the subagent to:**
1. Load the feature plan from requirements.md
2. Research and gather visual assets (mockups, diagrams)
3. Design technical solution (architecture, data model, API contracts)
4. Add technical design section to requirements.md
5. Create detailed task breakdown in tasks.md
6. Follow its built-in spec-creator workflow

---

### PHASE 3: Verify Completions

After the spec-creator subagent completes, verify:

- [ ] requirements.md updated with technical design section
- [ ] tasks.md created with categorized task checklist
- [ ] All open questions addressed or documented

**Output confirmation:**
```
✅ Technical specification created!

📋 Technical Design Added:
- Architecture diagrams
- Data models
- API contracts
- Test strategy

✅ Task Breakdown Created:
- {count} backend tasks
- {count} frontend tasks
- {count} database tasks
- {count} testing tasks

Created/Updated:
- .shipmate/features/{JIRA-KEY}/requirements.md (with technical design)
- .shipmate/features/{JIRA-KEY}/tasks.md (implementation checklist)

Next steps:
1. Review technical design in requirements.md
2. Run /shipmate-implement to start development
```

---

## Persona

This command delegates to the **Spec Creator** persona (medium priority).

**Subagent specialization:**
- Technical design and architecture
- API contract definition
- Data modeling
- Task breakdown and sequencing

---

## Advantages of Multi-Agent Mode

**When to use multi-agent:**
- Complex features with multiple domains (backend + frontend + database)
- Large specifications requiring systematic breakdown
- When you want focused expertise on spec creation

**Benefits:**
- Spec creator persona has deep focus on technical design
- Can leverage Confluence CLI for architecture research
- Systematic task breakdown with dependencies
- Consistent specification structure

---

## Fallback to Single-Agent

If subagent delegation is not available or preferred, use the single-agent variant:

```
@.shipmate/commands/spec/single-agent/spec.md
```
