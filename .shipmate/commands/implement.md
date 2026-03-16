# Implement Feature

**Command:** `/shipmate-implement` (Cursor) or `@.shipmate/commands/implement.md` (other tools)

**Purpose:** Implement the feature by following the technical spec and checking off tasks.

**Agent:** Implementer - Code Implementation Specialist (`@.shipmate/agents/implementer.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Prerequisites

- `.shipmate/features/{JIRA-KEY}/requirements.md` with technical design
- `.shipmate/features/{JIRA-KEY}/tasks.md` exists
- Standards loaded

---

## Context to Load

**Required:**
- `@.shipmate/features/{JIRA-KEY}/requirements.md` - Full spec with technical design
- `@.shipmate/features/{JIRA-KEY}/tasks.md` - Task checklist
- `@.shipmate/features/{JIRA-KEY}/assets/` - Mockups, diagrams
- `@.shipmate/standards/` - All coding standards

**Architecture Context:**
- `@.shipmate/project/architecture.md` - Patterns to follow

---

## Intelligent Context Enrichment

**CRITICAL:** Before implementing, gather comprehensive context from external sources.

### Phase 0: Auto-Load External Context

#### 0.1 Fetch Fresh Jira Ticket Context

```bash
# Get latest ticket details (may have been updated since spec was created)
jira issue view {JIRA-KEY} --json

# Check for new comments or updates since spec creation
jira issue comment list {JIRA-KEY}

# Get linked issues (may reveal new dependencies)
jira issue view {JIRA-KEY} --json | jq '.fields.issuelinks'

# Check ticket status (ensure it's ready for implementation)
jira issue view {JIRA-KEY} --json | jq '.fields.status.name'
```

**If ticket updated since spec:**
```markdown
⚠️ **Ticket Updated Since Spec Creation**

Changes detected:
- Description modified: {date}
- New comments: {count}
- New linked issues: {list}

**Recommendation:** Review changes before proceeding. Update spec if needed.
```

#### 0.2 Fetch Linked Confluence Documentation

```bash
# Parse Confluence links from Jira ticket description
# Look for: confluence.sailpoint.com/..., PRD, Design Doc, Tech Spec

# For each linked Confluence page:
confluence read {PAGE-ID} --output markdown

# Search for related pages by JIRA key
confluence search --query "{JIRA-KEY}" --limit 5

# Look for specific doc types:
# - PRD: Product requirements (acceptance criteria source of truth)
# - Design Doc: Technical design (architecture decisions)
# - API Spec: Contract definitions
# - Runbook: Deployment/operational guidance
```

**Store enriched context:**
```markdown
## External Context Sources

**Confluence Documentation:**
- PRD: [{title}]({url}) - Last updated: {date}
- Design Doc: [{title}]({url}) - Last updated: {date}
- API Spec: [{title}]({url}) - Last updated: {date}

**Key Requirements from PRD:**
- {requirement-1}
- {requirement-2}

**Architecture Decisions from Design Doc:**
- {decision-1}: {rationale}
- {decision-2}: {rationale}
```

#### 0.3 Check for API Contract Updates

```bash
# If implementing API integration, check for latest contracts

# For internal APIs - check if schema files exist
ls .shipmate/contracts/*.json 2>/dev/null || ls api-contracts/*.yaml 2>/dev/null

# For OpenAPI specs in the codebase
find . -name "*.openapi.yaml" -o -name "*.openapi.json" | head -5

# Check if dependent services have updated their contracts
git log --oneline --since="$(stat -f %Sm -t %Y-%m-%d requirements.md)" -- "**/api/**" "**/contracts/**"
```

#### 0.4 Detect Breaking Change Risk

```bash
# Check what files this feature will modify
grep -r "TODO: implement" requirements.md tasks.md | grep -oE '[a-zA-Z0-9/_-]+\.(ts|js|go|py|java)'

# For each file, check for dependent consumers
for file in $MODIFIED_FILES; do
  # Find files that import this file
  grep -r "import.*$(basename $file .ts)" --include="*.ts" | head -10

  # Find references in other repos (if monorepo)
  grep -r "$(basename $file .ts)" ../*/src --include="*.ts" 2>/dev/null | head -5
done
```

**If breaking changes detected:**
```markdown
⚠️ **Breaking Change Risk Detected**

Files to modify: {list}

**Dependent consumers found:**
- {file}: imports from {modified-file}
- {file}: uses {exported-function}

**Recommendation:**
- Ensure backward compatibility
- Coordinate with dependent teams
- Consider feature flag for gradual rollout
```

#### 0.5 Fetch Team Standards from Confluence (if not cached)

```bash
# Check if team-specific standards exist
confluence search --query "coding standards {TEAM-NAME}" --limit 3
confluence search --query "best practices {TECH-STACK}" --limit 3

# Common team standards to look for:
# - Code review checklist
# - PR template requirements
# - Testing requirements
# - Documentation requirements
```

---

## Instructions

### 1. Review Context

Before starting:
- Read requirements.md thoroughly
- Understand the technical design
- **Check enriched context from Phase 0**
- Review tasks.md for current status
- Check which tasks are remaining
- **Verify external docs haven't changed since spec**

### 2. Pick Next Task

From tasks.md, select next incomplete task following dependency order:
1. Database tasks first (foundation)
2. Then backend (business logic)
3. Then frontend (UI)
4. Finally testing and deployment

### 3. Load Standards

For the task at hand, load relevant standards:
- Backend task → `@.shipmate/standards/backend/`
- Frontend task → `@.shipmate/standards/frontend/`
- Database task → `@.shipmate/standards/database/`
- Testing task → `@.shipmate/standards/testing/`

### 4. Search for Similar Code

Before implementing, find similar patterns:
```bash
# Find similar components, models, services
# Reference their patterns
# Reuse existing utilities and helpers
```

### 5. Implement with Quality

**Follow this pattern:**

```
1. Write the code following standards
2. Add validation and error handling
3. Add logging for debugging
4. Write tests alongside implementation
5. Run tests and linters
6. Check off task in tasks.md
7. Add implementation notes if needed
```

**Code Quality Standards:**
- Follow naming conventions from standards
- Keep functions small (<50 lines)
- Add JSDoc/Javadoc comments on public methods
- Handle errors explicitly (don't suppress)
- Validate all inputs
- Use existing patterns and utilities

**Testing Standards:**
- Unit tests: ≥80% coverage for backend, ≥70% for frontend
- Test happy path + edge cases + error scenarios
- Integration tests for API endpoints
- E2E tests for critical workflows

### 6. Update tasks.md

As you complete sub-tasks, check them off:

```markdown
- [x] **2.1** Implement Repository
  - [x] CRUD methods
  - [x] Query methods with filtering
  - [x] Write unit tests
  **Note:** Used QueryBuilder for dynamic filters. All tests passing, 88% coverage.
```

Add notes for:
- Important implementation decisions
- Performance optimizations made
- Challenges encountered and solutions
- Deviations from original plan (with rationale)

### 7. Run Quality Checks

Before marking task complete:

```bash
# Run linters
npm run lint         # or equivalent

# Run type checker
npm run type-check   # or equivalent

# Run tests
npm test             # ensure all pass

# Check coverage
npm run coverage     # ensure meets thresholds
```

### 8. Move to Next Task

Repeat steps 2-7 until all tasks complete.

---

## Handling User Corrections

**CRITICAL:** When users provide corrections during implementation, update the feature plans accordingly.

### Recognizing Corrections

User corrections include:
- "That's not right, use X instead"
- "Actually, we should..."
- "Don't do that, I meant..."
- "The spec is wrong about..."
- Any clarification that changes requirements, design, or approach

### Correction Response Process

1. **Acknowledge** the correction immediately
2. **Apply** the correction in code
3. **Update plans** - modify the relevant documents:
   - `plan.md` - If scope or approach changes
   - `spec.md` / `requirements.md` - If technical design changes
   - `tasks.md` - If tasks need to be added, removed, or modified
4. **Document** the change in `implementation-notes.md`:
   ```markdown
   ## User Corrections

   **[Date] Correction:**
   - Original plan: [what was specified]
   - User correction: [what they clarified]
   - Documents updated: [list of files changed]
   ```
5. **Confirm** the updates were made

### Example Workflow

```
User: "Don't create a new database table, extend the existing UserProfile table"

Agent:
✅ Got it! I'll extend UserProfile instead of creating a new table.

📝 Updating feature documentation:
- requirements.md: Updated data model section
- tasks.md: Changed task 1.1 from "Create Preferences table" to "Add preferences columns to UserProfile"
- implementation-notes.md: Documented user correction

Now implementing the column additions to UserProfile...
```

### Why This Matters

Keeping plans synchronized ensures:
- Future sessions have accurate context
- Other team members understand the actual design
- The spec remains a reliable source of truth
- Implementation decisions are traceable

---

## Mode: Single-Agent vs Multi-Agent

### Single-Agent (Default)

Work through tasks sequentially, one at a time.

**When to use:**
- Most features
- Tasks have dependencies
- Feature spans 1-2 domains

### Multi-Agent (with --multi-agent flag)

**When to use:**
- Feature spans 3+ domains (database + backend + frontend + infra)
- Tasks can be parallelized
- Complex feature requiring specialized focus

**How it works:**
```
Coordinator Agent
├─> Backend Specialist (database + backend tasks)
├─> Frontend Specialist (frontend + UI tasks)
├─> Testing Specialist (test tasks)
└─> Integration Agent (final assembly + deployment)
```

Each specialist:
- Works on assigned tasks
- Updates shared tasks.md
- Coordinates through main agent
- Follows same quality standards

---

## Implementation Notes

Create `.shipmate/features/{JIRA-KEY}/implementation-notes.md` for:

```markdown
# Implementation Notes

## Key Decisions

**1. [Decision Title]**
- Context: [why this decision was needed]
- Options considered: [alternatives]
- Choice: [what we chose]
- Rationale: [why]

## Challenges & Solutions

**Challenge:** [problem encountered]
**Solution:** [how we solved it]

## Performance Optimizations

- [Optimization 1]: [impact]
- [Optimization 2]: [impact]

## Test Coverage

- Unit: X% (target: 80%)
- Integration: Y tests passing
- E2E: Z scenarios implemented

## Deviations from Spec

- [Deviation 1]: [rationale]
```

---

## Common Patterns

### Error Handling
```typescript
try {
  // Business logic
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new CustomException('User-friendly message', error);
}
```

### Input Validation
```typescript
function createResource(data: CreateRequest): Resource {
  // Validate inputs
  if (!data.field1) {
    throw new ValidationError('field1 is required');
  }

  // Business logic
  return resource;
}
```

### Testing Pattern
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle happy path', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge case', () => {
      // ...
    });

    it('should handle errors', () => {
      // ...
    });
  });
});
```

---

## Completion Criteria

Before marking feature implementation complete:

- [ ] All tasks in tasks.md checked off
- [ ] All tests passing
- [ ] Code coverage meets thresholds (≥80% backend, ≥70% frontend)
- [ ] Linters pass with 0 errors
- [ ] Type checker passes with 0 errors
- [ ] No hardcoded values or secrets
- [ ] Error handling implemented everywhere
- [ ] Logging added for debugging
- [ ] Implementation notes documented
- [ ] Ready for `/shipmate-verify`

---

## Offer Jira Progress Updates

**After completing implementation (or major milestones), offer to update Jira.**

### Present Options

```
Implementation complete! Would you like to update Jira with progress?

1. Add implementation summary as Jira comment
2. Update ticket status to "Code Review"
3. Both (comment + status update)
4. Skip Jira updates

Which option? (1/2/3/4)
```

### Option 1: Add Implementation Summary to Jira

```bash
jira issue comment add {JIRA-KEY} $'h2. Implementation Complete\n\n*Date:* {date}\n*Branch:* {branch-name}\n\nh3. What Was Implemented\n\n{list-of-completed-tasks}\n\nh3. Key Decisions Made\n\n{decisions-from-implementation-notes}\n\nh3. Test Coverage\n\n* Unit: {X}%\n* Integration: {Y} tests\n* E2E: {Z} scenarios\n\nh3. Files Changed\n\n{count} files (+{additions}, -{deletions})\n\n{panel:title=Ready for Review}\nImplementation complete. Ready for code review.\nBranch: {branch-name}\n{panel}'
```

### Option 2: Update Ticket Status

```bash
# Move to Code Review
jira issue move {JIRA-KEY} "Code Review"

# Update deploy risk if needed
jira issue edit {JIRA-KEY} --custom deploy-risk={Low|Medium|High} --no-input
```

### Option 3: Both

Execute both Option 1 and Option 2.

### Milestone Updates (During Implementation)

**For long implementations, offer progress updates after each major task group:**

```bash
# After completing a task group
jira issue comment add {JIRA-KEY} $'h3. Progress Update\n\n*Completed:* {task-group-name}\n*Progress:* {X}/{Y} tasks ({percent}%)\n\n*Next:* {next-task-group}'
```

---

## Cross-Reference External Context During Implementation

**Reference enriched context when making decisions:**

### When Implementing API Endpoints
```markdown
**Checking API Spec from Confluence:**
- Contract: {endpoint} matches specification ✅
- Request schema: validated against {api-spec-doc}
- Response schema: validated against {api-spec-doc}
```

### When Making Architecture Decisions
```markdown
**Referencing Design Doc:**
- Decision: {decision-made}
- Design Doc guidance: {what-design-doc-says}
- Alignment: ✅ Follows design / ⚠️ Deviation (documented)
```

### When Implementation Deviates from Spec
```markdown
**Deviation Detected:**
- Spec says: {original-requirement}
- Implementation: {what-was-actually-done}
- Reason: {justification}
- Action: Update spec.md and tasks.md to reflect change
```

---

## Persona

Activates **Implementer** persona (high priority).

**Key traits:**
- Focused (stays on task)
- Quality-conscious (doesn't skip tests)
- Pattern-following (reuses existing patterns)
- Communicative (updates tasks.md with notes)
