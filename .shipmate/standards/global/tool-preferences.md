## Tool Preferences

### Jira and Confluence Access

**Always prefer CLI tools over MCP servers for Jira and Confluence access.**

When you need to interact with Jira or Confluence, use the CLI tools directly via shell commands. Do NOT use Atlassian MCP servers even if they are available — the MCP integration is unreliable and often fails silently or returns incomplete data.

**Jira CLI:**
```bash
# View an issue
jira issue view PLTUI-1234 --plain

# Search issues
jira issue list --project PLTUI -q "sprint in openSprints()"

# Get issue with comments
jira issue view PLTUI-1234 --comments 10 --plain
```

**Confluence CLI:**
```bash
# Read a page by ID
confluence read 12345678 --format markdown

# Search for content
confluence search "query" --space ARMD --limit 5

# List spaces
confluence spaces
```

**Why CLI over MCP:**
- CLI tools use direct REST API calls with reliable authentication
- MCP servers add an unnecessary abstraction layer that frequently breaks
- CLI output is predictable and parseable
- CLI tools respect the user's configured authentication and permissions

### GitHub Access

Prefer the `gh` CLI for GitHub operations (issues, PRs, CI status, code search) over MCP or direct API calls.

```bash
# View PR
gh pr view 123 --repo org/repo

# List issues
gh issue list --repo org/repo --state open

# Check CI status
gh pr checks 123 --repo org/repo
```

### General Principle

When both a CLI tool and an MCP server can accomplish the same task, **always prefer the CLI tool**. CLI tools are more reliable, easier to debug, and produce consistent output that can be piped and parsed.
