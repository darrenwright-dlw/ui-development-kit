# Create Cursor Command

This command helps you create new Cursor commands with best practices. It always checks the latest documentation first to ensure we're following current guidelines.

## Important: Always Check Documentation First

Before creating any command, I will:

1. **Check the official Cursor documentation** at https://docs.cursor.com/en/agent/chat/commands
2. **Review latest best practices** for command structure and format
3. **Verify current file naming conventions** (.md vs other formats)
4. **Check for any new features or recommendations**
5. **Self-update this file** if I learn anything new about command creation

## Current Best Practices (Last Updated: 2025-11-07)

Based on https://docs.cursor.com/en/agent/chat/commands:

### Commands vs Rules: Key Differences

**Commands (`.cursor/commands/*.md`):**
- Plain Markdown files (`.md` extension)
- NO frontmatter needed
- Manually activated by typing `/` in Cursor chat
- User chooses when to run them
- Best for: Guided workflows, checklists, step-by-step processes

**Rules (`.cursor/rules/*.mdc`):**
- MDC files (`.mdc` extension - Markdown with Context)
- REQUIRE frontmatter with `ruleType`, `description`, `applyWhen`, etc.
- Automatically applied based on context
- Can use `apply-intelligently` to conditionally apply
- Best for: Coding standards, best practices, context-specific guidance

Example rule frontmatter:
```yaml
---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.
ruleType: apply-intelligently
description: Brief description of the rule
applyWhen: When this rule should be applied
tags:
  - tag1
  - tag2
---
```

### File Format and Location (for Commands)

- **Format:** Plain Markdown (`.md`) files
- **Location:** `.cursor/commands/` directory in project root
- **Naming:** Use descriptive kebab-case names (e.g., `review-code.md`, `create-pr.md`)
- **No frontmatter required:** Commands use plain Markdown without YAML frontmatter

### Command Structure

```markdown
# Command Title

Brief one-sentence description of what this command does.

## Purpose

Detailed explanation of:
- What problem this solves
- When to use this command
- Who should use it

## Prerequisites

List any required:
- Tools (CLI tools, authentication, etc.)
- Configuration files
- Access permissions
- Environment setup

## Workflow / Steps

Step-by-step instructions:

1. **Step 1 Name**
   - Detailed instructions
   - Code examples
   - Expected outcomes

2. **Step 2 Name**
   - More instructions
   - Examples

## Examples

Provide real-world examples showing:
- Common use cases
- Complete workflows
- Expected output

## Troubleshooting

Common issues and solutions:
- Error messages
- Edge cases
- How to debug

## Tips for Success

Best practices and recommendations

## Related Resources

Links to:
- Related commands
- Documentation
- External tools
```

### Command Content Guidelines

1. **Keep commands focused** - One clear purpose per command
2. **Be actionable** - Provide clear, step-by-step instructions
3. **Include examples** - Real-world scenarios and code samples
4. **Add context** - Explain why and when to use
5. **Handle errors** - Include troubleshooting section
6. **Link resources** - Reference related docs and tools

### Activation

Commands are activated by typing `/` in the Cursor chat input, then selecting from the list.

## Self-Update Protocol

**IMPORTANT:** Any time you (the AI) create a command or learn new information about Cursor command best practices, you MUST update this file with:

1. **New best practices discovered** from official docs
2. **Updated examples** that work better
3. **Deprecated patterns** to avoid
4. **New features** in Cursor's command system
5. **Update the "Last Updated" date** in the header

### Update Format

Add new learnings to the appropriate section with a timestamp:

```markdown
### New Best Practice (Added: YYYY-MM-DD)

Description of what was learned and why it matters...
```

## Command Creation Workflow

When a user asks to create a new command, follow this process:

### 1. Check Documentation

```
I'll first check the latest Cursor documentation to ensure we're following current best practices...
```

Then use web_search to check:
- https://docs.cursor.com/en/agent/chat/commands
- Cursor community forums for recent discussions
- GitHub issues/discussions about commands

### 2. Gather Requirements

Ask the user:
- **Command name:** What should it be called?
- **Purpose:** What problem does it solve?
- **Workflow:** What are the key steps?
- **Tools needed:** What CLIs, APIs, or tools are required?
- **Examples:** Any specific use cases to include?

### 3. Create Command Structure

Based on latest best practices, create the `.md` file in `.cursor/commands/` with:
- Clear title and description
- Purpose and use cases
- Prerequisites
- Step-by-step workflow
- Examples
- Troubleshooting
- Related resources

### 4. Update Documentation

Update `.cursor/commands/README.md` to:
- Add the new command to the list
- Include brief description
- Note use cases

### 5. Self-Update (If Needed)

If you learned anything new about Cursor commands while creating this command:
- Update this file with new best practices
- Add timestamp
- Document what changed and why

## Example: Creating a "review-pr" Command

**User Request:** "Create a command to help review PRs with a checklist"

**AI Response:**

```markdown
I'll first check the latest Cursor documentation to ensure we're following current best practices...

[Performs web search for latest docs]

Based on the current documentation, I'll create a new command called `review-pr.md` in the `.cursor/commands/` directory.
```

**Created File:** `.cursor/commands/review-pr.md`

```markdown
# Review Pull Request

A comprehensive checklist for reviewing pull requests to ensure quality and consistency.

## Purpose

This command provides a structured approach to PR reviews, ensuring you don't miss important aspects like:
- Code quality and style
- Test coverage
- Documentation updates
- Security considerations

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Access to the repository
- PR number or URL

## Review Checklist

### 1. Understand the Context

- [ ] Read the PR description and linked issues
- [ ] Understand the problem being solved
- [ ] Check if this is the right approach

### 2. Code Quality

- [ ] Code follows project style guidelines
- [ ] No unnecessary complexity
- [ ] Good variable and function names
- [ ] Proper error handling
- [ ] No commented-out code

[... rest of checklist ...]
```

Then update `.cursor/commands/README.md` and this file if needed.

## Known Limitations

- Commands are static Markdown files (not dynamic)
- No parameters or arguments (unlike CLI tools)
- Works best for guided workflows and checklists
- For complex automation, consider creating shell scripts

## Advanced Patterns

### Multi-Step Workflows

For complex tasks, break into phases:

```markdown
## Phase 1: Preparation
... steps ...

## Phase 2: Execution
... steps ...

## Phase 3: Verification
... steps ...
```

### Integration with Rules

Commands can reference rules for additional context:

```markdown
See [Jira CLI Guide](../.cursor/rules/jira-cli.mdc) for detailed syntax.
```

### Code Snippets

Include executable code blocks:

```bash
# Clone repository
git clone https://github.com/org/repo.git
cd repo

# Create branch
git checkout -b feature/new-feature
```

### Decision Trees

Help users choose the right path:

```markdown
## Which approach should I use?

- **If you're making a quick fix:** Use approach A
- **If you're adding a new feature:** Use approach B
- **If you're refactoring:** Use approach C
```

## Quality Checklist for New Commands

Before finalizing a new command, verify:

- [ ] Checked latest Cursor documentation
- [ ] Command name is descriptive and kebab-case
- [ ] File is in `.cursor/commands/` directory
- [ ] Uses plain Markdown (`.md` extension)
- [ ] Has clear title and description
- [ ] Includes purpose and use cases
- [ ] Lists prerequisites
- [ ] Provides step-by-step instructions
- [ ] Contains working examples
- [ ] Has troubleshooting section
- [ ] Links to related resources
- [ ] Updated `.cursor/commands/README.md`
- [ ] Self-updated this file if new patterns learned

## Testing Commands

After creating a command:

1. **Restart Cursor** or reload window
2. **Type `/` in chat** to see command list
3. **Select your command** and verify it appears
4. **Follow the instructions** to test the workflow
5. **Iterate and improve** based on usage

## Resources

- [Official Cursor Commands Documentation](https://docs.cursor.com/en/agent/chat/commands)
- [Cursor Community Forum](https://forum.cursor.com/)
- [Example Commands Repository](https://github.com/cursor-community/commands) (if exists)
- [This Project's Rules](../.cursor/rules/) - Reference for related patterns

## Version History

### v1.0.0 (2025-11-07)

- Initial version based on official Cursor documentation
- Established self-update protocol
- Created command creation workflow
- Added quality checklist

---

**Important Reminders:**

1. **Always check documentation first** - Verify latest best practices before creating
2. **Self-update this file** - Add new learnings with timestamps
3. **No README files in .cursor/** - Each command/rule is self-documenting
4. **Keep it focused** - One clear purpose per command

---

**Remember:** Always check the documentation first, and always self-update this file when you learn something new!

