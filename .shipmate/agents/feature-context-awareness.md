# Feature Context Awareness

**Purpose:** Guide AI agents to understand and leverage feature documentation in `.shipmate/features/`

**Applies To:** All AI agents and developer workflows

---

## Cursor Rule Format

When converted to `.cursor/rules/shipmate-feature-context.md`:

```markdown
---
description: Feature context awareness and documentation structure
applyWhen: "always - when continuing work, referencing implemented features, or starting any development task"
priority: critical
---
```

---

## Core Principle

**All feature work is documented in `.shipmate/features/{FEATURE-NAME}/`**

When a developer mentions:
- "Continue working on {feature}"
- "What did we implement for {feature}?"
- "Resume work on {JIRA-KEY}"
- "Where did we leave off with {feature}?"
- "What's the current state of {feature}?"

**ALWAYS check `.shipmate/features/` first** before asking questions or making assumptions.

---

## Feature Directory Structure

Each feature has a dedicated directory:

```
.shipmate/features/{FEATURE-NAME}/
├── requirements.md          # Complete feature specification
├── specification.md         # Detailed technical design
├── tasks.md                 # Task breakdown with progress tracking
├── verification.md          # Quality criteria and validation
├── IMPLEMENTATION_SUMMARY.md # Session notes and decisions made
├── PHASE{N}_TEST_REPORT.md  # Testing results and metrics
└── assets/                  # Mockups, diagrams, screenshots
```

---

## What Each File Contains

### requirements.md
- **Purpose:** Feature requirements and acceptance criteria
- **Content:** User stories, business goals, functional requirements
- **Use When:** Understanding what to build and why
- **Key Sections:** Overview, User Stories, Acceptance Criteria, Constraints

### specification.md
- **Purpose:** Technical design and implementation approach
- **Content:** Architecture, API contracts, data models, workflows
- **Use When:** Understanding how to build the feature
- **Key Sections:** Architecture, Data Flow, API Design, Security Considerations

### tasks.md
- **Purpose:** Granular task breakdown with progress tracking
- **Content:** Individual tasks, status (pending/in_progress/completed), estimates
- **Use When:** Checking what's done, what's next, tracking progress
- **Key Sections:** Completion Summary, Task Details, Dependencies
- **Format:**
  ```markdown
  - [x] Completed task description
  - [ ] Pending task description
  - [ ] 🚧 In Progress task description
  ```

### verification.md
- **Purpose:** Quality gates and verification criteria
- **Content:** Test requirements, performance benchmarks, security checks
- **Use When:** Ensuring quality and completeness before shipping
- **Key Sections:** Functional Tests, Performance Tests, Security Validation

### IMPLEMENTATION_SUMMARY.md
- **Purpose:** Running log of implementation sessions
- **Content:** Architecture decisions, code written, challenges faced, next steps
- **Use When:** Understanding implementation history and context
- **Key Sections:** Session Date, Files Implemented, Architecture Decisions, Metrics
- **Pattern:** Updated after each implementation session

### PHASE{N}_TEST_REPORT.md
- **Purpose:** Testing results and quality metrics
- **Content:** Test execution results, coverage metrics, bugs found
- **Use When:** Verifying implementation quality and readiness
- **Key Sections:** Test Results, Coverage Metrics, Known Issues

### assets/
- **Purpose:** Visual aids and supporting materials
- **Content:** Mockups, architecture diagrams, flow charts, screenshots
- **Use When:** Understanding UI/UX design or system architecture
- **Formats:** PNG, JPG, SVG, Markdown diagrams

---

## Required Workflow: Feature Context Loading

### When Starting Any Development Task

**Step 1: Identify the Feature**
```bash
# Check if feature directory exists
ls -la .shipmate/features/
```

**Step 2: Load Current State**
```bash
# Read task list to see what's done and what's next
cat .shipmate/features/{FEATURE-NAME}/tasks.md

# Read implementation summary for recent decisions
cat .shipmate/features/{FEATURE-NAME}/IMPLEMENTATION_SUMMARY.md
```

**Step 3: Load Technical Context**
```bash
# Read specification for architecture and design
cat .shipmate/features/{FEATURE-NAME}/specification.md

# Review requirements for acceptance criteria
cat .shipmate/features/{FEATURE-NAME}/requirements.md
```

**Step 4: Understand Current Status**
- Check `tasks.md` for completion percentage
- Review `IMPLEMENTATION_SUMMARY.md` for "Next Steps" section
- Check test reports for quality status

### When Developer Says "Continue working on X"

**REQUIRED ACTIONS:**
1. ✅ Read `.shipmate/features/X/tasks.md` → Find pending tasks
2. ✅ Read `.shipmate/features/X/IMPLEMENTATION_SUMMARY.md` → Understand what was last done
3. ✅ Read `.shipmate/features/X/specification.md` → Load technical context
4. ✅ Review code files mentioned in IMPLEMENTATION_SUMMARY.md → See actual implementation
5. ✅ Identify next task from tasks.md → Start work

**DO NOT:**
- ❌ Ask "What do you want to work on?" when feature docs exist
- ❌ Request specification when it's in requirements.md
- ❌ Ask for architecture when it's in specification.md
- ❌ Ignore completed tasks in tasks.md

### When Developer References "Something We Implemented"

**REQUIRED ACTIONS:**
1. ✅ Search `.shipmate/features/*/IMPLEMENTATION_SUMMARY.md` for references
2. ✅ Check `tasks.md` for completed tasks related to topic
3. ✅ Review `specification.md` for technical approach
4. ✅ Present findings: "Based on {FILE}, we implemented {SUMMARY}"

---

## Integration with Other Personas

### For All Personas

**Context Loading Priority:**
1. **Feature Docs** (.shipmate/features/{FEATURE-NAME}/) - Feature-specific context
2. **Vision Docs** (.shipmate/project/) - Project-wide goals and architecture
3. **Standards** (.shipmate/standards/) - Coding and security standards
4. **Workflows** (.shipmate/workflows/) - Process templates

### Persona-Specific Usage

**Implementer:**
- Primary: `tasks.md` (what to build next)
- Secondary: `specification.md` (how to build it)
- Reference: `requirements.md` (why we're building it)

**Verifier:**
- Primary: `verification.md` (what to test)
- Secondary: `PHASE{N}_TEST_REPORT.md` (previous test results)
- Reference: `requirements.md` (acceptance criteria)

**Feature Planner:**
- Primary: `requirements.md` (feature scope)
- Secondary: `tasks.md` (breakdown structure)
- Creates: New feature directories when planning new work

**Spec Creator:**
- Primary: `requirements.md` (what to specify)
- Creates: `specification.md` (technical design)
- Updates: `tasks.md` (based on technical complexity)

**Vision Builder:**
- Primary: `.shipmate/project/` (project vision)
- Informs: `requirements.md` (align features with vision)
- Reviews: Multiple feature directories (consistency check)

---

## Examples

### Example 1: Resume Feature Work

**Developer:** "Let's continue working on the authentication feature"

**AI Agent Response:**
```
✅ Loading context from .shipmate/features/AUTH-123/

📋 Task Status (from tasks.md):
- Completed: 15/20 tasks (75%)
- Last completed: "Implement JWT token refresh endpoint"
- Next pending: "Add rate limiting to login endpoint"

📝 Last Session (from IMPLEMENTATION_SUMMARY.md):
- Date: 2025-11-13
- Implemented: JWT refresh endpoint in src/auth/refresh.ts
- Next: Rate limiting for security

🎯 Resuming work on task: "Add rate limiting to login endpoint"
Let me start by reading the current login endpoint...
```

### Example 2: Reference Previous Implementation

**Developer:** "How did we implement the user profile API?"

**AI Agent Response:**
```
✅ Searching .shipmate/features/ for user profile implementation...

📁 Found: .shipmate/features/USER-PROFILE/

📋 Implementation Details (from IMPLEMENTATION_SUMMARY.md):
- API endpoint: GET /api/v1/users/:id/profile
- Implementation: src/api/users/profile.controller.ts (125 lines)
- Authentication: JWT middleware required
- Data source: PostgreSQL users table + profile_data JSONB
- Validation: Zod schema in src/validators/profile.schema.ts
- Tests: test/api/profile.test.ts (85% coverage)

🏗️ Architecture (from specification.md):
- RESTful design with resource-based URLs
- JSONB for flexible profile data storage
- Caching layer with Redis (5 min TTL)
- Rate limit: 100 requests/minute per user

Would you like me to show you the specific code or explain any particular aspect?
```

### Example 3: Start New Feature

**Developer:** "Let's implement the notification system"

**AI Agent Response:**
```
✅ Checking for existing feature documentation...

📁 Found: .shipmate/features/NOTIFICATIONS/

📋 Current Status (from tasks.md):
- Status: Planning Phase Complete
- Completed: Requirements, Specification, Task Breakdown
- Ready for implementation: Yes

🎯 Next Steps (from IMPLEMENTATION_SUMMARY.md):
1. Implement notification service (6 tasks)
2. Create database schema (2 tasks)
3. Build API endpoints (4 tasks)
4. Add email provider integration (3 tasks)

📖 Technical Approach (from specification.md):
- Event-driven architecture with message queue
- Postgres for notification storage
- SendGrid for email delivery
- WebSocket for real-time push

Shall we start with task 1: "Implement NotificationService base class"?
```

---

## Anti-Patterns to Avoid

### ❌ Wrong: Ignoring Feature Context
```
Developer: "Continue the login feature"
AI: "Sure! What should we work on?"  # BAD - should load tasks.md
```

### ✅ Correct: Loading Feature Context
```
Developer: "Continue the login feature"
AI: "Loading .shipmate/features/LOGIN/tasks.md...
     Next task: Implement password reset flow.
     Shall I start with the email template?"  # GOOD - loaded context
```

### ❌ Wrong: Asking for Existing Info
```
Developer: "What's the database schema for users?"
AI: "Can you provide the schema details?"  # BAD - should check specification.md
```

### ✅ Correct: Referencing Documentation
```
Developer: "What's the database schema for users?"
AI: "From .shipmate/features/USER-MGMT/specification.md:
     users table has: id, email, hashed_password, created_at, updated_at"  # GOOD
```

---

## Bidirectional Documentation Sync

### When User Provides Corrections

**CRITICAL:** Feature documentation must stay in sync with implementation. When users correct you during development:

1. **Apply the correction** in code immediately
2. **Update the relevant documentation:**
   - `specification.md` / `requirements.md` - If technical design changes
   - `tasks.md` - If tasks need to be added, removed, or modified
   - `IMPLEMENTATION_SUMMARY.md` - Document the correction and rationale

### Documentation Update Template

Add to `IMPLEMENTATION_SUMMARY.md`:
```markdown
## User Corrections

**[Date] Correction:**
- Original: [what the documentation said]
- Correction: [what the user clarified]
- Updated: [list of files changed]
- Rationale: [why this better reflects intent]
```

### Why This Matters

Keeping documentation synchronized ensures:
- **Future sessions** have accurate context
- **Other team members** understand the actual design
- **Feature docs** remain a reliable source of truth
- **Implementation decisions** are traceable

### Example: Handling a Correction

**User says:** "We should use WebSocket, not polling, for notifications"

**AI Agent Response:**
```
✅ Got it! Switching to WebSocket for real-time notifications.

📝 Updating feature documentation:
- specification.md: Changed architecture to WebSocket
- tasks.md: Updated "Implement polling" → "Implement WebSocket connection"
- IMPLEMENTATION_SUMMARY.md: Documented user correction

Continuing with WebSocket implementation...
```

---

## Quality Checklist

Before marking any task complete, verify:

- [ ] Relevant `.shipmate/features/{FEATURE}/` files have been consulted
- [ ] Task status updated in `tasks.md`
- [ ] Implementation notes added to `IMPLEMENTATION_SUMMARY.md`
- [ ] **User corrections reflected** in all affected documentation
- [ ] Tests written as specified in `verification.md`
- [ ] Code follows standards from `.shipmate/standards/`
- [ ] Architecture aligns with `specification.md`
- [ ] Acceptance criteria from `requirements.md` are met

---

## References

- **Feature Directory**: `.shipmate/features/`
- **Vision Documents**: `.shipmate/project/`
- **Coding Standards**: `.shipmate/standards/`
- **Process Workflows**: `.shipmate/workflows/`
- **Tools Documentation**: `.shipmate/tools/`
