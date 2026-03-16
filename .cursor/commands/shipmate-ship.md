---
version: 1.0
context:
  - @README.md
  - @.shipmate/project/pull-requests.md
  - @.shipmate/agents/**/*
---
# Ship Feature

**Command:** `/shipmate-ship` (Cursor) or `@.shipmate/commands/ship.md` (other tools)

**Purpose:** Prepare feature for deployment - create PR, update Jira, trigger CI/CD, document deployment.

**Agent:** Scribe - Documentation Specialist (`@.shipmate/agents/scribe.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Prerequisites

- `.shipmate/features/{JIRA-KEY}/verification.md` with APPROVED status
- All code committed to feature branch
- All tests passing

---

## Context to Load

**Required:**
- `@.shipmate/features/{JIRA-KEY}/requirements.md` - Feature details
- `@.shipmate/features/{JIRA-KEY}/verification.md` - Verification report
- `@.shipmate/project/pull-requests.md` - PR conventions for this repo
- Git status and branch information

**Note:** If `@.shipmate/project/pull-requests.md` exists, use it to format the PR title and description according to your team's conventions. If it doesn't exist, use the default Shipmate template below.

---

## Intelligent Deployment Context Gathering

**CRITICAL:** Before shipping, gather comprehensive deployment context from multiple sources.

### Phase 0: Auto-Detect Deployment Requirements

#### 0.1 Detect Feature Flag Dependencies

```bash
# Search for feature flag usage in the changes
git diff main...HEAD | grep -iE "featureFlag|feature_flag|FEATURE_FLAG|isFeatureEnabled|ldclient"

# Search for flag key patterns
FLAG_KEYS=$(git diff main...HEAD | grep -oE "(UI_|GOV_|CONN_|CAM_|ARM_)[A-Z_]+" | sort -u)

# For each detected flag, get LaunchDarkly status
for FLAG in $FLAG_KEYS; do
  echo "Checking flag: $FLAG"
  ldcli flags get --project idn --flag "$FLAG" --output json 2>/dev/null | jq '{key: .key, on: .environments.production.on, fallthrough: .environments.production.fallthrough}'
done
```

**If flags detected:**
```markdown
## Feature Flag Requirements

**Flags Used:**
| Flag | Production Status | Default | Action Required |
|------|-------------------|---------|-----------------|
| {FLAG_KEY} | {on/off} | {true/false} | {enable before deploy / none} |

**Pre-Deployment:**
- [ ] Verify flag exists in LaunchDarkly
- [ ] Verify flag targeting rules are correct
- [ ] Document rollout strategy

**Post-Deployment:**
- [ ] Enable flag in test environment
- [ ] Enable flag in production (per rollout plan)
- [ ] Monitor flag analytics
```

#### 0.2 Detect Database Migration Requirements

```bash
# Check for migration files in the diff
git diff main...HEAD --name-only | grep -iE "migration|migrate|schema"

# Check for model/schema changes
git diff main...HEAD --name-only | grep -iE "model|entity|schema|\.sql"

# Check for ORM migration commands in package.json or scripts
grep -r "migrate" package.json Makefile scripts/ 2>/dev/null | head -5
```

**If migrations detected:**
```markdown
## Database Migration Requirements

**Migration Files:**
- {migration-file-1}: {description}
- {migration-file-2}: {description}

**Pre-Deployment:**
- [ ] Migration script reviewed by DBA
- [ ] Rollback script exists and tested
- [ ] Database backup scheduled
- [ ] Estimated migration time: {X} seconds

**Deployment Order:**
1. Run migrations BEFORE code deployment
2. Deploy code
3. Verify data integrity

**Rollback Plan:**
- Rollback script: {path}
- Estimated rollback time: {X} seconds
```

#### 0.3 Fetch Deployment Runbook from Confluence

```bash
# Search for deployment runbook
confluence search --query "deployment runbook {SERVICE-NAME}" --limit 3
confluence search --query "deploy {PROJECT-NAME}" --limit 3

# Check for team-specific deployment docs
confluence search --query "deployment checklist {TEAM-NAME}" --limit 3

# Look for environment-specific guides
confluence search --query "production deployment" --limit 3
```

**If runbook found:**
```markdown
## Deployment Runbook

**Source:** [{Runbook Title}]({confluence-url})
**Last Updated:** {date}

**Key Steps from Runbook:**
1. {step-1}
2. {step-2}
3. {step-3}

**Team-Specific Requirements:**
- {requirement-1}
- {requirement-2}
```

#### 0.4 Check for Prerequisite Deployments

```bash
# Get Epic for this ticket
EPIC_KEY=$(jira issue view {JIRA-KEY} --json | jq -r '.fields.parent.key // .fields.customfield_10100')

if [ -n "$EPIC_KEY" ]; then
  # Get all tickets in the Epic
  jira issue list --jql "parent=$EPIC_KEY AND status != Done" --json | jq '.[].key'

  # Check for open PRs that should deploy first
  SIBLING_KEYS=$(jira issue list --jql "parent=$EPIC_KEY" --json | jq -r '.[].key')
  for KEY in $SIBLING_KEYS; do
    gh pr list --search "$KEY in:title" --state merged --json number,mergedAt
  done
fi

# Check linked blocking issues
jira issue view {JIRA-KEY} --json | jq '.fields.issuelinks[] | select(.type.name == "Blocks")'
```

**If prerequisites found:**
```markdown
## Deployment Prerequisites

**Must Deploy First:**
- [{PREREQ-KEY}]({url}): {title} - Status: {status}
  - PR: #{number} - {merged/open}
  - Impact: {why-it-must-go-first}

**Can Deploy Together:**
- [{RELATED-KEY}]({url}): {title}
  - PR: #{number}
  - Coordination: {deployment-notes}

**Recommendation:** Coordinate deployment order with team.
```

#### 0.5 Auto-Detect Configuration Changes

```bash
# Check for environment variable changes
git diff main...HEAD | grep -iE "process\.env|os\.environ|Environment|config\."

# Check for config file changes
git diff main...HEAD --name-only | grep -iE "config|\.env|settings"

# Check for secrets or credentials patterns (should NOT be present)
git diff main...HEAD | grep -iE "api_key|apikey|secret|password|credential" && echo "⚠️ POTENTIAL SECRET DETECTED"
```

**If config changes detected:**
```markdown
## Configuration Changes Required

**Environment Variables:**
| Variable | Environments | Value Type | Action |
|----------|--------------|------------|--------|
| {VAR_NAME} | dev, staging, prod | {string/secret} | Add to {config-system} |

**Config Files:**
- {config-file}: {changes-needed}

**Pre-Deployment:**
- [ ] Environment variables set in all environments
- [ ] Secrets added to vault/secrets manager
- [ ] Config changes reviewed by ops team

⚠️ **Security Check:** Ensure no secrets are committed to code.
```

#### 0.6 Gather Service Dependencies

```bash
# Check for new service imports/dependencies
git diff main...HEAD | grep -iE "import.*service|inject.*service|@Inject"

# Check for HTTP client calls to other services
git diff main...HEAD | grep -iE "http\.|fetch\(|axios\.|HttpClient"

# Check for message queue interactions
git diff main...HEAD | grep -iE "kafka|rabbitmq|sqs|pubsub|eventEmitter"
```

**If new dependencies detected:**
```markdown
## Service Dependencies

**New Service Calls:**
| Service | Endpoint | Type | SLA Impact |
|---------|----------|------|------------|
| {service-name} | {endpoint} | REST/gRPC | {latency/availability} |

**Message Queue:**
| Queue/Topic | Direction | Messages |
|-------------|-----------|----------|
| {queue-name} | Publish/Subscribe | {message-type} |

**Pre-Deployment:**
- [ ] Verify dependent services are available
- [ ] Confirm API contracts are compatible
- [ ] Set up monitoring for new integrations
```

---

## Shipping Process

### 1. Verify Readiness

Check prerequisites:
- [ ] Verification report shows APPROVED status
- [ ] All tasks in tasks.md checked off
- [ ] All tests passing
- [ ] No uncommitted changes
- [ ] On feature branch (not main/master)
- [ ] **Phase 0 context gathering complete**
- [ ] **Deployment prerequisites met**
- [ ] **Feature flags configured (if applicable)**
- [ ] **Database migrations reviewed (if applicable)**

### 2. Create Pull Request

**Important:** Before creating the PR, check `@.shipmate/project/pull-requests.md` for this repo's conventions (especially whether SemVer tags are used).

**PR Title Format:**

Standard format:
```
{JIRA-KEY}: {Brief description of changes}
```

For repos using semantic versioning (check `pull-requests.md`):
```
{JIRA-KEY}: [MAJOR|MINOR|PATCH] {Brief description of changes}
```

**SemVer Guidelines:**
- `[MAJOR]` - Breaking changes, incompatible API changes
- `[MINOR]` - New features, backward-compatible additions
- `[PATCH]` - Bug fixes, backward-compatible fixes

**PR Description (Default - Adapt to repo conventions):**
````markdown
# {JIRA-KEY}: {Feature Title}

## Summary

{Brief description of what this PR does}

## Jira Ticket

[{JIRA-KEY}](https://sailpoint.atlassian.net/browse/{JIRA-KEY})

## Changes

**Backend:**
- [Change 1]
- [Change 2]

**Frontend:**
- [Change 1]
- [Change 2]

**Database:**
- [Migration details]

## Testing

**Unit Tests:**
- Added {count} tests
- Coverage: {percent}%

**Integration Tests:**
- Added {count} tests
- All endpoints tested

**E2E Tests:**
- Added {count} scenarios
- Critical workflows covered

## Verification

✅ All acceptance criteria met
✅ All tests passing
✅ Code quality standards met
✅ Security validation passed
✅ Performance benchmarks met

[Link to full verification report](.shipmate/features/{JIRA-KEY}/verification.md)

## Deployment Notes

**Database Migration:**
- [ ] Migration script: `migrations/XXX_description.sql`
- [ ] Test rollback: `migrations/XXX_description.down.sql`
- [ ] Estimated time: X seconds

**Feature Flags:**
- [ ] Feature flag: `feature_{jira_key_lowercase}`
- [ ] Initially: OFF
- [ ] Rollout plan: 10% → 50% → 100%

**Configuration:**
- [ ] No config changes needed
  OR
- [ ] Environment variables: [list]
- [ ] Updated in: dev, staging, prod

**Monitoring:**
- [ ] Metrics: [list metrics to watch]
- [ ] Alerts: [list alerts configured]
- [ ] Dashboards: [link to dashboard]

## Rollback Plan

If issues detected:
1. Disable feature flag immediately
2. OR: Revert PR (estimated time: X minutes)
3. Database rollback script: `migrations/XXX_description.down.sql`

## Checklist

- [ ] Code reviewed by at least 2 team members
- [ ] All CI/CD checks passing
- [ ] Documentation updated
- [ ] Jira ticket updated
- [ ] Deployment plan reviewed
- [ ] Rollback plan tested

## Risk Assessment

**Risk Level:** Low | Medium | High

**Risks:**
- [Risk 1]: [mitigation]
- [Risk 2]: [mitigation]

## Screenshots (if applicable)

[Add screenshots of UI changes]

---

🚢 Generated with Shipmate
````

### 3. Update Jira Ticket

**Add comment to ticket:**
````markdown
🚢 Feature Ready for Deployment

**PR Created:** [PR #{number}]({pr_url})

**Verification Status:** ✅ APPROVED

**Test Results:**
- Unit: {count} passing, {coverage}% coverage
- Integration: {count} passing
- E2E: {count} scenarios passing

**Performance:**
- API response: {time}ms (p95) ✅
- Database queries: {time}ms (p95) ✅

**Deployment:**
- Branch: {branch_name}
- Database migration: {yes/no}
- Feature flag: {flag_name}
- Risk level: {low/medium/high}

**Next Steps:**
1. PR review by team
2. Deploy to staging
3. QA validation
4. Deploy to production
````

**Update ticket status:**
- Move ticket to "Ready for Review" or equivalent
- Assign to tech lead for review

### 4. Trigger CI/CD Pipeline

**Ensure CI/CD runs:**
```bash
# Push branch if not already pushed
git push origin {branch_name}

# CI/CD should automatically:
# - Run all tests
# - Run linters
# - Build artifacts
# - Deploy to staging (if configured)
```

**Monitor CI/CD:**
- Watch build status
- Check all checks passing
- Verify deployment to staging

### 5. Create Deployment Checklist

Create `.shipmate/features/{JIRA-KEY}/deployment.md`:

````markdown
# Deployment Checklist - {JIRA-KEY}

**Feature:** {Title}
**PR:** #{number}
**Target Date:** {date}

---

## Pre-Deployment

### Code Review
- [ ] PR approved by at least 2 reviewers
- [ ] All comments addressed
- [ ] CI/CD checks passing

### Staging Validation
- [ ] Deployed to staging
- [ ] Smoke tests passed
- [ ] QA validation completed
- [ ] Performance acceptable

### Database
- [ ] Migration script reviewed by DBA
- [ ] Rollback script tested
- [ ] Backup created

### Configuration
- [ ] Environment variables set
- [ ] Feature flags configured
- [ ] Secrets rotated if needed

---

## Deployment

### Step 1: Database Migration
```bash
# Run migration
./scripts/migrate.sh up

# Verify
./scripts/migrate.sh verify
```

### Step 2: Deploy Code
```bash
# Deploy to production
./scripts/deploy.sh production {branch_name}

# Or merge PR to trigger auto-deploy
```

### Step 3: Enable Feature Flag
```bash
# Start with 10%
./scripts/feature-flag.sh {flag_name} 10%

# Monitor for 1 hour, then increase
./scripts/feature-flag.sh {flag_name} 50%

# Monitor for 1 hour, then full rollout
./scripts/feature-flag.sh {flag_name} 100%
```

---

## Post-Deployment

### Monitoring (first 24 hours)
- [ ] Error rate: Normal (< 0.1%)
- [ ] Response times: Normal (< 200ms p95)
- [ ] Database queries: Normal (< 50ms p95)
- [ ] No alerts triggered

### Validation
- [ ] Key workflows tested in production
- [ ] User reports: No issues
- [ ] Metrics: As expected

### Documentation
- [ ] Release notes updated
- [ ] API docs updated (if applicable)
- [ ] Internal docs updated

---

## Rollback Plan

**If issues detected:**

1. **Immediate Action**
   ```bash
   # Disable feature flag
   ./scripts/feature-flag.sh {flag_name} 0%
   ```

2. **If not sufficient**
   ```bash
   # Revert deployment
   git revert {commit_hash}
   ./scripts/deploy.sh production main
   ```

3. **Database rollback** (if needed)
   ```bash
   ./scripts/migrate.sh down
   ```

**Estimated rollback time:** X minutes

---

## Sign-Off

**Deployed By:** {name}
**Date:** {date}
**Status:** ✅ Success | ❌ Rolled Back
````

### 6. Final Confirmation

Present summary:

```
🚢 Feature ready to ship!

PR Created:
✅ PR #{number}: [{JIRA-KEY}] {Title}
✅ PR description includes verification report
✅ All sections completed

Jira Updated:
✅ Comment added with deployment details
✅ Status moved to "Ready for Review"

CI/CD:
✅ Pipeline triggered
✅ All checks running

Created:
- .shipmate/features/{JIRA-KEY}/deployment.md

Next steps:
1. Wait for PR review and approval
2. Deploy to staging for QA validation
3. Deploy to production with feature flag
4. Monitor metrics for 24 hours

Estimated time to production: 1-3 days
```

---

## Deployment Best Practices

**Feature Flags:**
- Always deploy with feature flag OFF initially
- Gradual rollout: 10% → 50% → 100%
- Monitor metrics at each stage
- Keep flag for at least 1 week after 100%

**Database Migrations:**
- Always test rollback before deployment
- Run during low-traffic window if possible
- Have DBA review for critical changes
- Backup database before migration

**Monitoring:**
- Set up alerts before deployment
- Watch metrics closely for first 24 hours
- Have rollback plan ready
- Document any issues observed

**Communication:**
- Announce in #engineering before deployment
- Update status in deployment channel
- Notify stakeholders when complete

---

## Risk Mitigation

**High Risk Features:**
- Deploy to canary servers first
- Keep feature flag for longer (2+ weeks)
- Have on-call engineer monitor deployment
- Schedule during business hours

**Medium Risk Features:**
- Standard gradual rollout
- Monitor for 24 hours
- Feature flag for 1 week

**Low Risk Features:**
- Faster rollout (50% → 100%)
- Monitor for 4-8 hours
- Feature flag can be removed after 2-3 days

---

## Persona

Activates **Verifier** persona (high priority) for deployment preparation.

**Key traits:**
- Thorough (checks all prerequisites)
- Risk-aware (identifies and mitigates risks)
- Process-oriented (follows deployment checklist)
- Communicative (updates all stakeholders)
