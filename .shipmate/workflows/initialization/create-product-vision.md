# Create Product Vision

**Purpose:** One-time initialization to understand the product/service and create comprehensive context for AI-assisted development.

**Command:** `shipmate init`

---

## Objective

Scan the codebase and create comprehensive product vision context in `.shipmate/project/` that provides:
- Service mission and purpose
- Architecture overview
- Domain terminology and concepts
- Feature roadmap

---

## Process

### 1. Scan Codebase

Analyze the repository to understand:

**Service Identity:**
- Read `package.json`, `pom.xml`, or equivalent for service name and description
- Check `README.md` for project overview
- Review `docs/` directory for documentation

**Architecture Patterns:**
- Detect service type (REST API, microservice, frontend app, background worker)
- Identify main technologies and frameworks
- Map directory structure and organization patterns

**Existing Features:**
- List API endpoints (from controllers, routes)
- Catalog UI components (from components/, pages/)
- Identify domain models (from models/, entities/, types/)
- Map data schemas (from migrations/, schemas/)

**Dependencies & Integrations:**
- External services called
- Internal services dependencies
- Third-party libraries and their purposes

---

### 2. Extract Domain Knowledge

**Business Domain:**
- Key business concepts from model names
- Domain terminology from types, interfaces, comments
- Business rules from validation logic

**Entity Relationships:**
- Core entities and their relationships
- Data flow patterns
- Common workflows

**Patterns & Conventions:**
- Naming conventions
- Code organization patterns
- Error handling approaches
- Testing strategies

---

### 3. Create Vision Files

Create `.shipmate/project/` directory with:

#### **`mission.md`**
```markdown
# {Service Name} Mission

## Purpose
[What this service does and why it exists - extracted from README/docs]

## Core Responsibilities
- [Responsibility 1 - from analyzing main features]
- [Responsibility 2]
- [Responsibility 3]

## Key Users
- [User type 1]: [use case - from docs or inferred]
- [User type 2]: [use case]

## Success Criteria
[How we measure success - if available in docs]
```

#### **`architecture.md`**
```markdown
# Architecture Overview

## Service Type
[API Service | Frontend App | Background Worker | Microservice]

## Tech Stack

**Backend:**
- Language: [Java, Go, Python, Node.js, etc.]
- Framework: [Spring Boot, Express, FastAPI, etc.]
- Database: [PostgreSQL, MongoDB, etc.]
- ORM/Query: [Hibernate, TypeORM, SQLAlchemy, etc.]

**Frontend:** (if applicable)
- Framework: [Angular, React, Vue]
- Language: [TypeScript, JavaScript]
- State Management: [NgRx, Redux, etc.]
- UI Library: [Material, Bootstrap, etc.]

**Infrastructure:**
- Containerization: [Docker]
- Orchestration: [Kubernetes]
- CI/CD: [Jenkins, CloudBees, GitLab CI]
- Deployment: [Blue-Green, Canary, Rolling]

## System Architecture

```
[ASCII diagram or description of system components]
```

## Key Patterns

**API Patterns:**
- [REST, GraphQL, gRPC, etc.]
- [Authentication approach]
- [Error handling strategy]

**Data Patterns:**
- [Repository pattern, Active Record, etc.]
- [Caching strategy]
- [Transaction management]

**Code Organization:**
- [Layered architecture, Clean architecture, etc.]
- [Module structure]
- [Dependency injection approach]
```

#### **`domain.md`**
```markdown
# Domain Glossary

## Core Concepts

**[Concept 1]**
- Definition: [from code/docs]
- Related entities: [links]
- Key operations: [common actions]

**[Concept 2]**
- Definition: [...]
- Related entities: [...]
- Key operations: [...]

## Key Entities

**[Entity 1]**
- Purpose: [what it represents]
- Attributes: [key fields]
- Relationships: [to other entities]
- Location: `src/models/Entity1.ts`

**[Entity 2]**
- Purpose: [...]
- Attributes: [...]
- Relationships: [...]
- Location: `src/models/Entity2.ts`

## Business Rules

- [Rule 1 - extracted from validation logic]
- [Rule 2 - extracted from business logic]
- [Rule 3 - extracted from constraints]

## Common Workflows

**[Workflow 1]**
1. Step 1
2. Step 2
3. Step 3

**[Workflow 2]**
1. Step 1
2. Step 2
```

#### **`roadmap.md`** (optional)
```markdown
# Feature Roadmap

## Completed Features
- [Feature 1] - [completion date]
- [Feature 2] - [completion date]

## In Progress
- [Feature 3] - [Jira epic link]
- [Feature 4] - [Jira epic link]

## Planned
- [Feature 5] - [description]
- [Feature 6] - [description]

## Technical Debt
- [Debt item 1] - [impact]
- [Debt item 2] - [impact]
```

---

### 4. Validate with User

Present findings to user:

```
Product Vision Summary

Service: [name]
Type: [API Service/Frontend App/etc.]
Tech Stack: [main technologies]

Found [X] API endpoints
Found [Y] domain models
Found [Z] key features

Key domain concepts:
- [Concept 1]
- [Concept 2]
- [Concept 3]

Does this look accurate? Any corrections or additions?
```

Allow user to:
- Confirm and proceed
- Edit any section
- Add missing information

---

### 5. Finalize

Save all vision files to `.shipmate/project/` and confirm:

```
Product vision created successfully!

Created:
- .shipmate/project/mission.md
- .shipmate/project/architecture.md
- .shipmate/project/domain.md
- .shipmate/project/roadmap.md

Your vision context is now available for all Shipmate operations.

Next steps:
  shipmate plan-feature --jira=IDN-1432    # Plan your first feature
```

---

## Configuration

Project metadata is stored in `.shipmate/config.yml` under the `project:` key:

```yaml
project:
  name: "identity-api"
  type: "API Service"
  created_at: "2025-11-12T10:30:00Z"
  initialized_by: "user@example.com"
  # Detection metadata
  detected_frameworks: ["Next.js", "TypeScript"]
  detected_patterns: ["REST API", "Repository Pattern"]
  generated: true
  last_updated: "2025-11-12T10:30:00Z"
  scan_file_count: 150
```

**Note:** The `vision:` key is deprecated. All project metadata should use the `project:` key.

---

## Notes

- Vision should be updated when major architectural changes occur
- Domain glossary should grow as new concepts are introduced
- Roadmap should be kept in sync with Jira epics
- This is a living document - encourage teams to refine it over time
