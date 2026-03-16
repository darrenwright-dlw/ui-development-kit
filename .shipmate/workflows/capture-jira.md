# Capture JIRA Ticket

Interactive workflow to create a JIRA ticket to track work, TODOs, bugs, or features. I'll gather the necessary details and create the ticket for you.

## Overview

This command helps you create JIRA tickets by:
1. Determining the ticket type (Story, Bug, Task, Sub-task)
2. Identifying the correct project (PLTUI, SAASUI, etc.)
3. Gathering ticket details (summary, description, priority)
4. Creating the ticket using Jira CLI
5. Optionally creating a branch linked to the ticket

## When to Use

Create JIRA tickets for:
- ✅ TODOs left in code (track technical debt)
- ✅ Bugs discovered during development
- ✅ New features or improvements
- ✅ Refactoring tasks
- ✅ Documentation needs
- ✅ Performance optimizations

## Let's Create Your Ticket

I'll ask you questions to create the perfect JIRA ticket.

### Question 1: What type of ticket?

**Story** - New feature or user-facing change
- Example: "Add dark mode toggle to settings"
- Use when: Building new functionality

**Bug** - Something broken that needs fixing
- Example: "Login fails on Safari 16"
- Use when: Fixing defects or errors

**Task** - Technical work or improvement
- Example: "Replace lodash with change-case for tree-shaking"
- Use when: Refactoring, optimization, technical debt

**Sub-task** - Part of a larger story/task
- Example: "Update API endpoints for dark mode"
- Use when: Breaking down larger work

### Question 2: Which project?

Common projects:
- **PLTUI** - Platform UI team (mysailpoint, auth, etc.)
- **SAASUI** - SaaS UI general
- **Other** - I'll help you find the right one

### Question 3: What's the summary?

A concise, clear title (60 chars or less):
- ✅ Good: "Replace lodash with change-case for better tree-shaking"
- ✅ Good: "Fix memory leak in ResizeObserver cleanup"
- ❌ Bad: "Update stuff"
- ❌ Bad: "TODO from code"

### Question 4: What's the description?

Provide context and details:

**For TODOs:**
```
TODO found in: src/app/components/Widget.tsx

Context: We're currently using a naive approach for data fetching
that doesn't handle pagination properly.

Expected behavior: Should implement cursor-based pagination to
handle large datasets efficiently.

Additional context: This affects the performance dashboard which
can have 10k+ data points.
```

**For Bugs:**
```
Steps to reproduce:
1. Navigate to /dashboard
2. Click on "Export Data"
3. Select CSV format

Expected: CSV downloads with all data
Actual: Only first 100 rows are exported

Browser: Chrome 120, Safari 16
Impact: Users can't export full datasets
```

**For Features:**
```
User story: As a user, I want to filter dashboard data by date range
so I can focus on specific time periods.

Acceptance criteria:
- Date range picker in toolbar
- Filters apply to all widgets
- URL updates with selected range
- Range persists across sessions
```

### Question 5: What's the priority?

- **Critical** - Production down, blocking work
- **High** - Important feature, significant bug
- **Medium** - Normal priority (default)
- **Low** - Nice to have, minor issue

## What I'll Do

Once you provide the details, I will:

### Step 1: Create the JIRA Ticket

Using Jira CLI:
```bash
jira issue create \
  --type Story \
  --project PLTUI \
  --summary "Your summary" \
  --body "Your description" \
  --priority Medium
```

### Step 2: Set Additional Fields (if applicable)

```bash
# Set deploy risk
jira issue edit PLTUI-12345 --custom deploy-risk=Low --no-input

# Set release notes
jira issue edit PLTUI-12345 --custom 'release-notes-required?=Not Required' --no-input
```

### Step 3: Create Branch (optional)

If you want to start working on it immediately:
```bash
git checkout -b your-name/PLTUI-12345
```

### Step 4: Return Ticket Key

I'll provide the ticket key (e.g., `PLTUI-12345`) so you can:
- Reference it in commits: `PLTUI-12345: Summary`
- Update your TODO comment: `// TODO(PLTUI-12345): Description`
- Link to it in PRs

## Example Workflows

### Example 1: Capture TODO

**You have this TODO:**
```typescript
// TODO: Implement retry logic for failed API calls
async function fetchData() { ... }
```

**I'll create:**
- **Type:** Task
- **Project:** PLTUI
- **Summary:** "Implement retry logic for failed API calls"
- **Description:**
  ```
  TODO found in: src/services/api.ts
  
  Current behavior: API calls fail permanently on network errors
  
  Proposed solution: Add exponential backoff retry logic with
  max 3 attempts for failed requests.
  
  Impact: Improves reliability for users on unstable connections
  ```
- **Priority:** Medium

**Result:** `PLTUI-12346`

**Then update your code:**
```typescript
// TODO(PLTUI-12346): Implement retry logic for failed API calls
async function fetchData() { ... }
```

### Example 2: Report Bug

**You found a bug:**
- Login form doesn't validate email format

**I'll create:**
- **Type:** Bug
- **Project:** SAASUI
- **Summary:** "Login form missing email validation"
- **Description:**
  ```
  Steps to reproduce:
  1. Go to /login
  2. Enter "notanemail" in email field
  3. Click submit
  
  Expected: Show "Invalid email format" error
  Actual: Form submits, server returns 400 error
  
  Impact: Poor UX, server errors instead of client validation
  ```
- **Priority:** High

**Result:** `SAASUI-789`

### Example 3: Plan Feature

**You want to add a feature:**
- Export dashboard data as PDF

**I'll create:**
- **Type:** Story
- **Project:** PLTUI
- **Summary:** "Add PDF export for dashboard data"
- **Description:**
  ```
  User story: As a user, I want to export dashboard data as PDF
  so I can share reports with stakeholders who don't have access.
  
  Acceptance criteria:
  - "Export as PDF" button in toolbar
  - PDF includes all visible widgets
  - Respects current filters and date range
  - Generated filename includes date/time
  
  Technical notes:
  - Consider using jsPDF or similar library
  - May need to add server-side generation for large datasets
  ```
- **Priority:** Medium

**Result:** `PLTUI-12347`

## Quick Templates

### Template: TODO Ticket

```
Type: Task
Project: PLTUI
Summary: [TODO description]
Description:
  TODO found in: [file path]
  
  Current state: [what exists now]
  
  Needed: [what should be implemented]
  
  Reason: [why this is needed]
Priority: Medium
```

### Template: Bug Ticket

```
Type: Bug
Project: [PROJECT]
Summary: [Brief description of bug]
Description:
  Steps to reproduce:
  1. [Step]
  2. [Step]
  
  Expected: [What should happen]
  Actual: [What actually happens]
  
  Environment: [Browser/OS if relevant]
  Impact: [Who is affected]
Priority: [Critical/High/Medium/Low]
```

### Template: Feature Ticket

```
Type: Story
Project: [PROJECT]
Summary: [Feature name]
Description:
  User story: As a [role], I want to [action]
  so that [benefit].
  
  Acceptance criteria:
  - [Criterion 1]
  - [Criterion 2]
  
  Technical considerations:
  - [Note 1]
  - [Note 2]
Priority: Medium
```

## Best Practices

### Good Ticket Summaries

✅ **Specific:** "Fix memory leak in ResizeObserver cleanup"
✅ **Action-oriented:** "Add pagination to user list"
✅ **Concise:** Under 60 characters
✅ **Clear:** Anyone can understand the goal

❌ **Vague:** "Fix bug"
❌ **Too long:** "We need to implement a comprehensive solution for..."
❌ **Unclear:** "Update thing"

### Good Descriptions

✅ **Include context:** Why this matters
✅ **Provide examples:** Code snippets, screenshots
✅ **List acceptance criteria:** How to know it's done
✅ **Note constraints:** Performance, security, compatibility

❌ **Just repeat summary:** No additional info
❌ **Too brief:** "See title"
❌ **Copy-paste TODO:** Without context

### Priority Guidelines

**Critical:**
- Production is down
- Security vulnerability
- Data loss possible

**High:**
- Blocking other work
- Major feature
- Significant user impact

**Medium (default):**
- Normal development work
- Planned features
- Non-blocking bugs

**Low:**
- Nice to have
- Minor UI issues
- Future optimizations

## Integration with TODO Hook

When the `check-todos` hook runs at agent stop, it will suggest using this command:

```
📝 TODOs found in staged files:

  src/app/widget.ts:45: // TODO: Add error handling

💡 These TODOs should be tracked in JIRA

Do you have JIRA tickets for these TODOs?
  1. Yes, I have JIRA tickets
  2. No, I need to create JIRA tickets → Use: /capture-jira
  3. These are trivial (skip tracking)

Reminder: Use /capture-jira command to create JIRA tickets
```

Just type `/capture-jira` and I'll guide you through creating tickets for your TODOs!

## After Creating the Ticket

### Update Your TODO Comment

```typescript
// Before
// TODO: Add error handling

// After  
// TODO(PLTUI-12345): Add error handling for network failures
```

### Reference in Commits

```bash
git commit -m "PLTUI-12345: Add retry logic foundation

- Add exponential backoff utility
- Update API service to support retries
- Add tests for retry behavior"
```

### Create Branch

```bash
git checkout -b your-name/PLTUI-12345
```

## Troubleshooting

**"Command not found: jira"**
- Install Jira CLI: See [setup-cli-tools.md](./setup-cli-tools.md)
- Or: `brew install ankitpokhrel/jira-cli/jira-cli`

**"Authentication failed"**
- Run: `jira auth login`
- Follow prompts to authenticate

**"Invalid project key"**
- Check available projects: `jira project list`
- Verify you have access to the project

**"Cannot create issue"**
- Check required fields for that issue type
- Some projects have custom required fields

## Related Resources

- [Jira CLI Guide](../.cursor/rules/jira-cli.mdc) - Complete Jira CLI reference
- [Hooks Reference](../.cursor/rules/hooks.mdc) - Info on check-todos hook
- [Code Comments Rule](../.cursor/rules/code-comments.mdc) - TODO best practices
- [Quick Change to Repo](./quick-change-to-repo.md) - For external repos

## Ready to Create Your Ticket?

Just tell me:
1. What you're tracking (TODO, bug, feature, etc.)
2. The basic description

I'll ask follow-up questions and create the ticket! 🎫

