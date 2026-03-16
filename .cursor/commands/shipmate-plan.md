---
version: 1.0
context:
  - @README.md
  - @.shipmate/workflows/planning/**/*
  - @.shipmate/agents/**/*
---
# Plan Feature

**Command:** `/shipmate-plan` (Cursor) or `@.shipmate/commands/plan.md` (other tools)

**Purpose:** Create a comprehensive feature plan from a Jira ticket, named feature, or description by intelligently gathering context from multiple sources (Jira, Confluence, Epic, linked issues, codebase) and confirming assumptions with the user.

**Agent:** Feature Planner - Feature Planning Specialist (`@.shipmate/agents/feature-planner.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Recommended Model

<!-- TODO: Future enhancement - make model selection configurable via global/project config -->
**Claude Opus 4.6** (claude-opus-4-6) is the recommended model for this command.

This model provides the deep analytical capabilities needed for:
- Thorough requirements gathering and clarification
- Pattern recognition for similar features in the codebase
- Accurate domain knowledge application from vision files
- High-quality plan document generation

If using a different model, results may vary in depth and accuracy.

---

## Overview

This command runs a multi-phase planning process with **intelligent context enrichment**:

1. **Phase 1: Input Detection** - Detect input pattern (Jira ID, named feature, or description)
2. **Phase 2: Vision Check** - Verify product vision exists, warn if missing
3. **Phase 3: Context Loading** - Multi-source context gathering:
   - 3.1 Load vision files
   - 3.2 Fetch Jira ticket details
   - 3.3 **[NEW]** Fetch linked Confluence pages (PRDs, design docs)
   - 3.4 **[NEW]** Fetch Epic context (parent epic, PRD, related tickets)
   - 3.5 **[NEW]** Traverse linked issues (blocks, relates-to, depends-on)
4. **Phase 4: Similar Feature Search** - Find comparable implementations in codebase
5. **Phase 5: Requirements Completeness Assessment** - Score ticket completeness, tailor approach
6. **Phase 6: Assumptions & Clarifying Questions** - Present assumptions, ask targeted questions
7. **Phase 7: Plan Generation** - Create comprehensive plan document
8. **Phase 8: Offer Jira Enrichment** - Optionally post enriched requirements back to Jira

---

## Prerequisites

- Project has been initialized with `shipmate init`
- You are in the project root directory
- (Optional) Jira CLI configured for Jira ticket integration
- (Optional) Confluence CLI configured for documentation lookup

---

## Persona

**Reference:** `@.shipmate/agents/feature-planner.md`

This command activates the **Feature Planner** persona.

**Key traits:**
- **Inquisitive:** Asks clarifying questions proactively - NEVER skips this step
- **Context-aware:** References vision and architecture when available
- **Thorough:** Does not leave ambiguities unaddressed
- **Practical:** Focuses on implementation feasibility
- **Pattern-seeking:** Actively searches for similar features to reference
- **Assumption-explicit:** States assumptions clearly and seeks confirmation

---

## Tool References

**Jira CLI:** `@.shipmate/tools/jira-cli.mdc`
- Complete usage guide for fetching Jira ticket details
- Formatting syntax for Jira wiki markup
- Workflow patterns for ticket management

**Confluence CLI:** `@.shipmate/tools/confluence-cli.mdc`
- Reading linked PRDs and design documents
- Searching for related documentation
- Space navigation and content retrieval

---

## Instructions

### Phase 1: Input Detection

Detect the input pattern from the user's command in **priority order**:

#### Pattern 1: Jira Ticket ID (Highest Priority)
**Format:** `/shipmate-plan PLAT-1234`
**Detection:** Regex pattern `^[A-Z]+-[0-9]+$`

```
User input matches Jira ticket ID pattern.
Feature name will be: {JIRA-KEY} (e.g., PLAT-1234)
```

#### Pattern 2: Named Feature (Second Priority)
**Format:** `/shipmate-plan my-feature add user authentication`
**Detection:** First word is kebab-case, followed by description words

```
User provided explicit feature name: {first-word}
Description: {remaining words}
```

#### Pattern 3: Description Only (Fallback)
**Format:** `/shipmate-plan add user authentication`
**Detection:** Input does not match patterns 1 or 2

```
Generating feature name from description...
Feature name: add-user-authentication
```

**Name Generation Rules:**
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters
- Limit to 50 characters
- Ensure kebab-case format

---

### Phase 2: Vision Availability Check

**IMPORTANT:** Check if product vision exists before proceeding.

```bash
# Check for vision directory
ls .shipmate/project/ 2>/dev/null
```

#### If Vision Does NOT Exist:

**Display Warning (NON-BLOCKING):**
```
-----------------------------------------------------------
WARNING: Product vision not found at .shipmate/project/

For better results, consider running /shipmate-learn first to:
- Build product mission and purpose documentation
- Discover architecture and tech stack
- Extract domain knowledge and terminology

Continuing without vision context...
-----------------------------------------------------------
```

**Proceed anyway** - this is a non-blocking warning.

#### If Vision Exists:

```
Vision found! Loading product context...
```

---

### Phase 3: Context Loading (Multi-Source Enrichment)

#### 3.1 Load Vision Files (if available)

Read and understand the following context files:

**`@.shipmate/project/mission.md`**
- Service purpose and why it exists
- Core responsibilities
- Key users and use cases

**`@.shipmate/project/architecture.md`**
- Service type (API, Frontend, Worker, etc.)
- Tech stack details
- Key architectural patterns

**`@.shipmate/project/domain.md`**
- Domain glossary and concepts
- Core entities and their purposes
- Business rules

**`@.shipmate/project/project-info.md`** (if exists)
- Technology stack
- Available commands
- Project configuration

#### 3.2 Fetch Jira Context (if Jira ticket ID detected)

**Reference:** See `@.shipmate/tools/jira-cli.mdc` for complete jira-cli usage patterns.

**Execute jira-cli command:**
```bash
jira issue view {TICKET-ID} --plain
```

**Extract from Jira response:**
- **Title:** Ticket summary
- **Description:** Full ticket description
- **Acceptance Criteria:** From description or custom field
- **Labels:** All labels (backend, frontend, security, etc.)
- **Epic Link:** Parent epic if any
- **Priority:** Ticket priority level
- **Comments:** Recent comments for additional context
- **Linked Issues:** Related tickets (blocks, is-blocked-by, relates-to)
- **Attachments:** Note any linked Confluence pages or external docs

**Construct Jira URL for traceability:**
```
# Standard Atlassian Cloud URL format
https://{your-org}.atlassian.net/browse/{TICKET-ID}

# Example
https://sailpoint.atlassian.net/browse/PLAT-1234
```

**If jira-cli fails:**
```
Jira fetch failed. Would you like to:
1. Paste the ticket details manually
2. Continue without Jira context

Please respond with your choice or paste the ticket details.
```

#### 3.3 Fetch Linked Confluence Pages (NEW - Intelligent Enrichment)

**Purpose:** Automatically fetch PRDs, design docs, and technical specs linked from the Jira ticket.

**Reference:** See `@.shipmate/tools/confluence-cli.mdc` for confluence-cli usage.

**Step 1: Detect Confluence Links in Jira**

Scan the Jira ticket description and comments for:
- Direct Confluence URLs: `https://*.atlassian.net/wiki/spaces/*/pages/*`
- Page IDs referenced in links
- Mentions of "PRD", "Design Doc", "Tech Spec", "RFC"

**Step 2: Fetch Each Linked Page**

For each detected Confluence link:
```bash
# Extract page ID from URL and fetch content
confluence read {PAGE-ID} --format markdown
```

**Step 3: Summarize Confluence Context**

For each fetched page, extract and summarize:
- **Page Title:** What the document is about
- **Key Requirements:** Any requirements or acceptance criteria mentioned
- **Design Decisions:** Architectural or design decisions documented
- **Open Questions:** Questions or TBDs noted in the document
- **Stakeholders:** People mentioned or assigned

**Display to User:**
```
-----------------------------------------------------------
CONFLUENCE CONTEXT FOUND

I found {N} linked Confluence pages in this Jira ticket:

1. **{Page Title}** (PRD)
   - URL: {confluence-url}
   - Key points: {2-3 bullet summary}

2. **{Page Title}** (Design Doc)
   - URL: {confluence-url}
   - Key points: {2-3 bullet summary}

This context will be incorporated into the feature plan.
-----------------------------------------------------------
```

**If No Confluence Links Found:**
```
No linked Confluence pages detected in the Jira ticket.
Would you like me to search Confluence for related documentation?
(Enter a search term or 'skip' to continue)
```

**If User Provides Search Term:**
```bash
confluence search "{search-term}" --limit 5
```

Present results and ask which (if any) are relevant.

#### 3.4 Fetch Epic Context (NEW - Parent Context Enrichment)

**Purpose:** If the ticket belongs to an Epic, fetch the Epic's context for broader understanding.

**Step 1: Check for Epic Link**

From the Jira response, check if `Epic Link` field is populated.

**Step 2: Fetch Epic Details**
```bash
jira issue view {EPIC-KEY} --plain
```

**Step 3: Extract Epic Context**
- **Epic Summary:** What the epic is trying to achieve
- **Epic Description:** Full context and goals
- **Epic Acceptance Criteria:** Definition of done for the epic
- **Related Tickets:** Other tickets in this epic (for pattern reference)
- **Epic PRD:** Any Confluence links in the epic

**Display to User:**
```
-----------------------------------------------------------
EPIC CONTEXT

This ticket is part of Epic: {EPIC-KEY} - {Epic Title}

Epic Goal: {1-2 sentence summary}

Other tickets in this Epic:
- {TICKET-1}: {summary} (Done)
- {TICKET-2}: {summary} (In Progress)
- {TICKET-3}: {summary} (To Do)

This context helps ensure consistency with the broader initiative.
-----------------------------------------------------------
```

#### 3.5 Traverse Linked Issues (NEW - Dependency Context)

**Purpose:** Understand blockers, dependencies, and related work.

**Step 1: Identify Linked Issues**

From Jira response, extract all linked issues:
- **Blocks:** Issues this ticket blocks
- **Is Blocked By:** Issues blocking this ticket
- **Relates To:** Related issues
- **Duplicates/Is Duplicated By:** Potential duplicate work

**Step 2: Fetch Key Linked Issue Details**

For each linked issue (limit to 5 most relevant):
```bash
jira issue view {LINKED-TICKET} --plain
```

**Step 3: Summarize Dependencies**

```
-----------------------------------------------------------
LINKED ISSUES

Blockers (must be resolved first):
- {TICKET-A}: {summary} - Status: {status}

Related Work (for context):
- {TICKET-B}: {summary} - Status: {status}
  Relevance: {why this is relevant}

This ticket blocks:
- {TICKET-C}: {summary} - Status: {status}
-----------------------------------------------------------
```

---

### Phase 4: Similar Feature Search

Search the codebase for comparable implementations:

#### 4.1 Identify Feature Type

Based on the feature description, identify what type of feature this is:
- API endpoint
- UI component
- Background service
- Data model
- Utility/helper
- Integration

#### 4.2 Search Codebase

Search for:
- Similar API endpoints (same HTTP methods, similar routes)
- Comparable UI components (similar forms, lists, modals)
- Related domain models (similar data structures)
- Existing tests that could serve as templates
- Similar patterns in the codebase

**Document Findings:**
```markdown
## Similar Features Found

1. **[Feature Name]**
   - Location: `src/path/to/feature`
   - Pattern: [what pattern it uses]
   - Reusability: [how we can leverage this]

2. **[Feature Name 2]**
   - Location: `src/path/to/feature2`
   - Pattern: [pattern description]
   - Reusability: [what can be reused]
```

---

### Phase 5: Requirements Completeness Assessment (NEW)

**Purpose:** Assess how well-defined the requirements are and tailor the approach accordingly.

#### 5.1 Score Requirement Completeness

Evaluate the gathered context against these criteria:

| Criterion | Weight | Score (0-2) |
|-----------|--------|-------------|
| Clear problem statement | 20% | 0=missing, 1=vague, 2=clear |
| Defined acceptance criteria | 20% | 0=none, 1=partial, 2=complete |
| Technical approach hints | 15% | 0=none, 1=some, 2=detailed |
| Scope boundaries defined | 15% | 0=unclear, 1=partial, 2=clear |
| Non-functional requirements | 10% | 0=none, 1=some, 2=specified |
| Edge cases considered | 10% | 0=none, 1=some, 2=documented |
| Dependencies identified | 10% | 0=unknown, 1=partial, 2=listed |

**Calculate Completeness Score:**
```
Score = (sum of weighted scores) / (max possible score) * 100
```

#### 5.2 Categorize and Adapt Approach

**Well-Defined (Score 70-100%):**
```
-----------------------------------------------------------
REQUIREMENTS ASSESSMENT: WELL-DEFINED

The requirements for this feature are relatively complete.
I'll confirm a few details and generate the plan.

Strengths:
- {what's well defined}

Minor gaps to address:
- {any small gaps}
-----------------------------------------------------------
```
- Ask 3-5 targeted confirmation questions
- Focus on edge cases and technical nuances

**Partially Defined (Score 40-69%):**
```
-----------------------------------------------------------
REQUIREMENTS ASSESSMENT: NEEDS CLARIFICATION

The requirements have some gaps that need addressing.
I'll make some assumptions based on similar features and best practices,
then confirm them with you.

What's clear:
- {clear items}

What needs clarification:
- {unclear items}
-----------------------------------------------------------
```
- Generate 5-8 clarifying questions with proposed defaults
- Include assumption confirmations

**Poorly Defined (Score 0-39%):**
```
-----------------------------------------------------------
REQUIREMENTS ASSESSMENT: SIGNIFICANT GAPS

This ticket needs substantial requirements gathering before planning.
I'll draft initial requirements based on:
- Similar features in the codebase
- Domain patterns from your product vision
- Industry best practices

Then we'll refine together.
-----------------------------------------------------------
```
- Generate draft requirements for user review
- Ask 8-12 foundational questions
- Offer to help refine the Jira ticket

---

### Phase 6: Assumptions & Clarifying Questions

**CRITICAL:** Present assumptions explicitly and ask clarifying questions BEFORE generating the plan.

#### 6.1 Present Assumptions Summary (NEW)

Before asking questions, explicitly state what you're assuming based on gathered context:

```
-----------------------------------------------------------
ASSUMPTIONS (Please Confirm or Correct)

Based on the Jira ticket, Confluence docs, and codebase analysis, I'm assuming:

SCOPE:
- [ ] This feature is scoped to {specific boundary}
- [ ] Out of scope: {what's excluded}

TECHNICAL APPROACH:
- [ ] We'll follow the pattern used in {similar-feature} at `path/to/file`
- [ ] This will require changes to {components/services}
- [ ] Database: {assumption about schema changes}

REQUIREMENTS:
- [ ] Users affected: {user types}
- [ ] Performance target: {assumed SLA, e.g., <200ms response time}
- [ ] Security: {assumed security requirements}

BASED ON:
- Jira ticket: {TICKET-ID}
- Confluence PRD: {page title}
- Similar feature: {feature-name}

Please review and correct any incorrect assumptions below.
-----------------------------------------------------------
```

#### 6.2 Generate Targeted Questions

Based on the completeness assessment and context gathered, generate **4-10 NUMBERED questions**.

**Question Guidelines:**
- Start each question with a number
- Reference specific context ("Based on the PRD, I see X. Is that still accurate?")
- Propose sensible assumptions with explicit confirmation requests
- Make it easy for users to confirm or provide alternatives
- Include specific suggestions they can say yes/no to

**Required Question Categories:**

1. **Assumption Confirmations** - "I assume X based on Y. Correct?"
2. **Scope Clarification** - What's in/out of scope?
3. **Functional Requirements** - Core user actions and capabilities
4. **Non-Functional Requirements** - Performance, security, reliability
5. **Technical Approach** - Backend, frontend, database considerations
6. **Constraints** - Timeline, technical limitations, compliance
7. **Edge Cases** - Error handling, failure scenarios

**Output Format:**
```
Based on "{feature-name}" and the context gathered, I have some questions:

CONFIRMING ASSUMPTIONS:
1. The PRD mentions {X}. I'm assuming this means {interpretation}. Is that correct?

2. Based on the similar feature at `path/to/file`, I plan to follow the same pattern for {aspect}. Should I deviate in any way?

CLARIFYING REQUIREMENTS:
3. The acceptance criteria mention {Y} but don't specify {detail}. Should we {option A} or {option B}?

4. I notice {observation from codebase/vision}. Does this feature need to {relate to that observation}?

5. Regarding {technical concern}, the epic suggests {approach}. Is this still the preferred direction?

SCOPE & EDGE CASES:
6. What is explicitly OUT of scope for this feature?

7. How should we handle {edge case}? I suggest {approach based on similar features}.

---

**Additional Context Needed:**

Do you have any of the following that would help?
- Design mockups or wireframes
- API contract drafts
- Meeting notes or Slack threads with decisions

---

Please answer the questions above and I'll proceed with creating your feature plan.
```

**STOP and wait for user responses before proceeding.**

#### 6.3 Process User Responses

After receiving user's answers:

1. Update assumptions based on corrections
2. Store the user's answers for documentation
3. Check if any visual assets were mentioned or provided
4. Identify any follow-up questions needed

#### 6.4 Follow-up Questions (if needed)

Generate 1-3 follow-up questions if:
- User corrected major assumptions
- Requirements are still vague
- Technical approach needs clarification
- Scope boundaries are unclear
- User provided partial answers

```
Thank you for those clarifications. A few follow-ups:

1. [Specific follow-up based on corrections]
2. [Another follow-up if needed]

Please provide these additional details, then I'll create your feature plan.
```

**STOP and wait for follow-up responses if questions were asked.**

---

### Phase 7: Plan Generation

#### 7.1 Create Feature Directory Structure

```bash
# Create feature directory
mkdir -p .shipmate/features/{feature-name}/

# Create assets subdirectory
mkdir -p .shipmate/features/{feature-name}/assets/

# Create context subdirectory for source material
mkdir -p .shipmate/features/{feature-name}/context/
```

#### 7.2 Save Context Sources (NEW)

Save the gathered context for traceability:

```bash
# Save Jira context
echo "{jira-content}" > .shipmate/features/{feature-name}/context/jira.md

# Save Confluence context (if fetched)
echo "{confluence-content}" > .shipmate/features/{feature-name}/context/confluence.md

# Save Epic context (if fetched)
echo "{epic-content}" > .shipmate/features/{feature-name}/context/epic.md
```

#### 7.3 Generate plan.md

Create `.shipmate/features/{feature-name}/plan.md` with the following structure:

```markdown
# Feature: {Feature Name}

**Status:** Planning
**Created:** {YYYY-MM-DD}
**Jira:** [{JIRA-KEY}]({jira-browse-url}) (if applicable)
**Epic:** [{EPIC-KEY}]({epic-url}) - {Epic Title} (if applicable)
**Completeness Score:** {X}% at planning start

---

## Context Sources

This plan was created using context from:
- **Jira Ticket:** [{JIRA-KEY}]({url}) - {title}
- **Confluence PRD:** [{page-title}]({url}) (if applicable)
- **Parent Epic:** [{EPIC-KEY}]({url}) (if applicable)
- **Related Tickets:** {list of related tickets} (if applicable)
- **Similar Features:** {list with paths}

---

## Problem Statement

[Clear description of the problem or need this feature addresses, derived from user input, Jira ticket, Confluence docs, and clarifying questions]

---

## Requirements

### Functional Requirements

- [ ] FR-1: [Specific, measurable requirement]
- [ ] FR-2: [Specific, measurable requirement]
- [ ] FR-3: [Specific, measurable requirement]
- [ ] FR-4: [Specific, measurable requirement]

### Non-Functional Requirements

- **Performance:** [specific targets, e.g., "Response time < 200ms for 95th percentile"]
- **Security:** [security requirements, e.g., "All inputs validated and sanitized"]
- **Reliability:** [reliability targets, e.g., "99.9% availability"]
- **Scalability:** [scalability requirements if applicable]
- **Accessibility:** [accessibility requirements if applicable]

---

## Acceptance Criteria

- [ ] AC-1: [Testable, specific criterion with clear pass/fail conditions]
- [ ] AC-2: [Testable, specific criterion with clear pass/fail conditions]
- [ ] AC-3: [Testable, specific criterion with clear pass/fail conditions]
- [ ] AC-4: [Testable, specific criterion with clear pass/fail conditions]

---

## Confirmed Assumptions

The following assumptions were confirmed during planning:

| Assumption | Source | Confirmed By |
|------------|--------|--------------|
| {assumption 1} | {PRD/Jira/Similar Feature} | User on {date} |
| {assumption 2} | {source} | User on {date} |

---

## Vision Alignment

**Mission:** [How this feature aligns with service mission from mission.md]

**Architecture:** [How this fits existing architecture patterns from architecture.md]

**Domain:** [Relevant domain concepts from domain.md: Entity1, Entity2, Concept1]

(Section omitted if vision files do not exist)

---

## Similar Features

1. **[Feature Name]**
   - Location: `path/to/feature`
   - Pattern: [pattern description]
   - Reusability: [what can be reused or referenced]

2. **[Feature Name 2]**
   - Location: `path/to/feature2`
   - Pattern: [pattern description]
   - Reusability: [what can be reused]

(If no similar features found, document: "No similar features found in codebase - new patterns may need to be established")

---

## Technical Approach

**High-Level Strategy:**
[Brief description of recommended implementation approach]

**Backend:**
- [Backend changes needed]
- [API endpoints to create/modify]
- [Services to implement]

**Frontend:**
- [Frontend changes needed]
- [Components to create/modify]
- [State management considerations]

**Database:**
- [Schema changes needed]
- [Migrations required]
- [Data considerations]

---

## Dependencies

### Technical Dependencies
- [Library/package dependency 1]
- [Library/package dependency 2]
- [Service dependency]

### Team Dependencies
- [Team coordination needed]
- [Cross-team dependencies]

### External Dependencies
- [External service integrations]
- [Third-party APIs]

### Blocking Issues
- [{TICKET-X}]({url}): {summary} - must be resolved first

---

## Constraints

- **Performance:** [constraint description]
- **Security:** [constraint description]
- **Compliance:** [constraint description]
- **Timeline:** [deadline or time constraint]
- **Technical:** [technical limitations]

---

## Open Questions

[Questions that still need answers before implementation]

- [ ] OQ-1: [Question that needs answering]
- [ ] OQ-2: [Question that needs answering]

---

## Clarifying Questions & Answers

### Questions Asked
**Q1:** [First question asked]
**A1:** [User's answer]

**Q2:** [Second question asked]
**A2:** [User's answer]

(Continue for all questions asked and answered)

---

## Jira Context

(Include this section only if Jira ticket was used)

**Ticket:** {JIRA-KEY}
**URL:** [{JIRA-KEY}]({jira-browse-url})
**Title:** {Jira title}
**Priority:** {Priority}
**Labels:** {comma-separated labels}
**Epic:** {Epic link if applicable}

**Original Description:**
> {Original Jira description}

---

## Confluence Context

(Include this section only if Confluence pages were fetched)

**PRD:** [{Page Title}]({url})
> {Key excerpts from PRD}

**Design Doc:** [{Page Title}]({url}) (if applicable)
> {Key excerpts}

---

## Next Steps

1. Review this plan and resolve any open questions
2. Add any visual assets to `.shipmate/features/{feature-name}/assets/`
3. Run `/shipmate-spec {feature-name}` to create detailed technical specification
```

---

### Phase 8: Offer Jira Enrichment (NEW)

**Purpose:** Offer to post the enriched requirements back to Jira to improve the ticket quality.

#### 8.1 Present Enrichment Option

```
-----------------------------------------------------------
JIRA ENRICHMENT (Optional)

I can update the Jira ticket with the enriched requirements we developed.
This helps:
- Keep the ticket as the source of truth
- Share refined requirements with the team
- Preserve the planning context

Would you like me to:
1. Add a comment with the refined requirements summary
2. Update the ticket description with enriched requirements
3. Skip - keep changes only in the local plan

(Enter 1, 2, or 3)
-----------------------------------------------------------
```

#### 8.2 Execute Jira Update (if requested)

**Option 1: Add Comment**
```bash
jira issue comment add {TICKET-ID} --body "
## Refined Requirements (via Shipmate Planning)

### Problem Statement
{problem statement}

### Acceptance Criteria
{acceptance criteria list}

### Technical Approach
{brief technical approach}

### Confirmed Assumptions
{assumptions list}

---
_Generated by Shipmate planning session on {date}_
_Full plan: .shipmate/features/{feature-name}/plan.md_
"
```

**Option 2: Update Description**
```bash
jira issue edit {TICKET-ID} --description "
{original description}

---

## Refined Requirements (via Shipmate)

### Acceptance Criteria
{acceptance criteria}

### Technical Approach
{technical approach summary}

### Dependencies
{dependencies list}

### Open Questions
{open questions}

---
_Enriched via Shipmate planning on {date}_
"
```

---

### Phase 9: Confirm Completion

Present summary to user:

```
Feature plan created successfully!

Feature: {feature-name}
Location: .shipmate/features/{feature-name}/plan.md

Context Gathered:
- Jira ticket: {JIRA-KEY}
- Confluence pages: {count} fetched
- Epic context: {yes/no}
- Linked issues: {count} analyzed
- Similar features: {count} found

Requirements Assessment:
- Initial completeness: {X}%
- After clarification: {Y}%
- Assumptions confirmed: {count}
- Questions answered: {count}

Plan Summary:
- Functional Requirements: {count} defined
- Non-Functional Requirements: {count} categories
- Acceptance Criteria: {count} testable criteria
- Open Questions: {count} need resolution

Created:
- .shipmate/features/{feature-name}/plan.md
- .shipmate/features/{feature-name}/context/ (source material)
- .shipmate/features/{feature-name}/assets/ (for visual assets)

{If Jira updated: "Jira ticket {JIRA-KEY} updated with refined requirements."}

---

Next: Create specs for "{feature-name}" by running `/shipmate-spec {feature-name}`
```

---

## Quality Checklist

Before completing, verify:
- [ ] Input pattern correctly detected (Jira ID, named feature, or description)
- [ ] Vision warning displayed if vision files missing
- [ ] Jira context fetched (if Jira ticket ID provided)
- [ ] Confluence links detected and fetched (if present)
- [ ] Epic context fetched (if ticket has epic link)
- [ ] Linked issues analyzed for dependencies
- [ ] Requirements completeness assessed and scored
- [ ] Assumptions explicitly stated and confirmed
- [ ] At least 4-10 clarifying questions asked before plan generation
- [ ] User responses documented in plan
- [ ] All functional requirements are specific and measurable
- [ ] All acceptance criteria are testable with clear pass/fail conditions
- [ ] Technical approach is defined (even if high-level)
- [ ] Dependencies identified and documented
- [ ] Open questions documented for follow-up
- [ ] Similar features searched and documented
- [ ] Vision alignment documented (if vision exists)
- [ ] Feature directory structure created
- [ ] Context sources saved for traceability
- [ ] Jira enrichment offered
- [ ] Continuation prompt displayed

---

## Troubleshooting

### Jira CLI not configured
```
Error: jira command not found or not configured

Solutions:
1. Install jira-cli: brew install ankitpokhrel/jira-cli/jira-cli
2. Configure credentials: jira init
3. Or continue without Jira - paste ticket details manually

Reference: @.shipmate/tools/jira-cli.mdc for complete setup guide
```

### Confluence CLI not configured
```
Error: confluence command not found or not configured

Solutions:
1. Install confluence-cli (see setup guide)
2. Configure environment variables (CONFLUENCE_DOMAIN, CONFLUENCE_API_TOKEN, etc.)
3. Or continue without Confluence - paste relevant docs manually

Reference: @.shipmate/tools/confluence-cli.mdc for complete setup guide
```

### Vision files not found
- This is a non-blocking warning
- Plan will be created without vision alignment section
- Recommend running `/shipmate-learn` after plan is created

### No similar features found
- This is okay for novel features
- Document that new patterns may need to be established
- Consider this when estimating implementation effort

### Requirements are too vague (Completeness < 40%)
- System will draft initial requirements for review
- Ask foundational questions to build understanding
- Offer to help improve the Jira ticket
- May require multiple clarification rounds

### Confluence page not accessible
- Check permissions for the linked page
- Ask user to paste relevant content manually
- Note the gap in the plan

### Epic context unavailable
- Proceed without epic context
- Note that broader initiative context is missing
- Suggest checking with PM/tech lead

### User provides incomplete answers
- Ask targeted follow-up questions
- Do not assume - always clarify
- Document any remaining ambiguities as open questions

---

## Examples

### Good Assumption Statement
```
Based on the PRD section "Performance Requirements", I assume we need
sub-200ms response times for the API. The similar feature at
`src/services/UserService.ts` achieves 150ms average. Is this target correct?
```

### Bad Assumption Statement
```
I assume this needs to be fast.
```

### Good Functional Requirement
```markdown
- [ ] FR-1: System shall log all CRUD operations on User entities including user_id, action, IP address, and timestamp with retention of 90 days
```

### Bad Functional Requirement
```markdown
- [ ] FR-1: Add logging
```

### Good Acceptance Criterion
```markdown
- [ ] AC-1: When admin filters audit logs by date range, only events within that range are displayed with pagination (20 items per page)
```

### Bad Acceptance Criterion
```markdown
- [ ] AC-1: Filtering works
```

### Good Clarifying Question
```
1. The PRD mentions "real-time updates" but doesn't specify the mechanism.
   Based on our existing WebSocket infrastructure (see `src/services/WebSocketService.ts`),
   I assume we'll use the same pattern. Should we use WebSockets, or would
   Server-Sent Events be preferred for this use case?
```

### Bad Clarifying Question
```
1. How should we do updates?
```

---

## Input Pattern Examples

### Pattern 1: Jira Ticket ID
```
User: /shipmate-plan PLAT-1234
Result: Feature name = PLAT-1234, fetches Jira + Confluence + Epic context
```

### Pattern 2: Named Feature
```
User: /shipmate-plan user-auth add user authentication with OAuth2
Result: Feature name = user-auth, description = "add user authentication with OAuth2"
```

### Pattern 3: Description Only
```
User: /shipmate-plan add user authentication with OAuth2
Result: Feature name = add-user-authentication-with-oauth2 (auto-generated)
```

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
