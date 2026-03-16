# Learn Project

**Command:** `/shipmate-learn` (Cursor) or `@.shipmate/commands/learn.md` (other tools)

**Purpose:** Learn about your project by building product vision and discovering project setup, then save the information for other Shipmate commands to use.

**Agent:** Vision Builder - Product Vision Initialization Specialist (`@.shipmate/agents/vision-builder.md`)

---

## Important: Tool Preferences

**Use CLI tools for all external service access. Do NOT use MCP servers for Jira or Confluence** — use `jira` and `confluence` CLI commands directly via shell. MCP integrations for Atlassian are unreliable and produce incomplete results. The CLI commands below are the correct approach.

---

## Recommended Model

<!-- TODO: Future enhancement - make model selection configurable via global/project config -->
**Claude Opus 4.6** (claude-opus-4-6) is the recommended model for this command.

This model provides the deep analytical capabilities needed for:
- Comprehensive codebase scanning and pattern recognition
- Domain knowledge extraction and business rule identification
- Accurate technology stack detection
- High-quality vision document generation

If using a different model, results may vary in depth and accuracy.

---

## Overview

This command runs a multi-phase learning process:
1. **Phase 1: Vision Building** - Leverage the vision-builder persona to scan codebase, extract domain knowledge, discover external references (Jira/Confluence), and create vision files
2. **Phase 1.5: User Type Selection** - Select role-specific content types to include based on team composition
3. **Phase 2: PR Convention Discovery** - Analyze merged PRs to infer title patterns, description templates, and review requirements
4. **Phase 3: Project Setup Discovery** - Detect build tools, test frameworks, and operational commands specific to SailPoint technologies
5. **Phase 7: GitHub Copilot Integration** (Optional) - Generate intelligent Copilot instruction files based on project analysis

**Deep Context Gathering:** This command automatically discovers Jira tickets and Confluence URLs referenced in your codebase (READMEs, source comments, config files) and crawls them to enrich the project context with business requirements, architecture decisions, and domain knowledge.

**GitHub Copilot Integration:** If Copilot is enabled in your project config, this command generates `.github/copilot-instructions.md` with distilled project standards, conditional instructions for detected frameworks, and reusable prompts for common development tasks.

---

## Prerequisites

- Project has been initialized with `shipmate init`
- You're in the project root directory

---

## Instructions

### Phase 1: Vision Building (Invoke vision-builder Persona)

**Reference:** `@core/agents/vision-builder.md`

Execute the full vision-builder workflow:

#### 1.1 Scan Codebase

Identify and analyze:
- Service type and purpose
- Architecture patterns
- Directory structure
- Existing features and capabilities

#### 1.2 Extract Domain Knowledge

Discover:
- Business domain terminology
- Key entities and relationships
- Common workflows
- Patterns and conventions used

#### 1.3 External Reference Discovery

Scan the codebase for references to external documentation (Jira tickets, Confluence pages) and crawl them to enrich the context.

**1.3.1 Scan for Jira References**

Search for Jira ticket patterns in source code, READMEs, and comments:

```bash
# Search for Jira ticket patterns in common locations
grep -rE '[A-Z]{2,10}-[0-9]+' \
  --include="*.md" \
  --include="*.txt" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --include="*.go" \
  --include="*.java" \
  --include="*.py" \
  --include="*.yaml" \
  --include="*.yml" \
  . 2>/dev/null | head -100
```

**Common patterns to detect:**
| Pattern | Example | Context |
|---------|---------|---------|
| Ticket in comments | `// TODO: PLAT-1234` | Technical debt, pending work |
| Ticket in README | `See PLAT-1234 for details` | Feature documentation |
| Ticket in commit refs | `Fixes IDN-5678` | Related changes |
| Epic references | `Part of ISC-999` | Parent feature context |

**1.3.2 Scan for Confluence References**

Search for Confluence URLs in the codebase:

```bash
# Search for Confluence URLs
grep -rE 'atlassian\.net/wiki/(spaces|x)/[^\s\)\"]+' \
  --include="*.md" \
  --include="*.txt" \
  --include="*.ts" \
  --include="*.go" \
  --include="*.java" \
  --include="*.py" \
  . 2>/dev/null | head -50

# Also search for short Confluence links
grep -rE 'confluence\.sailpoint\.com/[^\s\)\"]+' \
  --include="*.md" \
  --include="*.txt" \
  . 2>/dev/null | head -50
```

**1.3.3 Crawl Discovered Jira Tickets**

For each unique Jira ticket found, fetch details using Jira CLI:

```bash
# Fetch ticket details
jira issue view {TICKET-ID} --plain

# For tickets with linked epics, also fetch the epic
jira issue view {TICKET-ID} --plain | grep -E "Epic Link|Parent" | awk '{print $NF}' | xargs -I{} jira issue view {} --plain
```

**Extract from Jira tickets:**
- **Summary**: What the ticket is about
- **Description**: Detailed context and requirements
- **Acceptance Criteria**: Expected outcomes
- **Labels**: Categorization and tags
- **Epic/Parent**: Broader feature context
- **Related Issues**: Dependencies and related work
- **Comments**: Additional context and decisions

**Prioritize tickets that appear:**
- In README files (high relevance)
- In TODO/FIXME comments (active work items)
- Multiple times across the codebase (important features)
- In architecture or design docs (key decisions)

**1.3.4 Crawl Discovered Confluence Pages**

For each unique Confluence URL found, fetch content using Confluence CLI:

```bash
# Extract page ID from URL and fetch content
# URL format: https://sailpoint.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title
confluence read {PAGE_ID} --format markdown

# For space-level URLs, search within the space
confluence search "keyword" --space {SPACE_KEY} --limit 5
```

**Extract from Confluence pages:**
- **Page Title**: Document name
- **Content Summary**: Key points and information
- **Architecture Diagrams**: System design context (note: images referenced but not rendered)
- **Decision Records**: ADRs and technical decisions
- **API Documentation**: Contract specifications
- **Runbooks**: Operational procedures

**1.3.5 Synthesize External Context**

Compile discovered external references into a context summary:

```markdown
## External References Discovered

### Jira Tickets ({N} found, {M} crawled)

**Key Feature Tickets:**
| Ticket | Summary | Relevance |
|--------|---------|-----------|
| {TICKET-1} | {summary} | Found in README, main feature |
| {TICKET-2} | {summary} | TODO in source, pending work |

**Technical Context from Tickets:**
- {Key insight 1 from ticket descriptions}
- {Key insight 2 from acceptance criteria}
- {Key insight 3 from epic context}

### Confluence Pages ({N} found, {M} crawled)

**Architecture & Design Docs:**
| Page | Summary | Relevance |
|------|---------|-----------|
| {Page 1} | {summary} | Architecture overview |
| {Page 2} | {summary} | API design decisions |

**Key Information from Confluence:**
- {Key insight 1 from design docs}
- {Key insight 2 from ADRs}
- {Key insight 3 from runbooks}

### Integration into Vision

This external context will be incorporated into:
- **mission.md**: Business context from epics and feature tickets
- **architecture.md**: Technical decisions from Confluence ADRs
- **domain.md**: Domain concepts from ticket descriptions and docs
```

**1.3.6 Handle Authentication Issues**

If CLI authentication has expired or needs refresh:

```
I found references to external documentation but hit authentication issues:

**Jira:** {error message}
**Confluence:** {error message}

Let me help you re-authenticate:

**For Jira:**
Run: jira init
Then re-run /shipmate-learn

**For Confluence:**
Run: confluence auth
Then re-run /shipmate-learn

Would you like to:
[ ] Re-authenticate now (I'll wait)
[ ] Continue without external context for now
[ ] Manually provide key context from these references
```

**Note:** Jira CLI and Confluence CLI are installed as part of `shipmate install`. If you're seeing "command not found" errors, run `shipmate doctor` to verify your installation.

---

#### 1.4 Create Vision Files

Generate the following files, incorporating context from external references (Phase 1.3):

**`@.shipmate/project/mission.md`**
- Service purpose and why it exists
- Core responsibilities
- Key users and use cases
- Business context from discovered Jira epics and feature tickets

**`@.shipmate/project/architecture.md`**
- Service type (API, Frontend, Worker, etc.)
- Tech stack details
- Key architectural patterns
- Technical decisions from discovered Confluence ADRs

**`@.shipmate/project/domain.md`**
- Domain glossary and concepts
- Core entities and their purposes
- Business rules
- Domain terminology from ticket descriptions and design docs

**`@.shipmate/project/external-references.md`** (if external references found)
- List of discovered Jira tickets with summaries
- List of discovered Confluence pages with summaries
- Key insights extracted from external sources
- Links to original sources for deeper reading

#### 1.5 Validate with User

Present findings including external context:
```
I've analyzed your codebase and discovered:

Service Type: [API Service | Frontend App | Background Worker | etc.]
Tech Stack: [detected technologies]
Main Domain: [primary business domain]

Found:
- X API endpoints
- Y domain models
- Z key patterns

Key Entities:
- [Entity 1]: [brief description]
- [Entity 2]: [brief description]

External References Discovered:
- {N} Jira tickets referenced in codebase
  - Key tickets: {TICKET-1}, {TICKET-2}, {TICKET-3}
  - Crawled {M} tickets for context
- {N} Confluence pages referenced
  - Key pages: {Page 1}, {Page 2}
  - Crawled {M} pages for context

Key Insights from External Sources:
- [Insight from Jira epic about business goals]
- [Insight from Confluence ADR about architecture decision]
- [Insight from ticket about domain concept]

Does this look accurate? Any corrections?
```

Wait for user confirmation or corrections before proceeding.

---

### Phase 1.5: User Type Selection

After vision building is complete, help the user select which role-specific content to include for their team.

#### 1.5.1 Load Global Defaults

Check for existing user type preferences from global config (`~/.shipmate/config.yml`):

```
Checking your global Shipmate preferences...
```

If global defaults exist, display them:
```
Your global default user types:
- Engineering IC (Individual Contributor)
- Product Manager

Would you like to use these defaults for this project, or customize?
[Enter to accept defaults / C to customize]
```

If no global defaults exist, proceed directly to selection.

#### 1.5.2 Display Available User Types

Present the available user types for selection:

```
Select which role-specific content to include for this project:

Available User Types:
[ ] Engineering IC (Individual Contributor) - Developer workflows, coding standards, PR guidelines
[ ] Engineering Manager - Team coordination, sprint planning, technical leadership
[ ] Product Manager - Feature planning, requirements gathering, stakeholder communication
[ ] UX Designer - Design systems, accessibility standards, user research patterns

Use space to select/deselect, Enter to confirm.
```

#### 1.5.3 Confirm Selection

After user makes selection:
```
Selected user types for this project:
- [Selected Type 1]
- [Selected Type 2]

This will enable role-specific:
- Agent personas for each role
- Command enhancements tailored to each role
- Documentation templates specific to each role

Confirm selection? [Y/n]
```

#### 1.5.4 Store Selection in Project Config

Save the user type selection to the project configuration:

**Location:** `@.shipmate/config.yml`

```yaml
# User types selected for this project
# Enables role-specific content and personas
userTypes:
  - engineering-ic
  - product-manager
```

This enables:
- Future `shipmate update` commands to sync role-specific content
- Role-aware command behavior throughout the project
- Consistent team configuration across sessions

**Note:** Selection is stored in project config (`@.shipmate/config.yml`), not global config. This allows different projects to have different role configurations while maintaining global defaults.

---

### Phase 2: Pull Request Convention Discovery

After vision building and user type selection, analyze the repository's PR conventions to understand how the team documents changes.

#### 2.1 Check for Existing PR Template

First, check if a PR template already exists:

```bash
# Check common locations for PR templates
gh api repos/{owner}/{repo}/contents/.github/pull_request_template.md --jq '.content' | base64 -d 2>/dev/null
gh api repos/{owner}/{repo}/contents/.github/PULL_REQUEST_TEMPLATE.md --jq '.content' | base64 -d 2>/dev/null
gh api repos/{owner}/{repo}/contents/docs/pull_request_template.md --jq '.content' | base64 -d 2>/dev/null
```

If a template is found:
```
Found existing PR template at .github/pull_request_template.md

I'll use this as the basis for PR conventions documentation.
```

#### 2.2 Analyze Merged PRs (if no template found)

If no template exists, analyze recent merged PRs to infer conventions:

```bash
# Fetch last 20 merged PRs with their descriptions
gh pr list --state merged --limit 20 --json number,title,body,author,mergedAt
```

**Analysis Points:**
- **Title patterns**: Does the team use conventional commits? Jira ticket prefixes? Feature descriptions?
- **Description structure**: Are there consistent sections (Summary, Testing, Screenshots)?
- **Checklists**: Are there standard checklists used across PRs?
- **Labels/categories**: How are changes categorized?
- **References**: How are tickets/issues linked?

#### 2.3 Infer PR Conventions

Analyze the fetched PRs to identify patterns:

**Title Patterns to Detect:**

SailPoint standard PR title format:
| Pattern | Example | Detection |
|---------|---------|-----------|
| Standard | `JIRA-123: Add user authentication` | Regex: `^[A-Z]+-\d+:\s.+` |
| With SemVer | `JIRA-123: [MINOR] Add user authentication` | Regex: `^[A-Z]+-\d+:\s\[(MAJOR|MINOR|PATCH)\]\s.+` |

**Note:** The standard format is always `JIRA-ID: Message`. For repos using semantic versioning, the format is `JIRA-ID: [MAJOR/MINOR/PATCH] Message`.

Analyze merged PRs to determine:
- Whether the repo uses the SemVer variant
- Common Jira project prefixes used (e.g., `PLAT-`, `IDN-`, `ISC-`)

**Description Sections to Detect:**
- `## Summary` / `## Description` / `## What`
- `## Changes` / `## What Changed`
- `## Testing` / `## Test Plan` / `## How to Test`
- `## Screenshots` / `## Visuals`
- `## Related Issues` / `## Jira` / `## Tickets`
- `## Checklist` / `## Review Checklist`
- `## Breaking Changes`
- `## Deployment Notes`

#### 2.4 Generate PR Conventions Document

Create `@.shipmate/project/pull-requests.md`:

```markdown
# Pull Request Conventions

> Generated by `/shipmate-learn` on {YYYY-MM-DD HH:mm}
> Source: {Existing template | Inferred from {N} merged PRs}

---

## PR Title Format

**Standard Format:** `JIRA-ID: Message`

**Uses SemVer:** {Yes | No}
- If Yes: `JIRA-ID: [MAJOR|MINOR|PATCH] Message`

**Common Jira Prefixes in this repo:**
- `{PREFIX-}` (e.g., PLAT-, IDN-, ISC-)

**Examples from this repo:**
- `{example 1 from actual PRs}`
- `{example 2 from actual PRs}`

---

## PR Description Template

{If template exists, include it here}

{If inferred, generate a template based on common sections found:}

```markdown
## Summary

{Brief description of changes}

## Changes

- {Change 1}
- {Change 2}

## Testing

{How was this tested?}

## Related Issues

{Links to Jira tickets, GitHub issues, etc.}

{Additional sections detected in PRs}
```

---

## Common Sections Used

| Section | Usage Rate | Purpose |
|---------|------------|---------|
| Summary | {X}% | Brief description of changes |
| Changes | {X}% | List of specific modifications |
| Testing | {X}% | Test verification details |
| {other sections found} | {X}% | {purpose} |

---

## Labels & Categories

{If labels are consistently used, document them here}

- `{label}`: {description}
- `{label}`: {description}

---

## Review Requirements

{Inferred from PR patterns}

- Required reviewers: {count or "not enforced"}
- CI checks: {required/optional}
- Approval count: {number}

---

## Best Practices for This Repo

Based on analysis of merged PRs:

1. {Practice 1 - e.g., "Always include Jira ticket in title"}
2. {Practice 2 - e.g., "Include screenshots for UI changes"}
3. {Practice 3 - e.g., "Document breaking changes explicitly"}

---

## Quick Reference

**Creating a PR:**
```bash
# Create PR with conventional format
gh pr create --title "{format}" --body "$(cat <<'EOF'
{template}
EOF
)"
```
```

#### 2.5 Assess Confidence and Ask Clarifying Questions

Before presenting findings, assess confidence levels for each detected pattern:

**Confidence Assessment:**
- **High (>80%)**: Pattern found in 80%+ of analyzed PRs, or explicit template exists
- **Medium (50-80%)**: Pattern found in 50-80% of PRs, some variation observed
- **Low (<50%)**: Pattern found in <50% of PRs, or conflicting patterns detected

**For Low/Medium Confidence Items, Ask Clarifying Questions:**

```
I found some patterns in your PRs, but I'm not 100% confident about a few things:

**SemVer in PR Titles** (Confidence: {X}%)
I {found | did not find} semantic version tags in PR titles.
Examples I found:
- "{example 1}"
- "{example 2}"

Does this repo use SemVer tags in PR titles?
[ ] Yes - Format: `JIRA-ID: [MAJOR|MINOR|PATCH] Message`
[ ] No - Format: `JIRA-ID: Message`

---

**Jira Project Prefix** (Confidence: {X}%)
I detected these Jira prefixes: {PREFIX1-, PREFIX2-}

Is this the correct Jira project prefix for this repo?
[ ] Yes, that's correct
[ ] No, we use: ____________

---

**PR Description Sections** (Confidence: {X}%)
I found these sections used inconsistently:
- {section 1}: Used in {X}% of PRs
- {section 2}: Used in {X}% of PRs

Which sections should be required vs optional?
Required: ____________
Optional: ____________

---

**Jira/Issue Linking** (Confidence: {X}%)
I couldn't determine a consistent pattern for linking tickets.
How does your team link Jira tickets in PRs?
[ ] In the title: [PROJ-123] Description
[ ] In the body with a section header
[ ] Using GitHub/Jira integration (auto-linked)
[ ] Other: ____________

---

**Review Process** (Confidence: {X}%)
I couldn't determine required reviewer count from PR data.
What's your team's review requirement?
[ ] 1 approval required
[ ] 2 approvals required
[ ] Specific team members must approve
[ ] Other: ____________
```

Wait for user responses to clarifying questions.

#### 2.6 Validate PR Conventions

Present complete findings to user with updated confidence:

```
Based on {source: template | N merged PRs} and your clarifications:

**Title Format:** `{JIRA-PREFIX}-XXX: Message` ✓
**Uses SemVer:** {Yes | No} ✓
**Jira Project Prefix:** {PREFIX-} ✓
**Required Sections:** {list of required sections}
**Optional Sections:** {list of optional sections}
**Review Requirements:** {confirmed requirements}

**Key Practices for This Repo:**
- {practice 1}
- {practice 2}
- {practice 3}

Does this accurately reflect your team's PR conventions? Any final corrections?
```

Wait for user confirmation before proceeding.

---

### Phase 3: Project Setup Discovery

After PR convention discovery, detect project configuration for SailPoint-specific technologies.

#### 3.1 Technology Stack Detection

**Frontend Technologies:**

| Technology | Detection Method |
|------------|------------------|
| Node.js | `package.json` exists, `node --version` |
| TypeScript | `tsconfig.json` exists, `typescript` in devDependencies |
| Angular | `@angular/core` in dependencies, `angular.json` exists |

**Backend Technologies:**

| Technology | Detection Method |
|------------|------------------|
| Go | `go.mod` exists, `*.go` files present |
| Java | `pom.xml` or `build.gradle` exists, `*.java` files |
| Python | `requirements.txt`, `pyproject.toml`, or `setup.py` exists |

**Python Frameworks (if Python detected):**

| Framework | Detection Method |
|-----------|------------------|
| Flask | `flask` in requirements |
| SQLAlchemy | `sqlalchemy` in requirements |
| PySpark | `pyspark` in requirements |
| FastAPI | `fastapi` in requirements |

**Infrastructure:**

| Technology | Detection Method |
|------------|------------------|
| Docker | `Dockerfile` or `docker-compose.yml` exists |
| Terraform | `*.tf` files or `terraform/` directory |
| Jenkins/CloudBees | `Jenkinsfile` exists |

#### 3.2 Package Manager Detection

**Node.js projects:**
- `pnpm-lock.yaml` exists -> pnpm
- `yarn.lock` exists -> yarn
- `package-lock.json` exists -> npm

**Python projects:**
- `poetry.lock` exists -> poetry
- `Pipfile.lock` exists -> pipenv
- `requirements.txt` exists -> pip

**Go projects:**
- `go.mod` exists -> go mod

**Java projects:**
- `pom.xml` exists -> Maven
- `build.gradle` exists -> Gradle

#### 3.3 Script & Command Detection

From `package.json` scripts, `Makefile`, or equivalent:
- **Dev command:** How to start development server
- **Build command:** How to build for production
- **Test command:** How to run tests
- **Lint command:** How to run linting/formatting

#### 3.4 Configuration Files

Check for presence of:
- TypeScript config: `tsconfig.json`
- Linter config: `eslint.config.*`, `.eslintrc.*`, `biome.json`, `golangci.yml`
- Test config: `jest.config.*`, `vitest.config.*`, `pytest.ini`, `go.mod`
- Docker: `Dockerfile`, `docker-compose.yml`
- CI/CD: `Jenkinsfile`, `.github/workflows/`

---

### Phase 3.5: Style Guide Discovery

**CRITICAL:** Extract coding patterns and style conventions from the existing codebase to create an actionable style guide.

#### 3.5.1 Analyze Code Patterns

```bash
# Find most common import styles
head -50 $(find . -name "*.ts" -o -name "*.tsx" | head -20) | grep -E "^import" | head -30

# Analyze naming conventions
find . -name "*.ts" -exec grep -h "export (class|interface|type|function|const)" {} \; | head -30

# Check for consistent file naming
ls -la src/ | head -20
ls -la src/components/ 2>/dev/null | head -20
ls -la src/services/ 2>/dev/null | head -20

# Analyze function declaration styles (arrow vs function keyword)
grep -rh "const.*= (" --include="*.ts" | head -10
grep -rh "function " --include="*.ts" | head -10

# Check for async/await patterns
grep -rh "async " --include="*.ts" | head -10
```

#### 3.5.2 Extract Style Conventions

**Naming Conventions:**
| Element | Pattern | Example |
|---------|---------|---------|
| Files | {kebab-case\|PascalCase\|camelCase} | `user-service.ts` |
| Classes | {PascalCase} | `UserService` |
| Interfaces | {PascalCase\|IPascalCase} | `User` or `IUser` |
| Functions | {camelCase} | `getUserById` |
| Constants | {SCREAMING_SNAKE\|camelCase} | `MAX_RETRY_COUNT` |
| Test files | {*.spec.ts\|*.test.ts} | `user.spec.ts` |

**Import Organization:**
```typescript
// Detected import order pattern:
// 1. {External packages | Node modules}
// 2. {Internal absolute imports}
// 3. {Relative imports}
// 4. {Type imports}
```

**Code Organization:**
- Export style: {named exports | default exports | mixed}
- Directory structure: {feature-based | layer-based | hybrid}
- Barrel files: {yes | no} - index.ts for re-exports

#### 3.5.3 Generate Style Guide Document

Create `@.shipmate/project/style-guide.md`:

```markdown
# Code Style Guide

> Generated by `/shipmate-learn` on {YYYY-MM-DD HH:mm}
> Based on analysis of existing codebase patterns
> **Use this guide when contributing to fit into the repo's style**

---

## Quick Reference

### Must Follow
- {Critical style rule 1 - most common pattern}
- {Critical style rule 2}
- {Critical style rule 3}

### Strongly Preferred
- {Preferred pattern 1}
- {Preferred pattern 2}

---

## Naming Conventions

### Files & Directories

| Type | Convention | Example |
|------|------------|---------|
| Components | {pattern} | `UserProfile.tsx` |
| Services | {pattern} | `user.service.ts` |
| Utilities | {pattern} | `string-utils.ts` |
| Tests | {pattern} | `user.service.spec.ts` |
| Types/Interfaces | {pattern} | `user.types.ts` |

### Code Elements

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `UserService` |
| Interfaces | {IPrefix?} PascalCase | `User` or `IUser` |
| Types | PascalCase | `UserResponse` |
| Functions | camelCase | `fetchUserData` |
| Constants | {SCREAMING_SNAKE\|camelCase} | `API_BASE_URL` |
| Private fields | {_prefix\|#private\|none} | `_cache` or `#cache` |
| Boolean vars | {is/has/should prefix} | `isLoading`, `hasError` |

---

## Import Organization

**Standard import order for this repo:**

```typescript
// 1. Node built-ins
import path from 'node:path';

// 2. External packages (alphabetized)
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// 3. Internal absolute imports
import { UserService } from '@/services/user.service';
import { API_CONFIG } from '@/config';

// 4. Relative imports (parent first, then siblings)
import { BaseComponent } from '../base.component';
import { UserCard } from './user-card.component';

// 5. Type-only imports
import type { User, UserRole } from './types';
```

---

## Code Patterns

### Function Declarations

**Preferred style in this repo:**

```typescript
// {Arrow functions | Function declarations | Mixed}

// Example from codebase:
{actual code example from repo}
```

### Error Handling

**Standard pattern:**

```typescript
// Example from codebase:
{actual error handling pattern}
```

### Async Operations

**Preferred approach:**

```typescript
// {async/await | Promises | RxJS Observables}

// Example from codebase:
{actual async pattern}
```

---

## Component Patterns (if frontend)

### Component Structure

```typescript
// Standard component structure in this repo:
{actual component structure example}
```

### Props/Inputs Pattern

```typescript
// How props/inputs are defined:
{actual props pattern}
```

---

## Testing Patterns

### Test File Structure

```typescript
// Standard test organization:
describe('{ComponentName}', () => {
  // Setup
  beforeEach(() => {
    {setup pattern}
  });

  describe('{methodName}', () => {
    it('should {expected behavior}', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Mocking Pattern

```typescript
// How mocks are typically created:
{mocking pattern from codebase}
```

---

## Directory Structure

```
src/
├── {detected structure}
│   ├── {subdirectory}
│   └── {subdirectory}
├── {detected structure}
└── {detected structure}
```

**Organization principle:** {feature-based | layer-based | hybrid}

---

## Documentation Patterns

### JSDoc/Comments

```typescript
// Function documentation style:
{actual JSDoc pattern from codebase}

// Inline comments style:
{actual inline comment pattern}
```

---

## Common Utilities & Helpers

**Existing utilities to reuse (don't reinvent):**

| Utility | Location | Purpose |
|---------|----------|---------|
| {utilName} | `{path}` | {description} |
| {utilName} | `{path}` | {description} |

---

## Anti-Patterns to Avoid

Based on codebase analysis, avoid:

1. {Anti-pattern seen and should not be repeated}
2. {Anti-pattern seen and should not be repeated}

---

## Quick Copy-Paste Templates

### New Component

```typescript
{template for new component matching repo style}
```

### New Service

```typescript
{template for new service matching repo style}
```

### New Test

```typescript
{template for new test matching repo style}
```
```

---

### Phase 3.6: Tech Debt & Gaps Discovery

**CRITICAL:** Scan the codebase for tech debt markers, TODOs, and quality gaps to surface for the team.

#### 3.6.1 Scan for TODO/FIXME/HACK Comments

```bash
# Find all TODO comments with context
grep -rn "TODO" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.go" --include="*.py" --include="*.java" . 2>/dev/null | head -100

# Find FIXME comments (usually more urgent)
grep -rn "FIXME" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.go" --include="*.py" . 2>/dev/null | head -50

# Find HACK comments (technical debt indicators)
grep -rn "HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.go" --include="*.py" . 2>/dev/null | head -50

# Find XXX comments (needs attention)
grep -rn "XXX" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.go" --include="*.py" . 2>/dev/null | head -30

# Find deprecated markers
grep -rn "@deprecated" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | head -30

# Find eslint-disable comments (code quality bypasses)
grep -rn "eslint-disable" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | head -30

# Find @ts-ignore comments (TypeScript bypasses)
grep -rn "@ts-ignore\|@ts-expect-error\|@ts-nocheck" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -30

# Find any type usage (TypeScript weakness)
grep -rn ": any\|as any" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -30
```

#### 3.6.2 Categorize Tech Debt

**Severity Categories:**

| Category | Markers | Priority |
|----------|---------|----------|
| Critical | `FIXME`, `SECURITY`, `BUG` | High - fix before next release |
| Important | `TODO`, `HACK`, `REFACTOR` | Medium - plan to address |
| Minor | `XXX`, `NOTE`, `CLEANUP` | Low - nice to have |
| Quality | `eslint-disable`, `@ts-ignore`, `: any` | Varies - reduce over time |

#### 3.6.3 Analyze Tech Debt Patterns

```bash
# Count by category
echo "TODOs: $(grep -r "TODO" --include="*.ts" . 2>/dev/null | wc -l)"
echo "FIXMEs: $(grep -r "FIXME" --include="*.ts" . 2>/dev/null | wc -l)"
echo "HACKs: $(grep -r "HACK" --include="*.ts" . 2>/dev/null | wc -l)"
echo "eslint-disable: $(grep -r "eslint-disable" --include="*.ts" . 2>/dev/null | wc -l)"
echo "any types: $(grep -r ": any" --include="*.ts" . 2>/dev/null | wc -l)"

# Find oldest TODOs (by file modification date)
for file in $(grep -rl "TODO" --include="*.ts" . 2>/dev/null | head -10); do
  echo "$(stat -f %Sm -t %Y-%m-%d "$file") $file"
done | sort

# Find TODOs with Jira tickets (well-documented debt)
grep -rn "TODO.*[A-Z]+-[0-9]+" --include="*.ts" . 2>/dev/null | head -20

# Find TODOs without tickets (undocumented debt)
grep -rn "TODO" --include="*.ts" . 2>/dev/null | grep -v "[A-Z]+-[0-9]+" | head -20
```

#### 3.6.4 Detect Quality Gaps

```bash
# Check test coverage configuration
cat package.json 2>/dev/null | grep -A5 "coverageThreshold"

# Find files without corresponding tests
for file in $(find src -name "*.ts" ! -name "*.spec.ts" ! -name "*.test.ts" | head -20); do
  testFile="${file%.ts}.spec.ts"
  if [ ! -f "$testFile" ]; then
    echo "Missing test: $file"
  fi
done

# Find large files (complexity indicator)
find . -name "*.ts" -exec wc -l {} \; 2>/dev/null | sort -rn | head -10

# Find deeply nested directories (complexity indicator)
find . -type d | awk -F'/' '{print NF-1, $0}' | sort -rn | head -10

# Check for console.log statements (debug code left in)
grep -rn "console\.log" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -20
```

#### 3.6.5 Generate Tech Debt Report

Create `@.shipmate/project/tech-debt.md`:

```markdown
# Technical Debt & Gaps Report

> Generated by `/shipmate-learn` on {YYYY-MM-DD HH:mm}
> **Review this report to understand codebase health and prioritize improvements**

---

## Executive Summary

| Category | Count | Trend |
|----------|-------|-------|
| Total TODOs | {count} | {high/medium/low} |
| FIXMEs (Critical) | {count} | {needs attention if > 0} |
| HACKs | {count} | {technical debt indicator} |
| Type Safety Bypasses | {count} | {eslint-disable + ts-ignore + any} |
| Missing Tests | {count} files | {coverage gap} |

**Overall Health Score:** {X}/100

---

## Critical Issues (Fix ASAP)

### FIXMEs

| Location | Issue | Linked Ticket |
|----------|-------|---------------|
| `{file}:{line}` | {FIXME content} | {JIRA-KEY or "None"} |

### Security Concerns

| Location | Issue | Priority |
|----------|-------|----------|
| `{file}:{line}` | {security-related TODO/comment} | Critical |

---

## Technical Debt by Area

### Area: {Feature/Module 1}

**TODOs:** {count}
**Key Items:**
- `{file}:{line}`: {TODO content}
- `{file}:{line}`: {TODO content}

**Linked Jira Tickets:** {JIRA-1}, {JIRA-2}

### Area: {Feature/Module 2}

**TODOs:** {count}
**Key Items:**
- `{file}:{line}`: {TODO content}

---

## Type Safety Issues

### `any` Type Usage

| File | Count | Risk |
|------|-------|------|
| `{file}` | {count} | {high if >5} |

**Recommendation:** Replace `any` with proper types to improve type safety.

### TypeScript Bypasses

| File | Bypass Type | Reason (if documented) |
|------|-------------|------------------------|
| `{file}:{line}` | `@ts-ignore` | {reason or "undocumented"} |

---

## Code Quality Bypasses

### ESLint Disables

| File | Rule Disabled | Justification |
|------|---------------|---------------|
| `{file}:{line}` | `{rule}` | {inline comment or "none"} |

**Top disabled rules:**
1. `{rule}`: {count} times
2. `{rule}`: {count} times

---

## Test Coverage Gaps

### Files Without Tests

| File | Lines | Complexity | Priority |
|------|-------|------------|----------|
| `{file}` | {lines} | {high/medium/low} | {high if >200 lines} |

### Low Coverage Areas

{If coverage report available, list low-coverage modules}

---

## Large/Complex Files

Files over 500 lines (consider refactoring):

| File | Lines | Suggestion |
|------|-------|------------|
| `{file}` | {lines} | Split into {suggested modules} |

---

## Deprecated Code

| Item | Location | Replacement |
|------|----------|-------------|
| `{deprecated item}` | `{file}` | {suggested replacement} |

---

## Orphaned/Dead Code Indicators

### Console.log Statements

| File | Count | Action |
|------|-------|--------|
| `{file}` | {count} | Remove before production |

### Commented-Out Code

{Large blocks of commented code detected}

---

## Recommendations

### Quick Wins (< 1 hour each)
1. {Quick fix 1}
2. {Quick fix 2}

### Medium Effort (1-4 hours)
1. {Medium fix 1}
2. {Medium fix 2}

### Larger Refactoring (> 1 day)
1. {Large refactor 1}
2. {Large refactor 2}

---

## Tracking & Progress

### How to Reduce Tech Debt

1. **Create Jira tickets** for undocumented TODOs:
   ```bash
   jira issue create --type Task --summary "Tech Debt: {description}" --label tech-debt
   ```

2. **Add ticket references** to existing TODOs:
   ```typescript
   // TODO: JIRA-123 - {description}
   ```

3. **Track in sprints**: Reserve 10-20% capacity for tech debt

### Tech Debt Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| TODO count | {current} | < {target} |
| FIXME count | {current} | 0 |
| any type usage | {current} | < {target} |
| Test coverage | {current}% | > 80% |

---

## Appendix: All Tech Debt Items

<details>
<summary>Full TODO List ({count} items)</summary>

| # | File | Line | Content | Ticket |
|---|------|------|---------|--------|
| 1 | `{file}` | {line} | {content} | {ticket or "-"} |
| 2 | `{file}` | {line} | {content} | {ticket or "-"} |
...

</details>
```

---

### Phase 4: Present Findings for Confirmation

Present all auto-detected findings:

```
## Vision Summary (from Phase 1)

Mission: [brief summary]
Architecture: [service type and patterns]
Domain: [key entities]

---

## User Types (from Phase 1.5)

Selected roles for this project:
- [User Type 1]
- [User Type 2]

---

## PR Conventions (from Phase 2)

**Source:** [Existing template | Inferred from N merged PRs]
**Title Format:** `{JIRA-PREFIX}-XXX: Message`
**Uses SemVer:** [Yes | No]
**Key Sections:** [Summary, Changes, Testing, etc.]

---

## Project Setup (from Phase 3)

### Technology Stack
- **Primary Language:** [Go | Java | TypeScript | Python]
- **Framework:** [Angular | Flask | FastAPI | Spring | etc.]
- **Runtime:** [Node.js X | Go X.X | Java X | Python X.X]

### Package Manager
- **Tool:** [npm | pnpm | pip | poetry | go mod | maven]
- **Lockfile:** [lockfile name]

### Commands
| Action | Command |
|--------|---------|
| Development | `[command]` |
| Build | `[command]` |
| Test | `[command]` |
| Lint | `[command]` |

### Infrastructure
- Docker: [yes/no]
- Terraform: [yes/no]
- Jenkins: [yes/no]

---

Is this information correct? Please let me know if anything needs to be corrected.
```

---

### Phase 5: Ask Clarifying Questions

For any information not auto-detected:

#### Development Workflow
```
How do you typically start the development server?
Example: `npm run dev`, `go run main.go`, `python app.py`
```

#### Testing Workflow
```
How do you run tests in this project?
- Unit tests command?
- Integration tests command?
- Coverage command?
```

#### Linting Workflow
```
How do you run the linter?
- Lint command?
- Lint fix/format command?
```

#### Prerequisites
```
Are there any prerequisites or setup steps needed?
Examples:
- Environment variables (.env file)
- Database to set up
- Docker containers to start
- External services required
```

---

### Phase 6: Generate Output

Once confirmed, create `@.shipmate/project/project-info.md`:

```markdown
# Project Information

> Generated by `/shipmate-learn` on {YYYY-MM-DD HH:mm}
> This file is used by Shipmate commands to understand your project setup.

---

## Project Overview

| Property | Value |
|----------|-------|
| Name | {project name} |
| Primary Language | {Go/Java/TypeScript/Python} |
| Category | {frontend/backend/full-stack/library} |
| Framework | {Angular/Flask/FastAPI/Spring/etc.} |

---

## Team Configuration

| Property | Value |
|----------|-------|
| User Types | {comma-separated list} |

Selected role-specific content:
- {User Type 1}: Enabled
- {User Type 2}: Enabled

---

## Package Manager

| Property | Value |
|----------|-------|
| Tool | {npm/pnpm/pip/poetry/go mod/maven} |
| Lockfile | {lockfile name} |
| Install Command | `{install command}` |

---

## Scripts & Commands

### Development
| Action | Command |
|--------|---------|
| Start Dev Server | `{command}` |
| Build | `{command}` |

### Testing
| Action | Command |
|--------|---------|
| Run Tests | `{command}` |
| Run Tests (Watch) | `{command}` |
| Coverage | `{command}` |

### Quality
| Action | Command |
|--------|---------|
| Lint | `{command}` |
| Lint (Fix) | `{command}` |
| Type Check | `{command}` |

---

## Tech Stack

### Core
- **Language:** {TypeScript/Go/Java/Python}
- **Framework:** {framework name}
- **Build Tool:** {build tool}

### Testing
- **Unit Testing:** {jest/vitest/pytest/go test/junit}
- **Integration Testing:** {framework if different}

### Code Quality
- **Linter:** {eslint/golangci-lint/pylint/etc.}
- **Formatter:** {prettier/gofmt/black/etc.}

---

## Infrastructure

| Component | Status |
|-----------|--------|
| Docker | {yes/no} |
| Terraform | {yes/no} |
| Jenkins | {yes/no} |

---

## Prerequisites & Setup

{User-provided prerequisites information}

---

## Special Notes

{User-provided special notes and context}

---

## Quick Reference

```bash
# Install dependencies
{install command}

# Start development
{dev command}

# Run tests
{test command}

# Run linter
{lint command}

# Build for production
{build command}
```
```

---

### Phase 7: GitHub Copilot Integration (Optional)

If Copilot integration is enabled in `.shipmate/config.yml` (`tools.copilot.enabled: true`), generate Copilot instruction files.

#### 7.1 Check Copilot Configuration

```bash
# Check if Copilot is enabled
cat .shipmate/config.yml | grep -A5 "copilot:"
```

If `enabled: false` or not configured, skip this phase and proceed to Phase 8.

#### 7.2 Create GitHub Copilot Instructions Directory

```bash
# Ensure .github directory exists
mkdir -p .github/instructions
mkdir -p .github/prompts
```

#### 7.3 Generate Global Copilot Instructions

Create `.github/copilot-instructions.md` with a distilled summary of project standards:

```markdown
# Copilot Instructions for {Project Name}

> Auto-generated by /shipmate-learn on {YYYY-MM-DD HH:mm}
> Based on project analysis and Shipmate standards

---

## Project Context

**Type:** {Service type from architecture.md}
**Primary Language:** {Language}
**Framework:** {Detected frameworks}

---

## Coding Standards

### Naming Conventions
{Summary from style-guide.md - naming section}

### Import Organization
{Summary from style-guide.md - imports section}

### Error Handling
{Summary from style-guide.md - error handling patterns}

---

## Testing Requirements

- Unit tests required for all business logic
- Test file naming: `{pattern from style-guide.md}`
- Testing framework: {Detected testing framework}
- Run tests with: `{test command from project-info.md}`

---

## Domain Knowledge

### Key Entities
{Summary of key entities from domain.md}

### Business Rules
{Summary of key rules from domain.md}

---

## PR Guidelines

{Summary from pull-requests.md}
- Title format: `{PR title format}`
- Required sections: {Required sections}

---

## Quick Reference

- Build: `{build command}`
- Test: `{test command}`
- Lint: `{lint command}`
- Dev: `{dev command}`

---

**Note:** For detailed standards, see `.shipmate/project/` files.
```

#### 7.4 Generate Conditional Instructions (Framework-Specific)

Based on detected frameworks, create conditional instruction files:

**For Frontend Projects (React, Vue, Angular detected):**

Create `.github/instructions/shipmate-frontend.instructions.md`:

```markdown
# Frontend Development Instructions

> Auto-generated by /shipmate-learn
> Applies to: **/*.tsx, **/*.jsx, **/*.vue, **/components/**

---

## Component Patterns

{Component structure from style-guide.md}

## State Management

{State management pattern if detected}

## Accessibility

- All interactive elements must be keyboard accessible
- Use semantic HTML elements
- Include ARIA labels where appropriate
- Test with screen reader

## Performance

- Lazy load non-critical components
- Memoize expensive computations
- Use virtual scrolling for large lists
```

**For Backend Projects (Express, NestJS, FastAPI detected):**

Create `.github/instructions/shipmate-backend.instructions.md`:

```markdown
# Backend Development Instructions

> Auto-generated by /shipmate-learn
> Applies to: **/controllers/**, **/services/**, **/api/**

---

## API Patterns

{API patterns from architecture.md}

## Error Handling

{Error handling pattern from style-guide.md}

## Database Access

{Database patterns if detected}

## Security

- Validate all input data
- Use parameterized queries
- Never expose sensitive data in responses
- Log security events
```

**For Testing (Jest, Vitest, Playwright detected):**

Create `.github/instructions/shipmate-testing.instructions.md`:

```markdown
# Testing Instructions

> Auto-generated by /shipmate-learn
> Applies to: **/*.test.ts, **/*.spec.ts, **/__tests__/**

---

## Test Structure

{Test structure from style-guide.md}

## Mocking Patterns

{Mocking pattern from style-guide.md}

## Coverage Requirements

- Minimum coverage: 80% for new code
- All critical paths must be tested
- Include edge cases and error scenarios
```

#### 7.5 Generate Reusable Prompts

Create prompt files in `.github/prompts/` for common tasks:

**`.github/prompts/shipmate-implement.prompt.md`:**
```markdown
Implement a new feature following project standards.

Reference these files for context:
- @.shipmate/project/architecture.md - Tech stack and patterns
- @.shipmate/project/style-guide.md - Coding conventions
- @.shipmate/project/domain.md - Domain terminology

Follow the established patterns from the codebase.
Run tests after implementation: `{test command}`
Run linter before committing: `{lint command}`
```

**`.github/prompts/shipmate-review.prompt.md`:**
```markdown
Review this code for:
1. Adherence to style guide (@.shipmate/project/style-guide.md)
2. Security best practices
3. Test coverage
4. Performance considerations

Check against PR conventions in @.shipmate/project/pull-requests.md
```

#### 7.6 Validate Copilot Files

After generating, verify the files:

```bash
# List generated Copilot files
ls -la .github/copilot-instructions.md
ls -la .github/instructions/
ls -la .github/prompts/
```

---

### Phase 8: Confirm Completion

After saving, display confirmation:

```
Project learning complete!

Created:
- @.shipmate/project/mission.md (service purpose)
- @.shipmate/project/architecture.md (tech stack & patterns)
- @.shipmate/project/domain.md (domain concepts)
- @.shipmate/project/project-info.md (project setup)
- @.shipmate/project/style-guide.md (coding patterns & conventions) ⭐ NEW
- @.shipmate/project/tech-debt.md (TODOs, gaps & quality issues) ⭐ NEW
- @.shipmate/project/external-references.md (discovered Jira/Confluence context) [if references found]
- @.shipmate/project/pull-requests.md (PR conventions)

Copilot Integration: [if enabled]
- @.github/copilot-instructions.md (global Copilot instructions) ⭐
- @.github/instructions/ (conditional framework instructions) ⭐
- @.github/prompts/ (reusable Copilot prompts) ⭐

Updated:
- @.shipmate/config.yml (user types: {selected types})

External Context Gathered:
- Jira tickets: {N} discovered, {M} crawled
- Confluence pages: {N} discovered, {M} crawled
- Key insights incorporated into vision files

Style Guide Highlights:
- Naming conventions: {detected patterns}
- Import organization: {detected pattern}
- Code templates: {count} ready-to-use templates
- Key utilities to reuse: {count} found

Tech Debt Summary:
- Total TODOs: {count}
- FIXMEs (Critical): {count} ⚠️
- Type safety issues: {count}
- Missing tests: {count} files
- Overall health score: {X}/100

This information will be used by:
- /shipmate-plan - To understand project context and business requirements
- /shipmate-implement - To use correct commands, follow patterns, AND match code style
- /shipmate-verify - To run proper quality checks
- /shipmate-ship - To create PRs following team conventions
- /shipmate-review-pr - To check code against style guide
- GitHub Copilot - Context-aware code suggestions [if enabled] ⭐

Role-specific content enabled for:
- {User Type 1}
- {User Type 2}

PR Conventions documented:
- Title format: {pattern}
- Required sections: {count} sections
- Source: {template | inferred from N PRs}

Next steps:
1. Review style-guide.md to understand coding conventions ⭐
2. Review tech-debt.md to see existing issues and gaps ⭐
3. Check external-references.md for links to original Jira/Confluence sources
4. Run /shipmate-plan to start planning your first feature
5. [If Copilot enabled] Copilot will now use your project context for suggestions ⭐

💡 Tip: Share style-guide.md with new team members to help them onboard faster!
💡 Tip: Create Jira tickets for undocumented TODOs using the commands in tech-debt.md
💡 Tip: Copilot instructions are auto-synced from your project analysis!
```

---

## Quality Checklist

Before completing, verify:
- [ ] Vision files created (mission.md, architecture.md, domain.md)
- [ ] External references scanned (Jira tickets, Confluence URLs)
- [ ] Discovered Jira tickets crawled for context (or access issues documented)
- [ ] Discovered Confluence pages crawled for context (or access issues documented)
- [ ] External context incorporated into vision files
- [ ] external-references.md created (if references found)
- [ ] User types selected and stored in project config
- [ ] PR conventions documented (pull-requests.md created)
- [ ] PR title format identified and validated with user
- [ ] PR description sections identified (required vs optional)
- [ ] Low-confidence findings clarified with user
- [ ] Primary language/framework correctly identified
- [ ] Package manager correctly identified
- [ ] Test command is accurate
- [ ] Lint command is accurate
- [ ] Build command is accurate
- [ ] Dev server command is accurate
- [ ] All user corrections incorporated
- [ ] Output files are well-formatted and complete
- [ ] Copilot config checked (if enabled, proceed with Copilot integration)
- [ ] .github/copilot-instructions.md created (if Copilot enabled)
- [ ] Conditional instructions created for detected frameworks (if Copilot enabled)
- [ ] Reusable prompts created in .github/prompts/ (if Copilot enabled)

---

## Persona

This command activates multiple personas across phases:

**Phase 1: Vision Builder** (from `@core/agents/vision-builder.md`)
- Analytical: Focus on extracting facts from codebase
- Thorough: Don't skip important patterns or entities
- Validation-seeking: Confirm findings with user

**Phase 1.3: External Reference Hunter**
- Investigative: Scans all file types for Jira/Confluence references
- Resourceful: Uses Jira CLI and Confluence CLI to fetch external context
- Synthesizing: Extracts key insights from external sources
- Prioritizing: Focuses on high-relevance references (README, architecture docs)
- Graceful: Handles access issues and offers alternatives

**Phase 1.5: Configuration Guide**
- Helpful: Explain the purpose of each user type
- Patient: Allow user to review and customize selections
- Clear: Present options in an understandable format

**Phase 2: PR Convention Analyzer**
- Pattern-recognition: Identifies recurring patterns in PR titles and descriptions
- Evidence-based: Calculates confidence levels based on data analysis
- Inquisitive: Asks clarifying questions when confidence is low
- Adaptive: Adjusts findings based on user feedback
- Thorough: Checks multiple sources (templates, merged PRs, repo settings)

**Phase 3: Project Learner**
- Curious: Thoroughly investigates project configuration
- Confirming: Always verifies findings with user
- Patient: Asks clear questions and waits for answers
- Organized: Presents information in structured, readable format

---

## Troubleshooting

### No package.json or equivalent found
- Ask what type of project this is
- Manually gather technology stack information
- Adapt questions accordingly

### Multiple languages detected
- Present all detected languages
- Ask user to identify the primary language
- Note others as secondary/supporting

### Missing test/lint commands
- Ask if tests/linting are set up
- If yes, ask for the commands
- If no, note as "Not configured"

### Monorepo detected
If monorepo structure is detected:
- Note the monorepo tool (nx, lerna, pnpm workspaces)
- Ask which package/app this command is for
- Focus analysis on that specific package

### No global user config found
- Proceed with user type selection without pre-selected defaults
- After selection, offer to save as global defaults for future projects

### No PR template found and few merged PRs
If no `.github/pull_request_template.md` exists and the repo has fewer than 5 merged PRs:
- Ask the user to describe their preferred PR format
- Offer common templates as starting points:
  - Simple: Summary, Changes, Testing
  - Standard: Summary, Changes, Testing, Screenshots, Checklist
  - Detailed: Full sections with deployment notes, risk assessment
- Generate initial template based on user selection

### GitHub CLI not authenticated
If `gh` CLI is not available or not authenticated:
```
I couldn't access GitHub to analyze your PRs.

To enable PR convention detection:
1. Install GitHub CLI: https://cli.github.com/
2. Authenticate: gh auth login
3. Re-run /shipmate-learn

Alternatively, you can:
[ ] Skip PR analysis and provide conventions manually
[ ] Use a standard PR template (I'll suggest options)
```

### Inconsistent PR patterns detected
If merged PRs show highly inconsistent patterns (confidence <30%):
- Present the variation to the user
- Ask if the team has recently changed conventions
- Offer to establish new conventions going forward
- Document both legacy and new patterns if applicable

### Private repository access issues
If GitHub API returns access errors:
- Check if the repo requires SSO authentication
- Verify `gh` has appropriate scopes (`repo`, `read:org`)
- Suggest running `gh auth refresh -s repo,read:org`

### Jira or Confluence authentication expired
If CLI commands return authentication errors:
- Guide user to re-authenticate: `jira init` or `confluence auth`
- Offer to wait while user re-authenticates
- Continue with other phases if user chooses to skip
- Note: CLIs are installed via `shipmate install` - run `shipmate doctor` if commands not found

### Too many external references found
If scanning discovers >50 Jira tickets or >20 Confluence pages:
- Prioritize by frequency (most referenced first)
- Prioritize by location (README > source > config)
- Ask user to confirm which references are most relevant
- Crawl top 10-20 most relevant references
- Document remaining references without crawling

### External reference crawling timeout
If Jira/Confluence API calls are slow or timing out:
- Reduce batch size for crawling
- Crawl only high-priority references
- Cache results to avoid re-crawling
- Offer to skip and add context manually

### Jira ticket not found or access denied
If specific tickets return 404 or 403:
- Note which tickets couldn't be accessed
- Continue with accessible tickets
- Ask user if tickets are in a different Jira project
- Document inaccessible tickets for manual review

### Confluence page not found
If Confluence URLs return errors:
- Check if page ID has changed (pages can be moved)
- Try searching by page title instead
- Note inaccessible pages for manual review
- Continue with accessible pages

---

## SailPoint Technology Reference

This command is optimized for SailPoint's technology stack:

**Frontend:**
- Node.js (runtime)
- TypeScript (language)
- Angular (framework)

**Backend:**
- Go (primary backend language)
- Java (enterprise services)
- Python (Flask, SQLAlchemy, PySpark, FastAPI)

**Infrastructure:**
- Docker (containerization)
- Terraform (infrastructure as code)
- Jenkins/CloudBees (CI/CD)
