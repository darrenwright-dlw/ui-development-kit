# Audit Feature Flags

**Command:** `/shipmate-feature-flag-audit` (Cursor) or `@.shipmate/commands/feature-flag-audit.md` (other tools)

**Purpose:** Deep scan the entire codebase to discover, catalog, and assess ALL feature flags in use. Produces a comprehensive audit report with per-flag health scores, cleanup recommendations, and prioritized action items.

**Agent:** Analyzer - Root Cause Analyst & Evidence-Based Investigator (`@.shipmate/agents/analyzer.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Recommended Model

**Claude Opus 4.6** (claude-opus-4-6) is the recommended model for this command.

---

## Overview

Read-only, repo-wide audit. No files are modified. The output is a full inventory of every feature flag in the project with actionable recommendations.

1. **Phase 1: Discovery** - Find all feature flags in the codebase
2. **Phase 2: LaunchDarkly Enrichment** - Pull flag metadata, state, tags, and prerequisites from LD
3. **Phase 3: Classification** - Categorize each flag by type, age, and usage pattern
4. **Phase 4: Health Assessment** - Score each flag on staleness, risk, and complexity
5. **Phase 5: Cross-Repo Analysis** - Check external usage for unhealthy/critical flags
6. **Phase 6: Audit Report** - Full inventory with prioritized recommendations

---

## Before You Start

### Load Project Context

```
Read .shipmate/project/architecture.md (if exists)
```

This provides repo structure, tech stack, service boundaries, and domain context. If no project context exists, proceed with raw discovery but suggest running `/shipmate-learn` first.

### Tool Requirements

This command uses `ldcli` for LaunchDarkly data. See `@tools/launchdarkly-cli.mdc` for setup. If `ldcli` is not available, the audit still works but LD enrichment (Phase 2) will be manual.

---

## Phase 1: Discovery

Find every feature flag referenced in the codebase.

### 1.1: Enum / Constant Definitions (Primary Source)

```bash
grep -rn "enum FeatureFlag\|const FeatureFlag\|export enum.*Flag" --include="*.ts" .
```

Parse every member of each enum/constant found. This is the master list.

### 1.2: `ff-analysis/` Directory (If Exists)

Check for pre-existing analysis artifacts:

```bash
ls ff-analysis/ 2>/dev/null
```

If present, read:
- `all_flags_in_launchdarkly.txt` - full LD flag inventory
- `flags_in_ld_not_in_code.txt` - flags in LD but not in code (ghost flags)
- `launchdarkly_flags_full.json` - detailed LD export with metadata

Cross-reference with enum discovery to identify:
- Flags in code but not in LD (orphaned code)
- Flags in LD but not in code (ghost flags ready for LD archival)

### 1.3: Service Call Discovery

Catch flags used as string literals not in the enum.

> **Important:** Ignore `feature.js` product-flag catalogs when building the feature-flag inventory. Product flags listed in `feature.js` are not runtime LaunchDarkly feature flags and should not be counted as cleanup candidates unless they are also referenced through runtime flag APIs.


```bash
grep -rn "isEnabled\|anyEnabled\|allEnabled\|isFeatureFlagDefined\|getNumericFeatureFlagValue" --include="*.ts" .
```

Also check legacy ExtJS patterns:

```bash
grep -rn "SLPTaiq.getLDFlag\|SLPTaiq.getFlag" --include="*.js" .
```

### 1.4: Decorator, Route Guard, and MFE Discovery

```bash
grep -rn "@HasFeatureFlag\|@HasAnyFeatureFlag\|@HasAllFeatureFlags\|@LacksFeatureFlag\|@LacksAnyFeatureFlag\|@LacksAllFeatureFlags" --include="*.ts" .
grep -rn "featureFlaggedCanActivate\|authReqs.*featureFlag" --include="*.ts" .
grep -rn "featureFlagIn\|featureFlagNotIn" --include="*.json" .
```

### 1.5: LaunchDarkly Flag Inventory

Pull the full flag list from LD to cross-reference with code discovery:

```bash
ldcli flags list --project {project} --limit 200 --output json | jq '[.items[] | {key: .key, name: .name, kind: .kind, creationDate: .creationDate, maintainer: .maintainer, tags: .tags}]'
```

This catches flags that exist in LD but aren't in any code enum (ghost flags), and flags in code that no longer exist in LD (orphaned code).

> **Note:** The `saas-feature-flags` repo (`sailpoint/saas-feature-flags`) is **archived and deprecated**. Flag management has moved to LaunchDarkly directly. See [Feature Flag Lifecycle and Policy](https://sailpoint.atlassian.net/wiki/spaces/IDN/pages/2205583775/Feature+Flag+Lifecycle+and+Policy) for the current process.

### 1.6: Consolidate Master List

Merge all discovered flags into a deduplicated master list. For each flag, record:
- Where it was discovered (enum, service call, decorator, route guard, MFE config, LD-only)
- Total reference count across all categories

---

## Phase 2: LaunchDarkly Enrichment

For each flag in the master list, pull metadata from LaunchDarkly.

### 2.1: Determine LD Project

Use the flag prefix or known team mapping to pick the correct LD project:

| Prefix Pattern | LD Project |
|----------------|------------|
| `UI_`, `GOV_`, `CONN_`, `PLTUI`, `UIGOV`, `ISCANT` | `idn` |
| `CAM_` | `cam` |
| `ARM_` | `arm` |
| `SIR_` | `sir` |
| `NERM_` | `nerm-classic` |
| Unknown | Try `idn` first, fall back to others |

### 2.2: Pull Flag Data

```bash
ldcli flags get --project {project} --flag {FLAG_KEY} --output json
```

Extract:
- **State:** ON/OFF per environment (use `test` and `production` only - ignore `test-public` and `prod-public`)
- **Tags:** `team-*`, `expiration_month-*`, `visibility-*`, `ticket-*`
- **Prerequisites:** flags this one depends on
- **Created date**
- **Maintainer:** user or team (this is the authoritative ownership field - see [Determining Flag Ownership](https://sailpoint.atlassian.net/wiki/spaces/IDN/pages/2205583775/Feature+Flag+Lifecycle+and+Policy#Determining-Flag-Ownership))
- **Evaluation data / usage stats** (if available via LD API)

### 2.3: Pull Usage Data from LD

**Important:** Some flags are dynamically constructed at runtime and won't appear in code search. LD's evaluation/usage data is a critical additional signal.

```bash
# Check if flag has been evaluated recently
ldcli flags get --project {project} --flag {FLAG_KEY} --env production --output json | jq '{
  lastRequested: .environments.production.lastAccessed,
  evaluationCount: .environments.production._summary
}'
```

Flags with zero recent evaluations are strong candidates for cleanup or archival, even if they appear in code.

### 2.4: Reverse Prerequisite Map

For each flag, check if other flags depend on it:

```bash
ldcli flags list --project {project} --limit 200 --output json | jq '[.items[] | select(.prerequisites[]?.key == "FLAG_KEY") | .key]'
```

### 2.5: Ownership & Compliance Check

**Maintainer** is the authoritative ownership field in LD (not tags). It can be a user or a team. Tags like `team-*` are freeform and unreliable for ownership.

```bash
ldcli flags get --project {project} --flag {FLAG_KEY} --output json | jq '{maintainer: .maintainer, tags: .tags}'
```

Flag compliance violations:
- Missing `maintainer` -> **ownership violation** (flag has no owner)
- `maintainer` set to a single person instead of a team -> **fragile ownership** (bus factor)
- Missing `expiration_month-*` tag -> **tag violation**
- `expiration_month` in the past -> **overdue for cleanup**

---

## Phase 3: Classification

For each flag in the master list, determine:

### 3.1: Usage Pattern

Count references using all categories from `@standards/global/feature-flag-cleanup.md`:
- Service calls (files, invocations)
- Decorators
- Route guards
- MFE config entries
- Template usages (trace `.ts` property -> `.html`)
- Test references
- Storybook stories
- Cypress tests

### 3.2: Flag Type

| Type | Description | Typical Lifecycle |
|------|-------------|-------------------|
| **Release** | Gates a new feature during rollout | Remove after full rollout |
| **Ops** | Runtime kill switch / circuit breaker | Keep indefinitely |
| **Experiment** | A/B test or gradual rollout | Remove after experiment concludes |
| **Permission** | Gates feature by tenant/org capability | Keep indefinitely |
| **Migration** | Gates old vs new implementation path | Remove after migration complete |

Infer type from:
- Naming conventions (ticket IDs like `UIGOV4440_*` = release; `_MASTER` suffix = master flag)
- Usage pattern (single conditional = release; negated check = migration; product flag combo = permission)
- LD tags (`expiration_month` present = release/migration; no expiration = ops/permission)
- Associated Jira tickets

### 3.3: Age Determination

Use multiple signals, in order of reliability:
1. **`expiration_month-YYYYMM` tag** from LD (most reliable - explicitly set by the team)
2. **Flag created date** from LD metadata
3. **Jira ticket ID** in the flag name (check ticket creation date)
4. **Git blame** on the enum definition line
5. **TODO comments** with dates or ticket references

Categorize: **< 3 months** (fresh) | **3-6 months** (aging) | **6-12 months** (stale) | **> 12 months** (overdue)

A flag past its `expiration_month` is **definitively overdue** regardless of other signals.

---

## Phase 4: Health Assessment

Score each flag on three dimensions (1-5 scale):

### 4.1: Staleness Score

| Score | Criteria |
|-------|----------|
| 1 | Fresh - recently added, active development |
| 2 | Stable - rolled out but monitoring period |
| 3 | Aging - 3-6 months, no recent changes to guarded code |
| 4 | Stale - 6-12 months, likely fully rolled out |
| 5 | Overdue - past `expiration_month`, or >12 months, or ON in all environments with no rules |

### 4.2: Complexity Score

| Score | Criteria |
|-------|----------|
| 1 | Single file, simple conditional |
| 2 | 2-3 files, straightforward removal |
| 3 | 4-8 files, includes tests and templates |
| 4 | 9-15 files, cross-component, has cascade impacts |
| 5 | 16+ files, cross-repo, route guards, MFE config, master flag with dependents, or FEATS auto-segments |

### 4.3: Risk Score

| Score | Criteria |
|-------|----------|
| 1 | Isolated code, good test coverage |
| 2 | Multiple consumers but well-tested |
| 3 | Template changes, moderate test coverage |
| 4 | Route guards or MFE config changes, cross-component |
| 5 | Cross-repo dependencies, reverse prerequisites, FEATS auto-segments, or sparse test coverage |

### 4.4: Team Health (Per-Team Metric)

Group flags by their LD `maintainer` team and compute the flag-to-member ratio.

```bash
# Get team members for each LD team
ldcli teams list --output json | jq '[.items[] | {key: .key, name: .name, memberCount: (.members.totalCount // 0)}]'
```

| Ratio | Rating |
|-------|--------|
| 1-5 flags per member | Healthy |
| 5-10 flags per member | Overloaded - team is carrying too much flag debt |
| 10+ flags per member | **Critical - team cannot realistically clean these up at current capacity** |

If `ldcli` can't retrieve team member counts, prompt the user: "How many engineers are on team {team_name}?"

### 4.5: Team Validation

**Check that each flag has a valid LD team with >1 member.**

```bash
ldcli flags get --project {project} --flag {FLAG_KEY} --output json | jq '.maintainer'
```

Flag violations (**surface these prominently**):
- **No maintainer set** -> ⚠️ **FLAG HAS NO OWNER. Someone needs to claim this flag or it will rot.**
- **Maintainer is a single person** (not a team) -> ⚠️ **Bus factor of 1. If this person leaves, the flag is orphaned.**
- **Maintainer team has <=1 member** -> ⚠️ **Team exists but is effectively empty. Update the team in LD.**

These are not optional findings - every flag MUST have a valid team owner with >1 member. Non-compliant flags should be called out in the report with high visibility.

### 4.6: Overall Health

```
Health = (Staleness + Complexity + Risk) / 3
```

- **1.0-2.0:** Healthy - no action needed
- **2.1-3.0:** Monitor - schedule cleanup soon
- **3.1-4.0:** Unhealthy - prioritize cleanup
- **4.1-5.0:** Critical - cleanup overdue, accumulating risk

---

## Phase 5: Cross-Repo Analysis

For flags scored 3.0+ (Unhealthy/Critical), check external usage:

```bash
gh search code "FLAG_NAME" --owner=sailpoint --owner=sailpoint-core -- -repo:{current-repo} -path:node_modules
```

For each external match:
- Record `org/repo`, file path, snippet
- Check if repo is archived: `gh repo view {org}/{repo} --json isArchived --jq '.isArchived'`

Skip cross-repo analysis for flags scored < 3.0 (not cleanup candidates yet).

---

## Phase 6: Audit Report

```
## Feature Flag Audit Report
**Repository:** {repo-name}
**Date:** {date}
**Total Flags Found:** N (code) + M (LD-only ghost flags)
**Flags Needing Cleanup:** X
**Tag Violations:** Y flags missing required LD tags

### Executive Summary

| Health | Count | Action |
|--------|-------|--------|
| Critical (4.1-5.0) | N | Cleanup immediately |
| Unhealthy (3.1-4.0) | N | Schedule cleanup this sprint/quarter |
| Monitor (2.1-3.0) | N | Review next quarter |
| Healthy (1.0-2.0) | N | No action needed |

### Expiration Report
Flags past their `expiration_month` tag:
| Flag | Expiration | Months Overdue | Health | Team |
|------|-----------|----------------|--------|------|

### Quick Wins
High-staleness + low-complexity (easy to clean up now):
| Flag | Staleness | Complexity | Risk | Files | Recommendation |
|------|-----------|------------|------|-------|----------------|

### Priority Cleanup Queue
Ordered by health score (worst first):
| # | Flag | Health | Type | Age | Files | External Repos | FEATS | Recommendation |
|---|------|--------|------|-----|-------|----------------|-------|----------------|
| 1 | FLAG_A | 4.7 | Release | 14mo | 23 | 2 active | No | Immediate cleanup |
| 2 | FLAG_B | 4.2 | Migration | 9mo | 12 | 0 | Yes | Coordinate with FEATS first |

### Prerequisite Graph
Flags with dependencies (cleanup order matters):
| Flag | Depends On | Depended On By |
|------|-----------|----------------|
| FLAG_CHILD | FLAG_MASTER | - |
| FLAG_MASTER | - | FLAG_CHILD, FLAG_OTHER |

**Cleanup order:** Dependents first, then master flags.

### Full Inventory
| Flag | Type | Age | Expiry Tag | Health | S | C | R | Files | External | LD State | Team | Status |
|------|------|-----|-----------|--------|---|---|---|-------|----------|----------|------|--------|

### Per-Flag Detail

For each flag scored 3.0+, include:

#### FLAG_A (Health: 4.7 - Critical)
- **Type:** Release
- **Age:** ~14 months (JIRA-1234, created 2024-12-15)
- **Expiration Tag:** `expiration_month-202503` (9 months overdue)
- **LD State:** test=ON, production=ON (globally enabled, no rules)
- **LD Project:** idn
- **Prerequisites:** None
- **Reverse Prerequisites:** None
- **FEATS Auto-Segments:** No
- **Maintainer:** team-beagle (4 members)
- **Tag Compliance:** OK (expiration_month-202503, visibility-ui)
- **Local Usage:**
  | File | Category | Lines |
  |------|----------|-------|
  | path/to/file.ts | Service Call | 42-48 |
- **External Usage:**
  | Repo | Status | Files |
  |------|--------|-------|
  | org/repo-a | Active | 2 |
- **Recommendation:** Immediate cleanup. Run `/shipmate-feature-flag-cleanup FLAG_A`
- **Estimated Effort:** ~2 hours (local) + cross-team coordination

### Ghost Flags (LD Only - No Code References)
Flags found in LaunchDarkly but not referenced in any code:
| Flag | LD Project | Team Tag | Expiry Tag | Created | Recommendation |
|------|-----------|----------|-----------|---------|----------------|

These can be archived directly in LaunchDarkly.

### Tag Violations
Flags missing required LD tags:
| Flag | Missing Tags | Team (if known) |
|------|-------------|-----------------|

### Team Health Summary
| Team | Flags | Members | Ratio | Rating | Maintainer Valid |
|------|-------|---------|-------|--------|-----------------|
| team-beagle | 12 | 4 | 3.0 | Healthy | ✅ |
| team-chow | 35 | 3 | 11.7 | **Critical** | ✅ |
| (no maintainer) | 8 | - | - | ⚠️ **Unowned** | ❌ |

### Ownership Violations
Flags with no maintainer or invalid team setup (**these need immediate attention**):
| Flag | Issue |
|------|-------|
| FLAG_X | ⚠️ No maintainer set |
| FLAG_Y | ⚠️ Maintainer is a single person, not a team |
| FLAG_Z | ⚠️ Maintainer team has 0 members |

### Flags to Keep (Ops / Permission)
Flags classified as Ops or Permission type that should NOT be cleaned up:
| Flag | Type | Reason |
|------|------|--------|

### Observations
- [Pattern observations: e.g. "12 of 15 stale flags follow the UIGOV* naming pattern"]
- [Tech debt trends: e.g. "Average flag age is 8 months - cleanup cadence is too slow"]
- [Tag compliance: e.g. "23% of flags missing expiration_month tag"]
- [Recommendations: e.g. "Consider adding flag expiration alerts to CI pipeline"]

### Next Steps
- Run `/shipmate-feature-flag-cleanup {FLAG_NAME}` for any flag in the priority queue
- Clean up dependents before master flags (see prerequisite graph)
- Archive ghost flags directly in LaunchDarkly
- Fix ownership violations - every flag needs a valid team maintainer
- Fix tag violations to improve future audits
- Create a Jira epic for batch cleanup if multiple critical flags exist
- Share this report with team leads for cross-repo coordination
```

---

## Publishing the Report

If your team has a Confluence space for operational reports (e.g. alongside TechOps reports), you can publish the audit there:

```bash
# Create or update a page in your team's Confluence space
confluence create-child "Feature Flag Audit - {repo-name} - {date}" {PARENT_PAGE_ID} --body "$(cat audit-report.md)"
```

Teams can configure their Confluence space in `.shipmate/config.yml`:

```yaml
featureFlags:
  confluenceSpace: "TEAMSPACE"       # Space key for audit reports
  confluenceParentPage: "123456789"  # Parent page ID for audit reports
```

When configured, `/shipmate-feature-flag-audit` will offer to publish the report directly after generation.
