---
version: 1.0
context:
  - @README.md
  - @.shipmate/workflows/implementation/verification/**/*
  - @.shipmate/agents/**/*
---
# Verify Implementation

**Command:** `/shipmate-verify` (Cursor) or `@.shipmate/commands/verify.md` (other tools)

**Purpose:** Verify implementation meets all requirements, passes all tests, and follows all standards.

**Agent:** Verifier - Quality Assurance & Verification Specialist (`@.shipmate/agents/verifier.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Prerequisites

- `.shipmate/features/{JIRA-KEY}/requirements.md` with acceptance criteria
- `.shipmate/features/{JIRA-KEY}/tasks.md` with all tasks checked off
- Implementation complete

---

## Context to Load

**Required:**
- `@.shipmate/features/{JIRA-KEY}/requirements.md` - Acceptance criteria and NFRs
- `@.shipmate/features/{JIRA-KEY}/tasks.md` - Implementation checklist
- `@.shipmate/standards/` - Quality standards

---

## Verification Process

### 1. Run All Tests

**Unit Tests:**
```bash
npm test              # or equivalent
npm run coverage      # check coverage thresholds
```

**Verify:**
- All unit tests passing
- Backend coverage ≥80%
- Frontend coverage ≥70%
- No test failures or errors

**Integration Tests:**
```bash
npm run test:integration
```

**Verify:**
- All API endpoint tests passing
- Database query tests passing
- Service integration tests passing

**E2E Tests:**
```bash
npm run test:e2e
```

**Verify:**
- All user workflow tests passing
- Critical paths tested
- Error scenarios tested

### 2. Validate Code Quality

**Run Linters:**
```bash
npm run lint
```
**Expected:** 0 errors, 0 warnings

**Run Type Checker:**
```bash
npm run type-check
```
**Expected:** 0 type errors

**Check Complexity:**
- Functions <50 lines
- Cyclomatic complexity <15
- No deeply nested logic (max 3 levels)

### 3. Verify Acceptance Criteria

For each criterion in requirements.md:

```markdown
### AC-1: [Criterion description]
**Status:** ✅ PASS | ❌ FAIL

**Tests:**
- [test file]: [test count] passing
- Tested: [what was tested]

**Evidence:**
```[code snippet, test output, or screenshot]```

**Notes:** [any additional context]
```

### 4. Check Non-Functional Requirements

**Performance:**
- API response times <200ms (p95)
- Database queries <50ms (p95)
- Frontend load time <3s on 3G

**Security:**
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized output)
- Authentication/authorization enforced

**Reliability:**
- Error handling implemented
- Graceful degradation on failures
- Retry logic for transient errors

### 5. Validate Standards Compliance

Check against `@.shipmate/standards/`:

- [ ] Code follows naming conventions
- [ ] Error handling pattern used
- [ ] Logging added appropriately
- [ ] Comments on public methods
- [ ] No code duplication
- [ ] Validation on all inputs

### 6. Performance Benchmarks

Run load tests:
```bash
npm run benchmark    # or equivalent
```

Document:
- Requests per second
- Response time percentiles (p50, p95, p99)
- Error rate under load
- Resource usage (CPU, memory)

### 7. Security Validation

Check:
- [ ] No secrets or API keys in code
- [ ] Environment variables used for config
- [ ] Input validation on all user inputs
- [ ] SQL queries use parameters (no string concat)
- [ ] Authentication required on sensitive endpoints
- [ ] RBAC enforced where needed

### 8. Documentation Review

Verify:
- [ ] API docs updated (OpenAPI spec)
- [ ] Code comments added (JSDoc/Javadoc)
- [ ] README updated if needed
- [ ] Migration guide written if needed

---

## Create Verification Report

Generate `.shipmate/features/{JIRA-KEY}/verification.md`:

```markdown
# Verification Report - {JIRA-KEY}

**Date:** {date}
**Verifier:** Shipmate
**Status:** ✅ PASS | ❌ FAIL | ⚠️ NEEDS_WORK

---

## Summary

[Brief summary of verification results]

**Overall Score:** X/100

- Functionality: X%
- Code Quality: X%
- Test Coverage: X%
- Performance: X%
- Security: X%

---

## Acceptance Criteria Verification

[For each AC, document status, tests, evidence]

---

## Test Results

### Unit Tests
- Coverage: X% (target: 80% backend, 70% frontend)
- Tests: X passing, Y failing
- Status: ✅ PASS | ❌ FAIL

### Integration Tests
- Tests: X passing, Y failing
- Status: ✅ PASS | ❌ FAIL

### E2E Tests
- Scenarios: X passing, Y failing
- Status: ✅ PASS | ❌ FAIL

---

## Performance Verification

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| API response time (p95) | Xms | <200ms | ✅ |
| Database queries (p95) | Xms | <50ms | ✅ |
| Load test RPS | X | >500 | ✅ |
| Error rate | X% | <0.1% | ✅ |

---

## Code Quality

- Linter: X errors (target: 0)
- Type errors: X (target: 0)
- Code coverage: X% (target: 80%/70%)
- Status: ✅ PASS | ❌ FAIL

---

## Security Verification

- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Authentication/authorization

**Status:** ✅ PASS | ❌ FAIL

---

## Non-Functional Requirements

[For each NFR, verify met/not met]

---

## Issues Found

### Critical (Blocking)
[None or list issues]

### Minor (Non-blocking)
[None or list issues]

---

## Deployment Readiness

- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Code quality standards met
- [ ] Security validated
- [ ] Performance benchmarks met
- [ ] Documentation complete

---

## Recommendation

**✅ APPROVED FOR DEPLOYMENT** | **❌ NOT READY** | **⚠️ NEEDS WORK**

[Explanation and any conditions]

**Risk Level:** Low | Medium | High

**Deployment Strategy:**
[Recommended deployment approach]

---

## Sign-Off

**Verified By:** Shipmate Verifier
**Date:** {date}
**Signature:** shipmate-verify v{version}
```

---

## Final Confirmation

Present summary:

```
🧪 Verification Complete!

Status: ✅ APPROVED | ❌ NOT READY

Tests:
✅ Unit: {count} passing, {coverage}% coverage
✅ Integration: {count} passing
✅ E2E: {count} scenarios passing

Quality:
✅ Linter: 0 errors
✅ Type checker: 0 errors
✅ Standards compliance: 100%

Performance:
✅ API response: {time}ms (p95)
✅ Load test: {rps} req/sec

Security:
✅ All validation checks passed

Acceptance Criteria:
✅ {count}/{total} criteria met

Created:
- .shipmate/features/{JIRA-KEY}/verification.md

{If APPROVED}
Next step: /shipmate-ship to prepare deployment

{If NOT READY}
Issues to address:
- [Issue 1]
- [Issue 2]
```

---

## Quality Thresholds

**Tests:**
- Unit coverage: ≥80% backend, ≥70% frontend
- Integration: All API endpoints covered
- E2E: All critical workflows covered

**Performance:**
- API response: <200ms (p95)
- Database queries: <50ms (p95)
- Load test: Handle 1000 concurrent users

**Security:**
- 0 critical vulnerabilities
- Input validation: 100%
- Authentication: 100% on sensitive endpoints

**Code Quality:**
- Linter errors: 0
- Type errors: 0
- Cyclomatic complexity: <15
- Code duplication: <5%

---

## Persona

Activates **Verifier** persona (high priority).

**Key traits:**
- Thorough (tests everything)
- Evidence-based (documents all results)
- Quality-focused (high standards)
- Honest (reports issues clearly)
