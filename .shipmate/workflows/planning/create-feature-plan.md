# Create Feature Plan

**Purpose:** Plan a specific feature from a Jira ticket by merging ticket context with product vision.

**Command:** `shipmate plan-feature --jira=IDN-1432`

---

## Objective

Pull Jira ticket context and create an enriched feature plan that includes:
- Jira ticket requirements and acceptance criteria
- Product vision and mission context
- Similar existing features in the codebase
- Technical approach and dependencies
- Open questions and clarifications needed

---

## Process

### 1. Fetch Jira Context

**Pull ticket data:**
```bash
# Fetch Jira ticket
curl -X GET \
  -H "Authorization: Bearer $JIRA_TOKEN" \
  https://sailpoint.atlassian.net/rest/api/3/issue/IDN-1432
```

**Extract:**
- **Title** - Feature name
- **Description** - Problem statement and context
- **Acceptance Criteria** - Definition of done
- **Labels** - Tags like backend, frontend, security, etc.
- **Epic Link** - Parent epic if any
- **Comments** - Additional context from discussion
- **Linked Issues** - Related tickets, blockers, dependencies

**Follow links:**
- Linked PRDs, design docs, Confluence pages
- Related tickets that provide context
- Parent epic description

---

### 2. Load Vision Context

Read from `.shipmate/project/`:

**Mission Context:**
```markdown
From .shipmate/project/mission.md:
- Service purpose
- Core responsibilities
- Key users and use cases
```

**Architecture Context:**
```markdown
From .shipmate/project/architecture.md:
- Tech stack choices
- System architecture
- Key patterns to follow
```

**Domain Context:**
```markdown
From .shipmate/project/domain.md:
- Relevant domain concepts
- Related entities
- Business rules that apply
```

---

### 3. Search for Similar Features

**Backend similarity search:**
- Find similar API endpoints
- Look for comparable service methods
- Identify related domain models
- Search for similar validation logic

**Frontend similarity search:** (if applicable)
- Find similar UI components
- Look for comparable page layouts
- Search for similar state management patterns
- Identify related forms or workflows

**Example patterns:**
```bash
# Search for similar API patterns
grep -r "similar_endpoint_pattern" src/

# Search for similar components
find src/components -name "*SimilarComponent*"

# Search for similar models
grep -r "class SimilarModel" src/models/
```

**Document findings:**
```markdown
## Similar Features Found

**1. Similar Feature Name**
- Location: `src/controllers/SimilarController.ts`
- Pattern: [REST endpoint, validation approach, etc.]
- Relevance: [how it relates to new feature]

**2. Another Similar Feature**
- Location: `src/services/SimilarService.ts`
- Pattern: [business logic pattern]
- Relevance: [reusable patterns]
```

---

### 4. Identify Dependencies & Constraints

**Technical Dependencies:**
- External services required
- Database schema changes needed
- New libraries or frameworks
- Infrastructure requirements

**Team Dependencies:**
- Frontend team coordination
- Backend team coordination
- Security review required
- Database admin involvement

**Constraints:**
- Performance requirements
- Security requirements
- Compliance requirements (SOC2, ISO27001)
- Timeline constraints

---

### 5. Clarify Ambiguities

**Check for missing information:**
- Unclear requirements
- Missing acceptance criteria
- Ambiguous technical approaches
- Unspecified edge cases

**Ask user for clarifications:**
```
Need Clarification

The following aspects need clarification before proceeding:

1. **Authentication Approach**
   - Should this use OAuth2 or JWT?
   - Which scopes are required?

2. **Data Model**
   - Should we create a new entity or extend existing?
   - What's the relationship to existing models?

3. **API Design**
   - REST endpoint or GraphQL mutation?
   - Synchronous or asynchronous processing?

Please provide clarifications:
```

**Gather additional context:**
- Design mockups or wireframes
- Performance requirements
- Error handling preferences
- Logging and monitoring needs

---

### 6. Generate Feature Plan

Create `.shipmate/plans/{JIRA-KEY}.json`:

```json
{
  "jira": "IDN-1432",
  "title": "Add granular audit event logging",
  "description": "Implement detailed audit logging for all user actions on sensitive resources",

  "requirements": [
    "Log all CRUD operations on sensitive resources",
    "Include user context (ID, IP, timestamp)",
    "Support filtering by resource type and action",
    "Provide audit trail export functionality"
  ],

  "acceptance_criteria": [
    "Audit events captured for all sensitive operations",
    "Events include all required metadata",
    "Query API supports filtering and pagination",
    "Export generates CSV with all fields"
  ],

  "vision_context": {
    "mission_alignment": "Aligns with compliance and security responsibilities",
    "architecture_fit": "Extends existing event sourcing pattern",
    "domain_concepts": ["AuditEvent", "SensitiveResource", "UserAction"]
  },

  "similar_features": [
    {
      "name": "Activity logging",
      "location": "src/services/ActivityLogger.ts",
      "pattern": "Event sourcing with Kafka",
      "reusability": "Can extend existing event publisher"
    },
    {
      "name": "Compliance reports",
      "location": "src/controllers/ComplianceController.ts",
      "pattern": "Query filtering and CSV export",
      "reusability": "Reuse export utility and filter builder"
    }
  ],

  "dependencies": {
    "technical": [
      "Kafka topic for audit events",
      "New database table for audit_events",
      "CSV export library"
    ],
    "teams": [
      "Database team for schema review",
      "Security team for compliance validation"
    ]
  },

  "constraints": {
    "performance": "Logging must not impact request latency >10ms",
    "security": "PII must be hashed before storage",
    "compliance": "Must meet SOC2 audit requirements",
    "timeline": "Sprint 24 delivery"
  },

  "open_questions": [
    "Should audit events be retained indefinitely or have TTL?",
    "Do we need real-time audit event streaming?",
    "Which resources are classified as 'sensitive'?"
  ],

  "technical_approach": {
    "backend": "Extend EventPublisher with AuditEventPublisher, create AuditEvent model, add filtering API endpoint",
    "database": "New audit_events table with indexes on user_id, resource_type, timestamp",
    "frontend": "Admin UI for viewing and exporting audit logs",
    "testing": "Unit tests for publisher, integration tests for API, E2E tests for admin UI"
  },

  "estimated_complexity": "medium",
  "estimated_effort": "5-8 days",

  "created_at": "2025-11-12T14:30:00Z",
  "created_by": "shipmate-cli",
  "version": "1.0.0"
}
```

---

### 7. Create Human-Readable Plan Summary

Generate `.shipmate/plans/{JIRA-KEY}.md`:

```markdown
# IDN-1432: Add Granular Audit Event Logging

**Created:** 2025-11-12
**Complexity:** Medium
**Estimated Effort:** 5-8 days

---

## Problem Statement

We need detailed audit logging for all user actions on sensitive resources to meet SOC2 compliance requirements and provide security teams with actionable audit trails.

---

## Requirements

Log all CRUD operations on sensitive resources
Include user context (ID, IP, timestamp)
Support filtering by resource type and action
Provide audit trail export functionality

---

## Acceptance Criteria

- [ ] Audit events captured for all sensitive operations
- [ ] Events include all required metadata
- [ ] Query API supports filtering and pagination
- [ ] Export generates CSV with all fields

---

## Vision Alignment

**Mission:** Aligns with compliance and security responsibilities
**Architecture:** Extends existing event sourcing pattern
**Domain:** Uses AuditEvent, SensitiveResource, UserAction concepts

---

## Similar Features

**Activity Logging** (`src/services/ActivityLogger.ts`)
- Pattern: Event sourcing with Kafka
- Reusability: Can extend existing event publisher

**Compliance Reports** (`src/controllers/ComplianceController.ts`)
- Pattern: Query filtering and CSV export
- Reusability: Reuse export utility and filter builder

---

## Technical Approach

**Backend:**
- Extend `EventPublisher` with `AuditEventPublisher`
- Create `AuditEvent` model with required fields
- Add filtering API endpoint: `GET /api/audit-events`
- Implement CSV export: `GET /api/audit-events/export`

**Database:**
- New `audit_events` table
- Indexes on: `user_id`, `resource_type`, `timestamp`
- Retention policy: TBD (see open questions)

**Frontend:**
- Admin UI for viewing audit logs
- Filters for resource type, user, date range
- Export button for CSV download

**Testing:**
- Unit tests for `AuditEventPublisher`
- Integration tests for filtering API
- E2E tests for admin UI workflow

---

## Dependencies

**Technical:**
- Kafka topic for audit events
- New database table and indexes
- CSV export library

**Teams:**
- Database team for schema review
- Security team for compliance validation

---

## Constraints

**Performance:** Logging must not impact request latency >10ms
**Security:** PII must be hashed before storage
**Compliance:** Must meet SOC2 audit requirements
**Timeline:** Sprint 24 delivery

---

## Open Questions

Should audit events be retained indefinitely or have TTL?
Do we need real-time audit event streaming?
Which resources are classified as 'sensitive'?

---

## Next Steps

1. Get answers to open questions
2. Create detailed spec: `shipmate spec --jira=IDN-1432`
3. Break down into tasks: `shipmate create-tasks --jira=IDN-1432`
```

---

### 8. Enrich Jira Ticket

Post plan summary back to Jira:

```
Feature Plan Created

Shipmate has created a detailed feature plan for this ticket.

**Complexity:** Medium
**Estimated Effort:** 5-8 days

**Vision Alignment:** Aligns with compliance and security mission

**Similar Features Found:**
Activity Logging (can reuse event publisher)
Compliance Reports (can reuse export utility)

**Dependencies:**
Database team (schema review)
Security team (compliance validation)

**Open Questions:**
Audit event retention policy?
Real-time streaming needed?
Which resources are 'sensitive'?

Full plan: [link to Confluence/GitHub]
```

---

### 9. Confirm with User

Present plan summary and confirm:

```
Feature plan created successfully!

Created:
- .shipmate/plans/IDN-1432.json (machine-readable)
- .shipmate/plans/IDN-1432.md (human-readable)

Summary:
Complexity: Medium
Estimated: 5-8 days
Similar features: 2 found
Open questions: 3 need answers

Next steps:
  1. Review open questions above
  2. shipmate spec --jira=IDN-1432    # Create detailed spec
```

---

## Configuration

Store plan metadata in `.shipmate/config.yml`:

```yaml
plans:
  IDN-1432:
    created_at: "2025-11-12T14:30:00Z"
    version: "1.0.0"
    status: "active"
    jira_enriched: true
```

---

## Notes

- Plans should be created before specs to ensure proper context
- Plans are input to the spec creation process
- Update plans when requirements change significantly
- Plans help estimate effort and identify risks early
