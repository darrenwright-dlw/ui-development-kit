---
version: 1.0
context:
  - @README.md
  - @.shipmate/project/pull-requests.md
  - @.shipmate/agents/**/*
---
# Review Pull Request

**Command:** `/shipmate-review-pr` (Cursor) or `@.shipmate/commands/review-pr.md` (other tools)

**Purpose:** Comprehensive, evidence-based pull request review combining code quality validation, architectural analysis, and systematic investigation.

**Agent:** Code Reviewer - Code Review & Production Readiness Specialist (`@.shipmate/agents/code-reviewer.md`)

---

## Usage

```bash
# Review by PR URL
/shipmate-review-pr https://github.com/sailpoint/saas-ui-monorepo/pull/1234

# Review by PR number (auto-detects current repo)
/shipmate-review-pr 1234

# Review with options
/shipmate-review-pr 1234 --post-comment    # Post review as GitHub comment
/shipmate-review-pr 1234 --output          # Output for user review (default)
/shipmate-review-pr 1234 --focus security  # Focus on security aspects
/shipmate-review-pr 1234 --focus performance  # Focus on performance aspects
```

---

## Input Parsing

### Extract PR Information

**If full URL provided:**

```bash
# Parse: https://github.com/{owner}/{repo}/pull/{number}
# Example: https://github.com/sailpoint/saas-ui-monorepo/pull/1234
# → owner: sailpoint, repo: saas-ui-monorepo, number: 1234
```

**If PR number only:**

```bash
# Detect current repository
gh repo view --json nameWithOwner -q '.nameWithOwner'

# Use detected repo with provided PR number
```

---

## Persona Activation

This command activates dual personas:

### Code Reviewer Persona (Primary)

- **Role:** Senior Code Reviewer
- **Focus:** Plan alignment, code quality assessment, architecture review
- **Traits:** Thorough, constructive, pattern-aware, standard-compliant

### Analyzer Persona (Supporting)

- **Role:** Root Cause Analyst & Evidence-Based Investigator
- **Focus:** Systematic analysis, evidence gathering, pattern recognition
- **Traits:** Evidence-based, systematic, thorough, objective

---

## Context Gathering

### 1. Fetch PR Metadata (GitHub CLI)

```bash
# Comprehensive PR details
gh pr view {PR-NUMBER} --json \
  title,body,labels,reviewRequests,state,mergeable,headRefName,baseRefName,\
  author,createdAt,additions,deletions,changedFiles,commits,comments,\
  reviews,isDraft,mergeStateStatus,statusCheckRollup

# Get list of changed files
gh pr diff {PR-NUMBER} --name-only

# Get full diff for analysis
gh pr diff {PR-NUMBER}

# Check CI/CD status
gh pr checks {PR-NUMBER}
```

### 2. Extract JIRA Ticket (from branch or title)

```bash
# Parse JIRA key from branch name: {firstNameInitial}{lastname}/{JIRA-KEY}
# Or from PR title: {JIRA-KEY}: [SEMVER] Description

# Fetch JIRA ticket details
jira issue view {JIRA-KEY} --json

# Check for related subtasks (MV, etc.)
jira issue list --jql "parent={JIRA-KEY}" --json

# Get ticket type, status, and custom fields
# - Deploy Risk (customfield_17328)
# - Release Notes Required (customfield_17681)
```

### 3. Intelligent Context Enrichment

**CRITICAL:** Before reviewing, gather comprehensive context from multiple sources to understand the full picture.

#### 3.1 Fetch Linked Confluence Pages

```bash
# Check Jira ticket for linked Confluence pages (PRDs, Design Docs, Tech Specs)
# Parse links from description field - look for patterns:
# - sailpoint.atlassian.net/wiki/...
# - PRD: [title](url)
# - Design: [title](url)
# - Tech Spec: [title](url)

# For each linked Confluence page:
confluence read {PAGE-ID} --output markdown

# Also search for related pages by JIRA key
confluence search --query "{JIRA-KEY}" --limit 5

# Common linked doc types to look for:
# - Product Requirements Document (PRD)
# - Technical Design Document
# - API Contract Specifications
# - UI/UX Mockups or Figma Links
# - Architecture Decision Records (ADRs)
```

**Store enrichment context:**

```markdown
## Context Sources

- PRD: [{title}]({url}) - Last updated: {date}
- Design Doc: [{title}]({url}) - Last updated: {date}
- Tech Spec: [{title}]({url}) - Last updated: {date}
```

#### 3.2 Fetch Epic Context

```bash
# Check if ticket belongs to an Epic
jira issue view {JIRA-KEY} --json | jq '.fields.parent'

# If Epic exists, fetch Epic details for broader context
jira issue view {EPIC-KEY} --json

# Get all tickets in the Epic to understand scope
jira issue list --jql "parent={EPIC-KEY} OR 'Epic Link'={EPIC-KEY}" --json
```

**Why Epic context matters for PR review:**

- Understand if this PR is part of a larger feature
- Check if there are dependent PRs that should be reviewed together
- Verify the PR scope aligns with Epic goals
- Identify potential integration points with sibling tickets

#### 3.3 Auto-Detect Related PRs

```bash
# Find other open PRs from the same Epic
EPIC_KEY=$(jira issue view {JIRA-KEY} --json | jq -r '.fields.parent.key // .fields.customfield_10100')

if [ -n "$EPIC_KEY" ]; then
  # Get all ticket keys from the Epic
  SIBLING_KEYS=$(jira issue list --jql "parent=$EPIC_KEY" --json | jq -r '.[].key')

  # Search for PRs with those ticket keys
  for KEY in $SIBLING_KEYS; do
    gh pr list --search "$KEY in:title" --json number,title,state
  done
fi

# Also check for PRs by the same author in the same timeframe
gh pr list --author {PR_AUTHOR} --state open --json number,title,headRefName

# Check for PRs touching the same files
CHANGED_FILES=$(gh pr diff {PR-NUMBER} --name-only)
for file in $CHANGED_FILES; do
  gh pr list --search "path:$file" --state open --json number,title
done
```

**If related PRs found:**

```markdown
## Related PRs Detected

**From same Epic ({EPIC-KEY}):**

- PR #{number}: {title} - {state}
- PR #{number}: {title} - {state}

**Touching same files:**

- PR #{number}: {title} - potential merge conflict

**Recommendation:** Consider reviewing these PRs together to ensure consistency.
```

#### 3.4 Traverse Linked Issues

```bash
# Get all linked issues (blocks, is blocked by, relates to, etc.)
jira issue view {JIRA-KEY} --json | jq '.fields.issuelinks'

# For each linked issue, get key details
# Types: "blocks", "is blocked by", "relates to", "duplicates"

# Check if any blocking issues are still open
jira issue list --jql "issue in linkedIssues({JIRA-KEY}) AND status != Done" --json
```

**If blocking issues found:**

```markdown
## Dependency Alert

**Blocking Issues (still open):**

- {LINKED-KEY}: {summary} - Status: {status}
    - Impact: This PR may be blocked until {LINKED-KEY} is resolved

**Related Issues:**

- {LINKED-KEY}: {summary} - Type: {linkType}
```

### 4. Feature Flag Analysis (LaunchDarkly CLI - if applicable)

**Detect feature flag involvement:**

```bash
# Search for feature flag patterns in the diff
gh pr diff {PR-NUMBER} | grep -iE "featureFlag|feature_flag|FEATURE_FLAG|isFeatureEnabled|ldclient|launchdarkly"

# Search for flag key patterns (SCREAMING_SNAKE_CASE with common prefixes)
gh pr diff {PR-NUMBER} | grep -E "(UI_|GOV_|CONN_|CAM_|ARM_)[A-Z_]+"
```

**If feature flags detected, gather flag details:**

```bash
# Get flag details from LaunchDarkly
ldcli flags get --project idn --flag {FLAG_KEY} --output json

# Check flag status across environments
ldcli flags get --project idn --flag {FLAG_KEY} --env test --output json
ldcli flags get --project idn --flag {FLAG_KEY} --env production --output json

# Check flag targeting rules
ldcli flags get --project idn --flag {FLAG_KEY} --output json | jq '.environments.production.rules'

# Check for prerequisite flags
ldcli flags get --project idn --flag {FLAG_KEY} --output json | jq '.prerequisites'
```

**Flag cleanup detection (removing flag code):**

```bash
# If PR removes feature flag references, verify flag is globally enabled
ldcli flags get --project idn --flag {FLAG_KEY} --output json | jq '.defaults'

# Verify no blocking rules exist (orgs_false)
ldcli flags get --project idn --flag {FLAG_KEY} --env production --output json | jq '.on, .fallthrough'
```

---

## Review Methodology

### Phase 1: Evidence Gathering

**Collect all available data before forming conclusions:**

1. **PR Metadata Analysis**
    - Title format and semantic versioning
    - Description completeness
    - Labels, reviewers, milestone
    - Branch naming conventions
    - CI/CD status

2. **Code Change Analysis**
    - Files modified (scope and impact)
    - Lines added/removed (change magnitude)
    - Commits (logical organization)
    - Dependencies modified

3. **Context Correlation**
    - JIRA ticket status and requirements
    - Related PRs or dependencies
    - Test coverage changes
    - Documentation updates

### Phase 2: Systematic Investigation

**Follow structured analysis for each domain:**

#### 2.1 Plan Alignment Analysis

Compare implementation against requirements:

- Does the PR accomplish what the JIRA ticket describes?
- Are there deviations from the planned approach?
- Are deviations justified improvements or problematic departures?
- Are all planned functionality items implemented?

#### 2.2 Code Quality Assessment

Review code for:

- Adherence to established patterns and conventions
- Proper error handling and type safety
- Code organization and naming conventions
- Maintainability and readability
- Test coverage and quality
- SOLID principles compliance

#### 2.3 Architecture and Design Review

Evaluate:

- Separation of concerns
- Loose coupling, high cohesion
- Integration with existing systems
- Scalability and extensibility
- Design pattern usage

#### 2.4 Security Validation

Check for:

- Hardcoded secrets, API keys, tokens
- XSS vulnerabilities (input sanitization)
- SQL injection risks
- Authentication/authorization issues
- Insecure data handling
- Dangerous functions (eval, innerHTML)

#### 2.5 Performance Assessment

Analyze:

- New dependencies and bundle impact
- Algorithm efficiency (O(n) analysis)
- Memory leaks potential
- Database query optimization
- Caching opportunities

#### 2.6 Accessibility Compliance (WCAG 2.1 AA)

Verify:

- Color contrast ratios (4.5:1)
- ARIA labels and semantic HTML
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators

#### 2.7 Feature Flag Validation (if applicable)

**Adding New Feature Flags:**

- Flag key follows naming convention (SCREAMING_SNAKE_CASE with prefix)
- Required tags present (team-\*, expiration_month-YYYYMM)
- Flag is properly initialized in code
- Fallback behavior handles flag being OFF
- Flag is documented in PR description

**Modifying Feature Flag Usage:**

- Changes are consistent with flag's current rollout status
- No hardcoded flag values (should use LD client)
- Flag evaluation context is correct (org, pod, user)
- Error handling for flag evaluation failures

**Removing Feature Flag Code (Cleanup):**

- Verify flag is globally enabled in production (`default: true`)
- No `orgs_false` blocklist entries exist
- Flag is ON in all environments (test, production)
- No dependent flags using this as prerequisite
- Expiration tag indicates it's ready for cleanup
- All conditional code paths are removed (not just one branch)
- Tests updated to remove flag-based conditionals

**Flag Rollout Validation:**

- Staged rollout follows correct order (internal → staging → prod)
- Master flag pattern used for coordinated multi-flag rollouts
- Percentage rollouts not used on multiple related flags

### Phase 3: Requirements Completeness Assessment

**CRITICAL:** Before detailed code review, assess how well the PR addresses the Jira ticket requirements.

#### 3.1 Requirements Mapping Matrix

Compare PR changes against Jira acceptance criteria:

| Acceptance Criteria | PR Evidence                | Status   |
| ------------------- | -------------------------- | -------- |
| AC-1: {criteria}    | {file:line or "not found"} | ✅/⚠️/❌ |
| AC-2: {criteria}    | {file:line or "not found"} | ✅/⚠️/❌ |
| AC-3: {criteria}    | {file:line or "not found"} | ✅/⚠️/❌ |

**Status Legend:**

- ✅ Fully implemented with evidence
- ⚠️ Partially implemented or unclear
- ❌ Not implemented or missing

#### 3.2 Requirements Completeness Score

Calculate a weighted score based on requirements coverage:

| Criterion                      | Weight | Score (0-2)                      | Notes                        |
| ------------------------------ | ------ | -------------------------------- | ---------------------------- |
| Acceptance criteria addressed  | 30%    | 0=none, 1=partial, 2=all         | Count AC items with evidence |
| Design doc alignment           | 20%    | 0=deviates, 1=partial, 2=matches | Compare to Confluence design |
| Test coverage for requirements | 20%    | 0=none, 1=some, 2=comprehensive  | Tests map to AC items        |
| Edge cases handled             | 15%    | 0=none, 1=some, 2=all            | Error states, boundaries     |
| Documentation updated          | 15%    | 0=none, 1=code only, 2=docs too  | README, API docs, comments   |

**Total Score:** {X}% = (Σ weight × score) / (Σ weight × 2) × 100

**Interpretation:**

- 90-100%: Excellent - ready for detailed review
- 70-89%: Good - minor gaps to address
- 50-69%: Needs work - significant gaps
- <50%: Incomplete - major requirements missing

#### 3.3 Gap Analysis

**If score < 90%, identify specific gaps:**

```markdown
## Requirements Gaps Identified

**Missing Implementation:**

1. AC-{n}: {criteria}
    - Expected: {what should be implemented}
    - Found: {what was found or "not found"}
    - Recommendation: {specific action}

**Partial Implementation:**

1. AC-{n}: {criteria}
    - Expected: {full requirement}
    - Found: {partial implementation}
    - Gap: {what's missing}

**Design Deviations:**

1. {deviation description}
    - Design Doc: {what design says}
    - Implementation: {what PR does}
    - Impact: {potential issues}
```

### Phase 4: Hypothesis Formation and Testing

For each potential issue identified:

1. **State the concern clearly**
2. **Gather supporting evidence** (code snippets, patterns, metrics)
3. **Consider counter-evidence** (could this be intentional?)
4. **Form testable hypothesis** (if X is true, then Y should happen)
5. **Validate or invalidate** through analysis
6. **Document conclusion** with confidence level

---

## Validation Checks

### Metadata Validation

```markdown
### PR Title

- [ ] Starts with JIRA ticket key
- [ ] Follows format: `{JIRA-KEY}: [SEMVER] Description` (if SemVer used)
- [ ] Description is clear and concise

### PR Description

- [ ] Summary of changes provided
- [ ] Motivation/context explained
- [ ] Testing approach documented
- [ ] Related links included
- [ ] Screenshots for UI changes (if applicable)
- [ ] Breaking changes documented (if applicable)

### PR Metadata

- [ ] Appropriate reviewers assigned
- [ ] Labels applied (feature, bugfix, etc.)
- [ ] No merge conflicts
- [ ] CI checks passing
```

### JIRA Validation

```markdown
### Ticket Status

- [ ] Ticket exists and accessible
- [ ] Status is appropriate (In Progress, In Review)
- [ ] Deploy Risk field set
- [ ] Release Notes Required field set
- [ ] MV subtask exists (for Stories)
- [ ] Acceptance criteria defined
```

### Code Quality Validation

```markdown
### Standards Compliance

- [ ] Follows naming conventions
- [ ] Error handling implemented
- [ ] Type safety maintained
- [ ] No code duplication
- [ ] Comments on complex logic
- [ ] Tests added/updated

### Framework Best Practices

- [ ] Observable lifecycle managed (Angular)
- [ ] OnPush change detection (Angular)
- [ ] No direct DOM manipulation
- [ ] Proper state management
- [ ] Localization implemented
```

### Security Validation

```markdown
### Security Checks

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Output sanitization implemented
- [ ] Authentication enforced
- [ ] Authorization checked
- [ ] No dangerous functions
```

### Feature Flag Validation (if applicable)

```markdown
### New Flag Introduction

- [ ] Flag key follows convention (PREFIX_FEATURE_NAME)
- [ ] Required tags present (team-_, expiration_month-_)
- [ ] Fallback behavior when flag is OFF
- [ ] Flag documented in PR description

### Flag Cleanup (Removing Flag Code)

- [ ] Flag globally enabled (`default: true` in LD)
- [ ] No orgs_false blocklist entries
- [ ] Flag ON in production environment
- [ ] No dependent/prerequisite flags
- [ ] All conditional branches removed
- [ ] Tests updated

### Flag Usage Changes

- [ ] No hardcoded flag values
- [ ] Correct evaluation context (org/pod/user)
- [ ] Error handling for evaluation failures
```

---

## Output Format

Generate review in this format:

```markdown
# PR Review: #{PR-NUMBER}

**Reviewed by:** Shipmate Code Reviewer
**Date:** {date}
**Methodology:** Evidence-Based Analysis with Code Review Best Practices

---

## Summary

**PR:** [{JIRA-KEY}] {Title}
**Author:** {author}
**Branch:** {head} -> {base}
**Changes:** {files} files (+{additions}, -{deletions})

### Overall Assessment

**Verdict:** APPROVE | REQUEST_CHANGES | COMMENT

**Risk Level:** Low | Medium | High

**Confidence:** {percentage}% (based on evidence quality)

---

## Evidence Summary

### Investigation Log

{Summary of evidence gathered and analysis performed}

### Key Findings

- **Critical (Blocking):** {count} issues
- **Important (Should Fix):** {count} issues
- **Suggestions (Nice to Have):** {count} items
- **Positive Observations:** {count} items

---

## Detailed Review

### Plan Alignment

{Analysis of how well implementation matches JIRA requirements}

**JIRA:** [{JIRA-KEY}](https://sailpoint.atlassian.net/browse/{JIRA-KEY})
**Status:** {ticket_status}
**Requirements Met:** {percentage}%

---

### Code Quality

{Detailed code quality assessment with specific examples}

#### What's Done Well

- {Positive observation with evidence}
- {Positive observation with evidence}

#### Issues Identified

**[SEVERITY] Issue Title**

- **File:** `path/to/file.ts:line`
- **Evidence:** {code snippet or observation}
- **Impact:** {why this matters}
- **Recommendation:** {specific fix with example}

---

### Architecture & Design

{Architectural observations and recommendations}

---

### Security

{Security analysis results}

---

### Performance

{Performance impact assessment}

---

### Tests

{Test coverage analysis}

- Unit Tests: {coverage}%
- Integration Tests: {status}
- E2E Tests: {status}

---

### Accessibility

{WCAG compliance status}

---

### Feature Flags (if applicable)

{Feature flag analysis - only include if PR involves feature flags}

**Flags Detected:**

- `{FLAG_KEY}`: {status in production} | {rollout stage}

**Validation:**

- [ ] Naming convention followed
- [ ] Required tags present
- [ ] Fallback behavior correct
- [ ] {For cleanup} Flag globally enabled

**LaunchDarkly Status:**
| Flag | Test | Production | Default |
|------|------|------------|---------|
| {FLAG_KEY} | {on/off} | {on/off} | {true/false} |

---

## Recommendations

### Must Fix Before Merge

1. {Critical issue}
2. {Critical issue}

### Should Address

1. {Important improvement}
2. {Important improvement}

### Consider for Future

1. {Nice-to-have suggestion}
2. {Nice-to-have suggestion}

---

## Questions for Author

{Any clarifying questions that would help complete the review}

---

## Final Notes

{Any additional context, acknowledgments of good work, or deployment considerations}

---

Reviewed by Shipmate
```

---

## Comment Posting

### Post as GitHub Comment

If `--post-comment` flag is used:

```bash
# Post the review as a PR comment
gh pr comment {PR-NUMBER} --body "$(cat <<'EOF'
{REVIEW_CONTENT}

---

Reviewed by Shipmate
EOF
)"
```

**Important:** When posting as comment, always append the footer:

```markdown
---

Reviewed by Shipmate
```

### Output for User Review (Default)

Display the review in the terminal/output for the user to:

- Review before posting
- Copy and paste manually
- Edit as needed

---

## Offer Jira Enrichment

**After completing the review, offer to update Jira with findings.**

### Present Options

```
Review complete! Would you like to update Jira with the review findings?

1. Add review summary as Jira comment
2. Update ticket status based on review verdict
3. Skip Jira updates

Which option? (1/2/3)
```

### Option 1: Add Review Summary to Jira

```bash
# Format review findings for Jira (wiki markup)
jira issue comment add {JIRA-KEY} $'h2. PR Review Summary\n\n*PR:* [#{PR-NUMBER}|{PR-URL}]\n*Reviewed by:* Shipmate\n*Date:* {date}\n\nh3. Verdict: {APPROVE|REQUEST_CHANGES|COMMENT}\n\n*Requirements Completeness:* {score}%\n\nh3. Key Findings\n\n*Critical Issues:* {count}\n*Important Issues:* {count}\n*Suggestions:* {count}\n\nh3. Summary\n\n{brief-summary-of-findings}\n\n{panel:title=Next Steps}\n{action-items-from-review}\n{panel}'
```

**Comment Format:**

```
h2. PR Review Summary

*PR:* [#1234|https://github.com/org/repo/pull/1234]
*Reviewed by:* Shipmate
*Date:* 2024-01-15

h3. Verdict: REQUEST_CHANGES

*Requirements Completeness:* 75%

h3. Key Findings

*Critical Issues:* 0
*Important Issues:* 2
*Suggestions:* 3

h3. Summary

Implementation is solid overall. Two important issues need addressing:
# Missing error handling for network failures
# Test coverage below threshold (65% vs 80% target)

{panel:title=Next Steps}
# Address the 2 important issues
# Update tests to meet coverage threshold
# Re-request review when ready
{panel}
```

### Option 2: Update Ticket Status

```bash
# If verdict is APPROVE and no critical/important issues:
jira issue move {JIRA-KEY} "Ready to Merge"

# If verdict is REQUEST_CHANGES:
jira issue move {JIRA-KEY} "In Progress"

# Add comment explaining status change
jira issue comment add {JIRA-KEY} "Status updated based on PR review. See PR #{PR-NUMBER} for details."
```

### Option 3: Skip

Continue without Jira updates.

---

## Cross-Reference with Context Sources

**Throughout the review, reference gathered context:**

### In Plan Alignment Section

```markdown
### Plan Alignment

**JIRA Requirements:** [{JIRA-KEY}](url)

- AC-1: ✅ Implemented at `src/feature.ts:45`
- AC-2: ⚠️ Partially implemented (missing error state)
- AC-3: ❌ Not found in PR

**Design Doc Alignment:** [{Design Doc Title}](confluence-url)

- API contract: ✅ Matches specification
- Data model: ⚠️ Added field not in design (justified?)
- Error handling: ✅ Follows design patterns

**Epic Context:** [{EPIC-KEY}](url) - {Epic Title}

- This PR is 1 of 3 in the Epic
- Related PRs: #1235 (merged), #1236 (open - same author)
- Integration concern: Check consistency with #1236
```

### In Security Section (if design doc has security requirements)

```markdown
### Security

**Design Doc Security Requirements:**

- [ ] Authentication: {requirement from design} → {implementation status}
- [ ] Authorization: {requirement from design} → {implementation status}
- [ ] Data handling: {requirement from design} → {implementation status}
```

### In Recommendations Section

```markdown
### Recommendations

**Based on context sources:**

1. **From Design Doc:** {recommendation based on design doc review}
2. **From Epic:** {recommendation based on Epic context}
3. **From Related PRs:** {recommendation based on related PR analysis}
```

---

## Issue Severity Classification

### Critical (Must Fix)

- Security vulnerabilities
- Breaking functionality
- Data integrity issues
- Accessibility blockers
- Production stability risks

### Important (Should Fix)

- Best practice violations
- Potential bugs
- Performance concerns
- Maintainability issues
- Test coverage gaps

### Suggestions (Nice to Have)

- Code style improvements
- Documentation enhancements
- Optimization opportunities
- Refactoring suggestions

---

## Special Cases

### Hotfix PRs

If PR is labeled as "hotfix" or targets a release branch:

- Focus on: security, functionality, no regressions
- May skip some non-critical checks
- Ensure deployment risk is documented
- Expedited review process

### Documentation-Only PRs

If PR only changes markdown/docs files:

- Skip code quality checks
- Verify links work
- Check for typos and grammar
- Ensure accuracy and clarity

### Dependency Updates

If PR only updates dependencies:

- Focus on: security vulnerabilities, breaking changes
- Check changelog for major updates
- Verify tests still pass
- Check bundle size impact

### Draft PRs

If PR is marked as draft:

- Provide early feedback
- Focus on architectural direction
- Note that detailed review will follow when ready
- Highlight potential concerns early

---

## Tool Integration

### GitHub CLI Commands

```bash
# View PR details
gh pr view {NUMBER} --json {fields}

# Get diff
gh pr diff {NUMBER}

# Check CI status
gh pr checks {NUMBER}

# Post comment
gh pr comment {NUMBER} --body "{content}"

# Request changes
gh pr review {NUMBER} --request-changes --body "{content}"

# Approve
gh pr review {NUMBER} --approve --body "{content}"
```

### JIRA CLI Commands

```bash
# View ticket
jira issue view {KEY} --json

# List subtasks
jira issue list --jql "parent={KEY}"

# Add comment
jira issue comment add {KEY} --body "{content}"
```

### Confluence CLI Commands

```bash
# Search for related docs
confluence search --query "{term}"

# Read page
confluence read {PAGE-ID}
```

### LaunchDarkly CLI Commands

```bash
# Get flag details
ldcli flags get --project idn --flag {FLAG_KEY} --output json

# Check flag in specific environment
ldcli flags get --project idn --flag {FLAG_KEY} --env production --output json

# List flags by tag (find team's flags)
ldcli flags list --project idn --tag "team-{team-name}" --limit 50

# Check flag defaults (for cleanup validation)
ldcli flags get --project idn --flag {FLAG_KEY} --output json | jq '.defaults'

# Check targeting rules
ldcli flags get --project idn --flag {FLAG_KEY} --output json | jq '.environments.production.rules'

# Check prerequisites
ldcli flags get --project idn --flag {FLAG_KEY} --output json | jq '.prerequisites'

# List environments
ldcli environments list --project idn --output json
```

**SailPoint LaunchDarkly Projects:**

- `idn` - IdentityNow (primary for UI)
- `cam` - Cloud Access Management
- `arm` - Access Risk Management
- `sir` - Identity Risk

**IDN Environments:**

- `test` - Internal testing
- `production` - Live customers (critical, requires approval)
- `test-public` - Public testing
- `prod-public` - Public production

---

## Quality Standards Reference

### Code Coverage Thresholds

- Backend: ≥80%
- Frontend: ≥70%

### Performance Budgets

- API response: <200ms (p95)
- Database queries: <50ms (p95)
- Bundle size increase: <10KB (justified)

### Security Requirements

- 0 critical vulnerabilities
- Input validation: 100%
- Authentication on sensitive endpoints: 100%

### Accessibility Requirements

- WCAG 2.1 Level AA compliance
- Color contrast: 4.5:1 minimum
- Keyboard navigation: Full support

---

## Interaction Guidelines

### Be Constructive

- Acknowledge what's done well before highlighting issues
- Provide specific, actionable feedback
- Include code examples for suggestions
- Reference documentation when relevant

### Be Evidence-Based

- Support all claims with verifiable evidence
- Quote specific code lines
- Reference test results or metrics
- Distinguish between facts and opinions

### Be Respectful

- Focus on the code, not the author
- Use inclusive language
- Assume good intent
- Offer to discuss complex issues

### Be Thorough

- Review all changed files
- Consider edge cases
- Check for consistency
- Verify testing completeness

---

## Completion Checklist

Before finalizing the review:

- [ ] All changed files reviewed
- [ ] PR metadata validated
- [ ] JIRA ticket checked
- [ ] Code quality assessed
- [ ] Security analysis completed
- [ ] Performance impact evaluated
- [ ] Tests verified
- [ ] Accessibility checked
- [ ] Severity levels assigned
- [ ] Recommendations documented
- [ ] Evidence provided for all issues

---

## Example Interaction

```
User: /shipmate-review-pr 1234

Shipmate:
Loading PR #1234 from current repository...

Gathering context:
- Fetching PR metadata from GitHub
- Extracting JIRA ticket: IDNUI-5678
- Fetching ticket details from JIRA
- Analyzing 12 changed files (+245, -67 lines)
- Running security pattern analysis
- Checking CI/CD status

Evidence Collection:
- PR title follows format
- Description includes summary, motivation, testing
- 2 reviewers assigned
- CI checks: 8/8 passing
- JIRA status: In Review
- Test coverage: 87% (target: 80%)

Analysis Findings:
- Identified 1 potential security concern (input sanitization)
- Found 2 code quality improvements (error handling)
- Noted 3 positive patterns (good separation of concerns)

Generating review...

[Full review output or posted as comment]
```
