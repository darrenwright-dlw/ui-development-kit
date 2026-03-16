---
version: 1.0
context:
  - @README.md
  - @.shipmate/project/pull-requests.md
  - @.shipmate/agents/**/*
---
# Improve Cursor Rules and Commands

**Command:** `/shipmate-improve-cursor` (Cursor) or `@.shipmate/commands/improve-cursor/improve-cursor.md` (other tools)

**Purpose:** Analyze and improve Cursor rules and commands by rewriting their descriptions, `applyWhen` conditions, and priorities to make them more discoverable and effective.

**Agent:** Cursor Rules Writer - IDE Rules Engineering Specialist (`@.shipmate/agents/cursor-rules-writer.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Overview

This command helps you optimize your Cursor integration by improving:
- **Rules** (`.cursor/rules/`) - When and how personas/tools activate
- **Commands** (`.cursor/commands/`) - Workflow command clarity and instructions

**What gets improved:**
- Rule `description` - Clearer purpose statements
- Rule `applyWhen` - Better activation conditions
- Rule `priority` - Proper prioritization (low/medium/high)
- Command descriptions - More discoverable and actionable
- Context references - Better @file references

---

## Prerequisites

- `.cursor/rules/` directory exists with ShipMate rules
- `.cursor/commands/` directory exists with ShipMate commands
- Rules follow standard format with frontmatter

---

## Instructions

### Step 1: Confirm scope

First, ask the user to confirm which Cursor rules and commands they want to improve.

**Display this message and WAIT for user response:**

```
I'll analyze and improve your Cursor rules and commands to make them more effective.

What would you like me to improve?

Options:
1. All rules and commands (recommended)
2. Only rules (.cursor/rules/)
3. Only commands (.cursor/commands/)
4. Specific rules or commands (please specify)

Please respond with your choice (1-4).
```

---

### Step 2: Analyze existing rules

For each rule in `.cursor/rules/`:

**Read and understand:**
1. **Rule name** and filename (e.g., `shipmate-feature-planner.md`)
2. **Current frontmatter:**
   ```yaml
   ---
   description: [current description]
   applyWhen: [current condition]
   priority: [low/medium/high]
   ---
   ```
3. **Rule content** - What persona, tool, or workflow it represents
4. **Referenced files** - Any @file references or links to standards

**Analyze:**
- Is the description clear and specific?
- Does `applyWhen` capture all relevant triggers?
- Is the priority appropriate for this rule's importance?
- Are there missing use cases or activation scenarios?

---

### Step 3: Improve rule frontmatter

For each rule, improve the frontmatter following these guidelines:

#### **Description:**
- **First sentence:** Clearly state what this rule does
  - Good: "Feature planning specialist for Jira-driven development"
  - Bad: "Planning persona"
- **Second sentence:** Describe when it activates
  - Good: "Activates when planning features, analyzing Jira tickets, or creating requirements"
  - Bad: "Use this for planning"
- **Length:** Can be long (2-4 sentences), focus on clarity
- **Tone:** Active voice, direct, specific

#### **applyWhen:**
- List specific activation scenarios
- Include file types, keywords, and contexts
- Use "when" clauses for clarity
- Be comprehensive but not overly broad

**Example:**
```yaml
applyWhen: >
    when running shipmate-plan, planning features, analyzing Jira tickets,
    creating requirements.md, or discussing feature scope and dependencies
```

#### **Priority:**
- `high` - Core development work (implementer, verifier)
- `medium` - Planning and design (feature-planner, spec-creator)
- `low` - One-time or infrequent tasks (vision-builder)

---

### Step 4: Improve rule content

For each rule, enhance the content below the frontmatter:

**Add or improve these sections:**

1. **"When to use this rule:"** section
   ```markdown
   ## When to use this rule:

   - When planning features from Jira tickets
   - When creating requirements.md documents
   - When analyzing feature dependencies
   - When identifying similar features in codebase
   ```

2. **Clear examples** of activation scenarios

3. **Tool Integration** section (if applicable)
   - Reference tool guides: `@shipmate-core/tools/jira-cli.mdc`
   - Show key commands used by this rule

4. **Context references**
   - Use proper @file syntax
   - Link to relevant standards and guides

---

### Step 5: Analyze existing commands

For each command in `.cursor/commands/`:

**Read and understand:**
1. **Command name** and filename (e.g., `shipmate-plan.md`)
2. **Command description** at the top
3. **Workflow steps** and phases
4. **Prerequisites** and context needed
5. **Output** and next steps

**Analyze:**
- Is the purpose clear from the description?
- Are prerequisites explicitly stated?
- Are workflow steps numbered and sequential?
- Are context references (@file) used properly?
- Is the output/completion message clear?

---

### Step 6: Improve command structure

For each command, improve its structure:

#### **Command Header:**
```markdown
# Command Name

**Command:** /shipmate-command (Cursor) or @.shipmate/commands/.../command.md (other tools)

**Purpose:** Clear one-sentence description of what this command does

**Workflow:** [Type: Single-agent | Multi-agent]
```

#### **Prerequisites Section:**
- List required files/state
- Reference other commands that should run first
- Specify required configuration

#### **Context to Load Section:**
```markdown
## Context to Load

**Required:**
- @.shipmate/[required context files]

**Optional:**
- @.shipmate/[optional context files]

**Standards:**
- @.shipmate/standards/[relevant standards]
```

#### **Instructions Section:**
- Use numbered phases (Phase 1, Phase 2, etc.)
- Within phases, use numbered steps (Step 1, Step 2, etc.)
- Include what to output to user at each step
- Show example outputs in code blocks

#### **Quality Checklist:**
```markdown
## Quality Checklist

Before finishing, verify:
- [ ] Checklist item 1
- [ ] Checklist item 2
```

---

### Step 7: Improve command clarity

Enhance each command's clarity:

1. **Add clear examples** of good vs. bad outputs
   ```markdown
   ## Examples

   **Good requirement:**
   ```markdown
   - [ ] FR-1: System shall log all CRUD operations...
   ```

   **Bad requirement:**
   ```markdown
   - [ ] FR-1: Add logging
   ```
   ```

2. **Add troubleshooting section**
   ```markdown
   ## Troubleshooting

   **If [problem]:**
   - Solution or workaround
   ```

3. **Reference related workflows**
   ```markdown
   ## Related Commands

   - Previous: /shipmate-[previous-step]
   - Next: /shipmate-[next-step]
   ```

---

### Step 8: Verify tool integrations

For rules and commands that use CLI tools, ensure proper documentation:

**Check for:**
- References to tool guides: `@shipmate-core/tools/[tool]-cli.mdc`
- Example commands shown in code blocks
- Clear explanation of when/why to use each tool

**Tool integration examples:**
```markdown
## Tool Integration

**Primary Tool:** Jira CLI (`jira`)

**Key Commands:**
```bash
# View ticket
jira issue view {JIRA-KEY} --plain

# Update status
jira issue move {JIRA-KEY} "In Progress"
```

**Reference:** See @shipmate-core/tools/jira-cli.mdc for complete guide
```

---

### Step 9: Report improvements

After improving all rules and commands, generate a summary:

```markdown
✅ Cursor Integration Improvements Complete!

## Rules Improved: {count}

**High Priority:**
- shipmate-implementer.md - Enhanced activation conditions
- shipmate-verifier.md - Added tool integration examples

**Medium Priority:**
- shipmate-feature-planner.md - Clarified Jira integration
- shipmate-spec-creator.md - Added Confluence research examples

**Low Priority:**
- shipmate-vision-builder.md - Improved one-time setup clarity

## Commands Improved: {count}

**Single-Agent:**
- plan.md - Added clearer phase descriptions
- spec.md - Enhanced context loading section
- implement.md - Added tool integration examples
- verify.md - Improved quality checklist

**Multi-Agent:**
- spec.md - Clarified delegation workflow
- implement.md - Added parallel execution examples

## Key Improvements:

1. **Better Discoverability**
   - Enhanced `applyWhen` conditions with more keywords
   - Added comprehensive activation scenarios
   - Improved descriptions for clarity

2. **Clearer Tool Integration**
   - Added references to @shipmate-core/tools/ guides
   - Included example CLI commands
   - Documented when to use each tool

3. **Improved Structure**
   - Consistent formatting across all files
   - Clear phase/step numbering
   - Better @file context references

4. **Enhanced Examples**
   - Added good vs. bad examples
   - Included troubleshooting sections
   - Related command references

## Next Steps:

1. **Review changes** in `.cursor/rules/` and `.cursor/commands/`
2. **Test activation** by working on features to see if rules activate properly
3. **Iterate** - Use this command again after making changes to further refine
4. **Share feedback** with team if rules work well or need adjustment
```

---

## Quality Guidelines

### For Rules:

**Good `description`:**
```yaml
description: Feature planning specialist for Jira-driven development. Activates when planning features, analyzing Jira tickets, creating requirements.md, or discussing feature scope and dependencies.
```

**Bad `description`:**
```yaml
description: Planning persona
```

**Good `applyWhen`:**
```yaml
applyWhen: >
    when running shipmate-plan, planning features, analyzing Jira tickets,
    creating requirements documents, discussing feature dependencies, or
    identifying similar features in the codebase
```

**Bad `applyWhen`:**
```yaml
applyWhen: planning
```

### For Commands:

**Good command header:**
```markdown
# Plan Feature

**Command:** /shipmate-plan (Cursor) or @.shipmate/commands/plan/single-agent/plan.md

**Purpose:** Create comprehensive feature plan from Jira ticket by merging ticket context with product vision
```

**Bad command header:**
```markdown
# Plan

Plan a feature
```

---

## Advanced Tips

### Rule Activation Testing:

After improving rules, test activation by:
1. Start typing relevant keywords (e.g., "plan feature")
2. Check if appropriate rule activates (look for persona indicators)
3. Verify context is loaded correctly
4. Adjust `applyWhen` if rule doesn't activate when expected

### Command Discoverability:

Make commands easy to discover:
1. Use clear, action-oriented names
2. Include purpose statement at top
3. Add keywords in description
4. Reference related commands

### Continuous Improvement:

Run this command periodically:
- After adding new rules or commands
- When rules aren't activating as expected
- After major ShipMate updates
- When onboarding new team members

---

## Related Resources

**Cursor Documentation:**
- [Cursor Rules Documentation](https://docs.cursor.com/context/rules)
- [Cursor Commands Documentation](https://docs.cursor.com/context/commands)

**ShipMate Resources:**
- [@shipmate-core/agents/](../../agents/) - Source persona definitions
- [@shipmate-core/commands/](../) - Command templates
- [@shipmate-core/tools/](../../tools/) - CLI tool guides

---

## Troubleshooting

**If rules aren't activating:**
1. Check `applyWhen` includes relevant keywords
2. Verify priority is appropriate
3. Ensure description is clear and specific
4. Test with explicit keywords from `applyWhen`

**If commands aren't discoverable:**
1. Ensure command name matches workflow name
2. Add clear purpose statement
3. Use consistent naming with other commands
4. Reference in related command's "Next Steps"

**If improvements break existing workflows:**
1. Review changes carefully
2. Test one rule/command at a time
3. Revert if needed and iterate
4. Ask team for feedback on changes
