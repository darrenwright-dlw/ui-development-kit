# Clean Up Feature Flag

**Command:** `/shipmate-feature-flag-cleanup` (Cursor) or `@.shipmate/commands/feature-flag-cleanup.md` (other tools)

**Purpose:** Execute feature flag cleanup across local and external repositories with Jira tracking, cross-repo implementation plans, and behavioral preservation. Run `/shipmate-feature-flag-audit` first to generate the discovery report, or provide a flag name to run inline discovery.

**Agent:** Implementer - Code Implementation Specialist (`@.shipmate/agents/implementer.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Recommended Model

**Claude Opus 4.6** (claude-opus-4-6) is the recommended model for this command.

---

## Overview

Execution workflow for feature flag cleanup. Expects either:
- A completed audit report from `/shipmate-feature-flag-audit`, OR
- A flag name (will run discovery inline before proceeding)

1. **Step 1: Verify Audit** - Confirm audit exists or run discovery
2. **Step 2: LaunchDarkly Verification** (CHECKPOINT) - Confirm flag is globally enabled
3. **Step 3: Jira Setup** - Create/confirm tracking tickets
4. **Step 4: Cross-Repo Plans** - Generate implementation plans for external repos
5. **Step 5: Branch Setup** (CHECKPOINT) - Create dedicated cleanup branch
6. **Step 6: Execute Local Cleanup** - Apply transformations
7. **Step 7: Post-Cleanup Validation** (CHECKPOINT) - Verify completeness
8. **Step 8: Flag Lifecycle Follow-Up** - Create archival task and defer LD archive per policy

---

## Global Operating Rules

- **Preserve behavior:** cleanup must be a behavioral no-op, keeping the flag-ON path.
- **Storybook cleanup must happen before Cypress cleanup.**
- **Jira ticket confirmation is mandatory before edits.**
- **Never edit files on `main`, `master`, `develop`, or `release/*` branches.**
- **Show before/after diff for each changed file.**
- **If external repo usages exist**, cleanup is not complete until cross-team coordination is acknowledged.
- **LaunchDarkly environments:** Only use `test` and `production`. Exclude `test-public` and `prod-public`.
- **Current scope:** This command currently targets UI cleanup patterns. Backend patterns are a planned expansion, not current default behavior.

---

## Before You Start

### Load Context

```
Read .shipmate/project/architecture.md (if exists)
```

### Tool Requirements

- `ldcli` for LaunchDarkly verification (see `@tools/launchdarkly-cli.mdc`)
- `gh` CLI for cross-repo search and flag repo PRs
- Jira CLI or workflow for ticket creation (see `@workflows/capture-jira.md`)

---

## Step 1: Verify Audit

Check if the user has provided an audit report (from `/shipmate-feature-flag-audit`) or a flag name.

**If audit report is available:** Parse it and confirm scope with user.

**If only a flag name is provided:** Run the full discovery process from `@standards/global/feature-flag-cleanup.md` (all discovery categories + cross-repo search). Present the impact summary and get confirmation before proceeding.

---

## Step 2: LaunchDarkly Verification (CHECKPOINT - STOP)

Verify the flag is safe to clean up. Use `ldcli` (see `@tools/launchdarkly-cli.mdc`).

### 2.1: Determine LD Project

| Prefix Pattern | LD Project |
|----------------|------------|
| `UI_`, `GOV_`, `CONN_`, `PLTUI`, `UIGOV`, `ISCANT` | `idn` |
| `CAM_` | `cam` |
| `ARM_` | `arm` |
| `SIR_` | `sir` |
| `NERM_` | `nerm-classic` |

### 2.2: Readiness Criteria

Evaluate ALL of the following. Environments: `test` and `production` only. Exclude `test-public` and `prod-public`.

```bash
# Get full flag data
ldcli flags get --project {project} --flag {FLAG_NAME} --output json > /tmp/flag_data.json

# Check each criterion
cat /tmp/flag_data.json | jq '{
  targeting_on_test: .environments.test.on,
  targeting_on_prod: .environments.production.on,
  default_variation_index: .defaults.onVariation,
  default_variation_value: .variations[.defaults.onVariation].value,
  prod_rules: (.environments.production.rules | length),
  test_rules: (.environments.test.rules | length),
  scheduled_changes: (.scheduledChanges // [] | length)
}'
```

| # | Criterion | Required | Pass Condition |
|---|-----------|----------|----------------|
| 1 | Targeting ON in test and production | Required | `.environments.{env}.on == true` |
| 2 | Default value is TRUE | Required | `.variations[.defaults.onVariation].value == true` |
| 3 | No active rules in production | Required | `.environments.production.rules` is empty |
| 4 | Not a prerequisite (from 2.3) | Required | No reverse dependents in test or production |
| 5 | No scheduled changes | Required | `.scheduledChanges` is empty |
| 6 | Single variation serving | Recommended | All environments serve same variation index |
| 7 | Sufficient bake time | Recommended | Flag has been globally ON for >=14 days |

**Decision:**
- Any required criterion FAIL -> **STOP.** Flag is not ready for cleanup.
- If criterion #2 is not resolvable (null/missing), print targeting context and ask user to manually confirm.
- If only recommended criteria fail, warn but allow user to proceed.

### 2.3: Prerequisite Analysis

#### Forward prerequisites (what this flag depends on):

```bash
ldcli flags get --project {project} --flag {FLAG_NAME} --output json | jq '.prerequisites'
```

#### Reverse prerequisites (what depends on this flag) - CRITICAL:

Scan ALL flags with pagination. Do NOT use prefix/query filtering (e.g. `query:GOV_UI_`) - prefix filters can hide valid dependents with different naming prefixes.

```bash
# Paginated scan - must cover all flags in both test and production
for ENV in test production; do
  OFFSET=0
  while true; do
    RESULT=$(ldcli flags list --project {project} --env $ENV --limit 100 --offset $OFFSET --output json)
    COUNT=$(echo "$RESULT" | jq '.items | length')
    DEPS=$(echo "$RESULT" | jq -r "[.items[] | select(.prerequisites[]?.key == \"${FLAG_NAME}\") | .key] | .[]")
    [ -n "$DEPS" ] && echo "[$ENV] Reverse dependents: $DEPS"
    [ "$COUNT" -lt 100 ] && break
    OFFSET=$((OFFSET + 100))
  done
done
```

**Decision:** "Not a prerequisite" = PASS only if reverse dependents are empty in BOTH test and production. If any exist -> **STOP.** Those flags must be cleaned up first or have the prerequisite removed.

### 2.4: Check FEATS Auto-Segments

Check if the flag uses FEATS-managed auto-segments:

```bash
# Check for auto-segments in LD
ldcli segments list --project {project} --environment production --output json | jq '[.items[] | select(.key | startswith("{FLAG_NAME}")) | .key]'
```

If `{FLAG_NAME}_SEGMENT_TRUE` or `{FLAG_NAME}_SEGMENT_FALSE` segments exist, warn that FEATS team coordination is required.

**CHECKPOINT:** Present LD state, prerequisites, and any blockers. "Flag is [ON/OFF] in production with [N rules / no rules]. [No / N] reverse prerequisites. Ready to proceed?"

---

## Step 3: Jira Setup

### 3.1: Confirm or Create Ticket

Ask: "Do you have an existing Jira ticket for this cleanup, or should I create one?"

If creating, use `@workflows/capture-jira.md` with:
- **Type:** Task
- **Summary:** `Clean up {FLAG_NAME} feature flag`
- **Description:** Include the impact summary

### 3.2: Multi-Repo Ticket Management

**Only if active external repos were found.**

If only the local repo is affected, skip this and use the parent ticket directly.

When multiple repos are involved, ask which structure:
1. **Sub-tasks in same project**
2. **Sub-tasks with per-repo project selection**
3. **Separate linked tickets**

Ticket naming: `Clean up {FLAG_NAME} in {repo-name}`

---

## Step 4: Cross-Repo Implementation Plans

**Only if active external repos exist.**

For each active external repo:

### 4.1: Fetch File Contents

```bash
gh api repos/{org}/{repo}/contents/{file_path} --jq '.content' | base64 -d
```

### 4.2: Generate Per-Repo Plan

For each impacted file:
- File path and line number(s)
- Pattern type (from `@standards/global/feature-flag-cleanup.md`)
- Cleanup action
- Before snippet (~5-10 lines context)
- After snippet (expected post-cleanup)

### 4.3: Output

```
## Cross-Repo Plan: {org}/{repo}
**Jira:** PROJ-XXXX
**Default Branch:** main

### File: path/to/file.ts (lines X-Y)
**Pattern:** Service Call
**Action:** Remove conditional, keep ON-path

Before:
[code]

After:
[code]
```

---

## Step 5: Branch Setup (CHECKPOINT - STOP)

### 5.1: Check Current Branch

```bash
git branch --show-current
```

- On `main`/`master`/`develop`/`release/*` -> **STOP.** Create new branch.
- On unrelated feature branch -> Warn about mixing work.

### 5.2: Create Branch

```
PROJ-XXXX/ff-cleanup-{FLAG_NAME}
```

**CHECKPOINT:** "Created branch. Ready to execute cleanup?"

---

## Step 6: Execute Local Cleanup

Apply transformations from `@standards/global/feature-flag-cleanup.md` in this order:

1. **TypeScript source** - service calls, decorators, guards, enums/constants, legacy ExtJS
2. **HTML templates** - remove dead conditional wrappers, keep ON-path content
3. **MFE configuration** - `mfe.json`, generator mappings
4. **Storybook stories** (**must happen before Cypress**)
5. **Cypress tests** (depends on Storybook names/existence)
6. **Unit tests** - remove OFF-path tests, update ON-path tests
7. **Import cleanup** - remove unused imports/injections
8. **Cascade cleanup** - delete orphaned specs, update barrels, remove dead injections

**Show before/after diff for each changed file.**

---

## Step 7: Post-Cleanup Validation (CHECKPOINT - STOP)

Run the validation checklist from `@standards/global/feature-flag-cleanup.md` (all 12 items).

**Suggest running:**

```bash
grep -r "{FLAG_NAME}" --include="*.ts" --include="*.html" --include="*.json" --include="*.js" .
npm run build
npm run test
npm run lint
```

**Final report:**

```
## Code Cleanup Complete: {FLAG_NAME}

### Files Modified: N
### Files Deleted: N
### Tests Updated: N
### Stories Updated: N
### Remaining Code References: [0 / list]

### External Repos Requiring Coordination:
| Repo | Jira | Plan Generated |
|------|------|----------------|
| org/repo | PROJ-XXXX | Yes |

### Branch: PROJ-XXXX/ff-cleanup-{FLAG_NAME}
### Ready for PR: Yes/No
```

---

## Step 8: Flag Lifecycle Follow-Up (Policy-Gated)

After the code cleanup PR is merged, create follow-up tracking for archival. **Do not archive immediately.**

### 8.1: Create LD Archival Follow-Up Task

Create a Jira sub-task assigned to the engineer running cleanup:
- Title: `Archive {FLAG_NAME} in LaunchDarkly`
- Acceptance criteria:
  - Cleanup build has been in **production for at least 7 days**
  - No regressions reported
  - Flag has no active dependents

### 8.2: Archive Flag in LaunchDarkly (After 7-Day Gate)

Only after the 7-day production gate is satisfied:

```bash
# Archive the flag (removes it from active flag list)
ldcli flags update --project {project} --flag {FLAG_NAME} --data '{"archived": true}'
```

Or archive via LaunchDarkly UI if `ldcli` update isn't available.

### 8.3: FEATS Auto-Segment Cleanup (If Applicable)

If the flag had FEATS-managed auto-segments (`{FLAG_NAME}_SEGMENT_TRUE` / `{FLAG_NAME}_SEGMENT_FALSE`):
- Notify the FEATS/Denali team to remove those segments from LaunchDarkly
- Or create a Jira ticket for the FEATS team

### 8.4: Final Checklist

- [ ] Code cleanup PR merged
- [ ] LD archival follow-up sub-task created and assigned
- [ ] 7-day production gate satisfied
- [ ] Flag archived in LaunchDarkly
- [ ] FEATS auto-segments removed (if applicable)
- [ ] Cross-repo cleanup PRs created or tickets assigned
- [ ] Jira ticket(s) closed

---

## Behavioral Enforcement Rules

1. Never skip discovery categories (when running inline discovery in Step 1).
2. Never skip LaunchDarkly verification. A flag that's OFF in production cannot be cleaned up.
3. Never use prefix/query-limited reverse prerequisite scans unless explicitly approved and risk-accepted. Prefix filters can hide valid dependents with different naming prefixes.
4. Never skip reverse prerequisite scan. Dependent flags must be addressed first.
5. If external usages exist, do not mark complete without a coordination decision.
6. Keep cleanup behavior-preserving (flag-ON path survives).
7. Do not begin edits before Jira confirmation.
8. Storybook changes must precede Cypress updates.
9. Cascade analysis is mandatory - never report fewer files than literal search found.
10. Final file list must include all cascade-impacted files with `[Cascade]` evidence.
11. Archived external repos do not block cleanup completion but must be clearly distinguished from active repos.
12. When multiple repos are involved, the parent Jira ticket is tracking-only; each repo gets its own sub-task or linked ticket.
13. The user MUST be asked which Jira ticket structure they prefer when multiple repos are involved.
14. When only the local repo is affected, skip multi-repo Jira management and use the parent ticket directly.
15. Each cross-repo implementation plan must reference its specific per-repo Jira ticket, not the parent.
16. Cross-repo plans must be generated before local cleanup begins.
17. Each per-repo plan must include before/after snippets for every impacted file.
18. Plans should be self-contained - readable by a developer unfamiliar with the analysis.
19. Never edit files on `main`, `master`, `develop`, or `release/*` branches.
20. User must confirm the branch before any file modifications begin.
21. Flag lifecycle cleanup (Step 8) is part of the process - code cleanup alone is not complete.
