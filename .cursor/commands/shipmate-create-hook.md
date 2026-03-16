---
version: 1.0
context:
  - @README.md
  - @.shipmate/agents/**/*
---
# Create Cursor Hook

Interactive workflow to create a new Cursor hook for the monorepo. I'll guide you through the process and set everything up.

## Overview

This command will help you create a custom Cursor hook by:
1. Understanding what you want to automate
2. Choosing the right hook type (afterFileEdit or stop)
3. Creating the hook script
4. Adding it to `.cursor/hooks.json`
5. Testing the hook

## Let's Get Started

I'll ask you a few questions to create the perfect hook for your needs.

### Question 1: What do you want to automate?

Please describe what you'd like the hook to do. For example:
- "Run tests after I edit test files"
- "Check for TODO comments when agent stops"
- "Update package.json version when files change"
- "Notify me when certain files are modified"
- "Generate documentation after code changes"

### Question 2: When should it run?

Based on your answer, I'll suggest the best hook type:

**afterFileEdit** - Best for:
- Linting/formatting code
- Running type checks
- Auto-generating files
- Updating related files
- Immediate validation

**stop** - Best for:
- Summary reports
- Cleanup tasks
- Notifications
- Final validations
- Preparing for commit

### Question 3: What's the command?

I'll help you write either:
- A simple shell command (e.g., `npm run test:affected`)
- A custom script (I'll create `.cursor/hooks/your-script.sh`)

## Example Workflows

### Example 1: Auto-format on Edit

**You want:** Automatically format code with Prettier after edits

**I'll create:**
```json
{
  "name": "Auto Format",
  "command": "npm run format:affected",
  "description": "Format code with Prettier after edits"
}
```

**Hook type:** `afterFileEdit`

### Example 2: Check for Secrets

**You want:** Scan for accidentally committed secrets before stopping

**I'll create:**
```bash
#!/bin/bash
# .cursor/hooks/check-secrets.sh

echo "🔍 Scanning for secrets..."
if git diff --cached | grep -i "api[_-]key\|password\|secret"; then
  echo "⚠️  Warning: Possible secret detected!"
  echo "Please review your changes"
fi
```

```json
{
  "name": "Check Secrets",
  "command": "sh .cursor/hooks/check-secrets.sh",
  "description": "Scan for accidentally committed secrets"
}
```

**Hook type:** `stop`

### Example 3: Update Documentation

**You want:** Regenerate API docs when source files change

**I'll create:**
```json
{
  "name": "Update API Docs",
  "command": "npm run docs:generate",
  "description": "Regenerate API documentation"
}
```

**Hook type:** `afterFileEdit`

### Example 4: Run Affected Tests

**You want:** Run tests for affected projects before stopping

**I'll create:**
```json
{
  "name": "Run Affected Tests",
  "command": "nx affected:test --parallel=3",
  "description": "Run tests for affected projects"
}
```

**Hook type:** `stop`

## What I'll Do

Once you provide the details, I will:

### Step 1: Create Hook Script (if needed)

If you need a custom script, I'll create:
```bash
.cursor/hooks/your-hook-name.sh
```

With proper:
- Shebang (`#!/bin/bash`)
- Error handling
- Helpful output
- Exit codes
- Executable permissions

### Step 2: Update hooks.json

I'll add your hook to `.cursor/hooks.json`:
```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "name": "Your Hook Name",
        "command": "your command here",
        "description": "What it does"
      }
    ]
  }
}
```

### Step 3: Test the Hook

I'll help you test it:
```bash
# For shell scripts
sh .cursor/hooks/your-hook.sh

# Verify JSON syntax
cat .cursor/hooks.json | jq .
```

### Step 4: Documentation

I'll update the hooks reference with your new hook details.

## Quick Templates

### Template: NPM Script Hook

```json
{
  "name": "Your Task Name",
  "command": "npm run your:script",
  "description": "Description of what it does"
}
```

### Template: Shell Script Hook

```bash
#!/bin/bash
# .cursor/hooks/your-hook.sh

# Your logic here
echo "Doing something..."

# Exit successfully
exit 0
```

### Template: Conditional Hook

```bash
#!/bin/bash
# Only run for specific files

FILE="$1"

if [[ "$FILE" == *.ts ]]; then
  echo "TypeScript file changed: $FILE"
  npm run typecheck
fi
```

### Template: Nx-Aware Hook

```bash
#!/bin/bash
# Check affected projects

AFFECTED=$(nx affected:projects --base=HEAD)

if [ -n "$AFFECTED" ]; then
  echo "Affected projects:"
  echo "$AFFECTED"
  # Do something with affected projects
fi
```

## Common Hook Patterns

### Pattern 1: Conditional Execution

Only run hook for certain file types:
```bash
if [[ "$1" != *.spec.ts ]]; then
  exit 0  # Skip non-test files
fi
```

### Pattern 2: Silent Success

Suppress output unless there's an error:
```bash
npm run build 2>&1 > /dev/null || {
  echo "Build failed!"
  exit 1
}
```

### Pattern 3: Background Execution

Don't block on long-running tasks:
```bash
npm run heavy:task &
echo "Task started in background"
```

### Pattern 4: Multiple Commands

Chain related tasks:
```bash
npm run lint:fix && \
npm run format && \
echo "Code cleanup complete"
```

## Best Practices I'll Follow

1. **Fast execution** - Hooks should complete quickly
2. **Error handling** - Proper exit codes and error messages  
3. **Helpful output** - Clear messages about what's happening
4. **Idempotent** - Safe to run multiple times
5. **Conditional** - Only run when relevant
6. **Non-blocking** - Don't prevent agent from working

## Troubleshooting

If your hook doesn't work, I'll help check:

- ✅ Script has executable permissions (`chmod +x`)
- ✅ Correct path in hooks.json
- ✅ Valid JSON syntax
- ✅ Command exists and works standalone
- ✅ Proper error handling
- ✅ Cursor can access the script

## Ready to Create Your Hook?

Just tell me:
1. What you want to automate
2. Any specific requirements or constraints

I'll handle the rest! 🚀

## Related Resources

- [Hooks Reference Rule](../.cursor/rules/hooks.mdc) - Complete hooks documentation
- [Cursor Hooks Changelog](https://cursor.com/changelog/1-7) - Official documentation
- [Create Command Guide](./create-command.md) - For creating commands instead

