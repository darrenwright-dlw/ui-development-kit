# Create Spec

**Purpose:** Transform feature plan into detailed, validated specification through research, clarification, and formal documentation.

**Command:** `shipmate spec --jira=IDN-1432`

---

## Objective

Create a comprehensive feature specification that includes:
- Clear problem statement and context
- Technical approach and design decisions
- Implementation details and patterns
- Constraints and dependencies
- Verification criteria and test plan

---

## Process

### Phase 1: Research & Shape (Interactive)

#### **1.1 Load Feature Plan**

Read from `.shipmate/plans/{JIRA-KEY}.json`:
- Requirements and acceptance criteria
- Similar features found
- Dependencies and constraints
- Open questions

#### **1.2 Gather Visual Assets**

**For UI features:**
- Request mockups, wireframes, design files
- Screenshot similar UI elements
- Document UX flows and interactions
- Note accessibility requirements

**For API features:**
- Request API contract examples
- Document request/response payloads
- Note authentication requirements
- Define error responses

**Store assets:**
```bash
mkdir -p .shipmate/specs/IDN-1432/assets/
# Save mockups, diagrams, examples
```

#### **1.3 Interactive Research Session**

**Ask clarifying questions:**

```markdown
## Clarification Questions

### Requirements
[Question about unclear requirement]
[Question about edge case]
[Question about scope boundary]

### Technical Approach
[Question about architecture choice]
[Question about technology selection]
[Question about integration point]

### Data Model
[Question about data structure]
[Question about relationships]
[Question about migration strategy]

### User Experience
[Question about user flow]
[Question about error handling]
[Question about validation]
```

**Document answers:**
```markdown
## Research Findings

### Requirements Clarifications
[Answer 1]: [Details]
[Answer 2]: [Details]

### Technical Decisions
[Decision 1]: [Rationale]
[Decision 2]: [Rationale]

### Data Model Decisions
[Decision 1]: [Approach]
[Decision 2]: [Approach]
```

#### **1.4 Identify Reusable Patterns**

**Search codebase for:**
- Similar implementations to reference
- Reusable components or services
- Existing utilities and helpers
- Tested patterns to follow

**Document patterns:**
```markdown
## Reusable Patterns

### Pattern 1: [Name]
- **Location:** `src/path/to/pattern`
- **Usage:** [How it applies to this feature]
- **Adaptation:** [What needs to change]

### Pattern 2: [Name]
- **Location:** `src/path/to/pattern`
- **Usage:** [...]
- **Adaptation:** [...]
```

#### **1.5 Define Scope Boundaries**

**Explicitly state what's IN scope:**
- Feature A
- Feature B
- Integration C

**Explicitly state what's OUT of scope:**
- Future feature X (defer to next sprint)
- Enhancement Y (separate ticket)
- Refactoring Z (not required for MVP)

**Document assumptions:**
- Assumption 1
- Assumption 2
- Assumption 3

---

### Phase 2: Write Spec (Formal Documentation)

#### **2.1 Create Spec Structure**

Generate `.shipmate/specs/{JIRA-KEY}/spec.md`:

```markdown
# IDN-1432: Add Granular Audit Event Logging

**Status:** Draft
**Created:** 2025-11-12
**Last Updated:** 2025-11-12
**Owner:** @username
**Reviewers:** @reviewer1, @reviewer2

---

## Problem

### Current State
[Describe what exists today and why it's insufficient]

### Pain Points
- Pain point 1
- Pain point 2
- Pain point 3

### User Impact
[How users are affected by the current state]

---

## Proposed Solution

### Overview
[High-level description of the solution]

### Key Benefits
- Benefit 1
- Benefit 2
- Benefit 3

### Success Metrics
- Metric 1: [target]
- Metric 2: [target]
- Metric 3: [target]

---

## Requirements

### Functional Requirements

**FR-1: [Requirement name]**
- Description: [...]
- Acceptance Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
- Priority: High | Medium | Low

**FR-2: [Requirement name]**
- Description: [...]
- Acceptance Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
- Priority: High | Medium | Low

### Non-Functional Requirements

**NFR-1: Performance**
- Response time <200ms for API calls
- Support 1000 concurrent users
- Database queries optimized with indexes

**NFR-2: Security**
- PII data hashed before storage
- Access control via RBAC
- Audit logging for all changes

**NFR-3: Reliability**
- 99.9% uptime
- Graceful degradation on failures
- Automated recovery mechanisms

---

## Technical Design

### Architecture

**System Components:**
```
+-------------+      +--------------+      +-------------+
|   Frontend  |----->|   API Layer  |----->|  Database   |
|  (Angular)  |      |  (REST API)  |      | (Postgres)  |
+-------------+      +--------------+      +-------------+
                            |
                            v
                     +--------------+
                     |  Event Bus   |
                     |   (Kafka)    |
                     +--------------+
```

**Component Responsibilities:**
- **Frontend:** User interface for viewing/filtering audit logs
- **API Layer:** REST endpoints for CRUD + filtering + export
- **Database:** Persistent storage with optimized queries
- **Event Bus:** Async event publishing for audit events

### Data Model

**New Tables:**

```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  user_ip INET NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at)
);
```

**Relationships:**
- `user_id` -> FK to `users.id`
- `resource_type` + `resource_id` -> Polymorphic reference

### API Design

**Endpoints:**

```typescript
// List audit events with filtering
GET /api/v1/audit-events
Query params:
  - user_id: string (optional)
  - resource_type: string (optional)
  - action: string (optional)
  - start_date: ISO8601 (optional)
  - end_date: ISO8601 (optional)
  - limit: number (default: 100, max: 1000)
  - offset: number (default: 0)

Response: {
  data: AuditEvent[],
  pagination: {
    total: number,
    limit: number,
    offset: number
  }
}

// Export audit events as CSV
GET /api/v1/audit-events/export
Query params: Same as list endpoint
Response: text/csv download

// Get single audit event
GET /api/v1/audit-events/:id
Response: AuditEvent
```

**Request/Response Schemas:**

```typescript
interface AuditEvent {
  id: string;
  user_id: string;
  user_ip: string;
  resource_type: string;
  resource_id: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  metadata: Record<string, any>;
  created_at: string; // ISO8601
}
```

### Implementation Approach

**Backend:**
1. Create `AuditEvent` model with validation
2. Implement `AuditEventRepository` for data access
3. Create `AuditEventService` for business logic
4. Implement `AuditEventController` for HTTP endpoints
5. Add `AuditEventPublisher` for event publishing
6. Create database migration for `audit_events` table

**Frontend:**
1. Create `AuditLogListComponent` for displaying logs
2. Implement filter controls (user, resource type, date range)
3. Add pagination component
4. Create export button with CSV download
5. Add detail modal for viewing full event

**Integration:**
1. Inject `AuditEventPublisher` into relevant services
2. Publish audit events on sensitive operations
3. Configure Kafka topic for audit events
4. Set up monitoring and alerts

### Reusable Components

- **EventPublisher:** Extend for `AuditEventPublisher`
- **FilterBuilder:** Reuse query filter logic
- **CSVExporter:** Reuse CSV generation utility
- **PaginationComponent:** Reuse existing pagination

---

## Dependencies & Integration

### Internal Dependencies
- EventPublisher service
- Authentication middleware
- Database connection pool

### External Dependencies
- Kafka for event streaming
- PostgreSQL for storage

### Team Coordination
- Database team: Schema review by [date]
- Security team: Compliance validation by [date]
- Frontend team: UI mockup review by [date]

---

## Constraints

### Technical Constraints
- Logging overhead must not exceed 10ms per request
- Database storage: estimate 10GB/year
- Kafka topic partition count: 3 (for scalability)

### Business Constraints
- Must launch by Sprint 24 end date
- Must meet SOC2 compliance requirements
- Budget: $X for infrastructure costs

### Security Constraints
- PII data must be hashed (SHA-256)
- Access restricted to admin roles
- Audit logs immutable after creation

### Performance Constraints
- API response time: <200ms (p95)
- Database query time: <50ms (p95)
- CSV export: <30s for 100K records

---

## Risks & Mitigation

**Risk 1: Performance degradation**
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:** Load testing + caching + database optimization

**Risk 2: Storage growth exceeds estimates**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** Implement retention policy + archival strategy

**Risk 3: Kafka outage prevents audit logging**
- **Likelihood:** Low
- **Impact:** High
- **Mitigation:** Fallback to direct database writes + alert on failures

---

## Verification & Testing

### Test Strategy

**Unit Tests:**
- `AuditEventPublisher.publish()` - verify event structure
- `AuditEventRepository.findByFilters()` - verify query logic
- `AuditEventService.exportToCsv()` - verify CSV format

**Integration Tests:**
- POST audit event -> verify persisted to database
- GET audit events with filters -> verify correct results
- Export CSV -> verify file content and format

**E2E Tests:**
- User performs sensitive action -> audit event created
- Admin views audit logs -> filters work correctly
- Admin exports logs -> CSV downloads successfully

**Performance Tests:**
- Load test: 1000 concurrent users
- Stress test: 10,000 events/second
- Endurance test: 24-hour sustained load

### Acceptance Criteria

- [ ] All functional requirements implemented
- [ ] All non-functional requirements met
- [ ] Unit test coverage >=80%
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated

---

## Migration & Rollout

### Database Migration
```sql
-- Migration: 001_create_audit_events.sql
-- Up
CREATE TABLE audit_events (...);
CREATE INDEX idx_user_id ON audit_events(user_id);
...

-- Down
DROP TABLE audit_events;
```

### Feature Flags
```typescript
// Enable audit logging gradually
if (featureFlags.isEnabled('audit_logging', user)) {
  auditEventPublisher.publish(event);
}
```

### Rollout Plan
1. **Week 1:** Deploy to dev environment, internal testing
2. **Week 2:** Deploy to staging, QA validation
3. **Week 3:** Deploy to prod with 10% traffic
4. **Week 4:** Ramp to 50% traffic
5. **Week 5:** Ramp to 100% traffic

### Rollback Plan
- Disable feature flag immediately
- Database migration rollback script ready
- Kafka topic can be paused

---

## Documentation

### Code Documentation
- JSDoc comments for all public methods
- README in feature directory
- Architecture decision records (ADRs)

### User Documentation
- Admin guide for viewing audit logs
- API documentation (OpenAPI spec)
- Troubleshooting guide

### Operational Documentation
- Runbook for incident response
- Monitoring and alerting setup
- Performance tuning guide

---

## Timeline & Milestones

**Week 1:**
- [ ] Database schema designed and reviewed
- [ ] API contracts finalized
- [ ] Backend implementation started

**Week 2:**
- [ ] Backend implementation complete
- [ ] Unit tests written
- [ ] Frontend implementation started

**Week 3:**
- [ ] Frontend implementation complete
- [ ] Integration tests written
- [ ] E2E tests written

**Week 4:**
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Documentation completed

**Week 5:**
- [ ] Deploy to staging
- [ ] QA validation
- [ ] Deploy to production

---

## Open Questions

**Retention Policy:** How long should audit events be retained?
  - Options: 1 year, 2 years, indefinite
  - Recommendation: 2 years with archival

**Real-time Streaming:** Do we need real-time audit event streaming?
  - Options: Yes (WebSockets), No (polling)
  - Recommendation: Start with polling, add streaming if needed

**Sensitive Resources:** Which resources require audit logging?
  - Options: All resources, Specific list
  - Recommendation: Start with high-risk resources (users, roles, permissions)

---

## References

- [Jira Ticket: IDN-1432](https://sailpoint.atlassian.net/browse/IDN-1432)
- [Feature Plan](./.shipmate/plans/IDN-1432.json)
- [Design Mockups](./.shipmate/specs/IDN-1432/assets/mockups.pdf)
- [Similar Feature: Activity Logger](../../src/services/ActivityLogger.ts)
- [SailPoint Security Standards](./.shipmate/project/security.md)
```

#### **2.2 Validate Spec**

**Run validation checks:**
- [ ] All sections complete
- [ ] Acceptance criteria clearly defined
- [ ] Technical design includes diagrams
- [ ] API contracts documented
- [ ] Test strategy defined
- [ ] Risks identified with mitigations
- [ ] Timeline realistic

**Generate validation report:**
```markdown
Spec Validation Complete

**Completeness:** 10/10 sections complete
**Clarity:** All requirements have acceptance criteria
**Technical Depth:** Architecture diagram + API contracts included
**Testability:** Test strategy covers unit/integration/E2E
**Risks:** 3 risks identified with mitigation plans

Status: READY FOR REVIEW
```

---

### Phase 3: Review & Finalize

#### **3.1 Request Reviews**

**Assign reviewers based on spec content:**
- Backend changes -> Backend tech lead
- Frontend changes -> Frontend tech lead
- Database changes -> Database team
- Security concerns -> Security team
- Architecture decisions -> Architect

**Post review request:**
```markdown
Spec Review Request: IDN-1432

Spec ready for review: `.shipmate/specs/IDN-1432/spec.md`

**Estimated Review Time:** 30-45 minutes

**Focus Areas:**
- Technical approach and architecture
- Data model and API design
- Security and performance considerations
- Test coverage and rollout plan

Please review by [date] and provide feedback in Jira or inline comments.
```

#### **3.2 Incorporate Feedback**

- Address review comments
- Update spec based on feedback
- Re-run validation
- Get final approvals

#### **3.3 Finalize Spec**

```markdown
Spec finalized and approved!

**Approvals:**
- Backend Lead: @reviewer1
- Frontend Lead: @reviewer2
- Security Team: @reviewer3

**Next steps:**
  shipmate create-tasks --jira=IDN-1432    # Break into tasks
```

---

## Output Files

```
.shipmate/specs/IDN-1432/
├── spec.md                   # Main specification document
├── assets/                   # Visual assets, diagrams
│   ├── mockups.pdf
│   ├── architecture.png
│   └── data-model.png
├── research.md               # Research notes from Phase 1
└── reviews/                  # Review feedback
    ├── backend-review.md
    └── security-review.md
```

---

## Configuration

Store spec metadata:

```yaml
specs:
  IDN-1432:
    created_at: "2025-11-12T10:00:00Z"
    updated_at: "2025-11-12T16:00:00Z"
    status: "approved"
    version: "1.0.0"
    reviewers:
      - "@backend-lead"
      - "@frontend-lead"
      - "@security-team"
    approvals:
      - reviewer: "@backend-lead"
        approved_at: "2025-11-12T14:00:00Z"
      - reviewer: "@frontend-lead"
        approved_at: "2025-11-12T15:00:00Z"
```

---

## Notes

- Specs are living documents - update as requirements evolve
- Keep research notes for historical context
- Tag reviewers in Jira when spec is ready
- Link spec to Jira ticket and PRs
- Archive old versions when major changes occur
