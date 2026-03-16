---
context:
  - @.shipmate/docs/jira-access-for-shipmate.md
  - @.shipmate/tools/jira-cli.mdc
---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.
# Release Preflight

**Command:** `/preflight-deployment` (Cursor) or point agent at this command file (other tools).

**Agent:** Verifier - Quality Assurance & Verification Specialist (`@.shipmate/agents/verifier.md`)

Config paths in this file are relative to the **project root** (the repo where the user runs the command). If Shipmate uses different doc paths (e.g. `docs/` at repo root), update the `context` block above (e.g. `@docs/jira-access-for-shipmate.md`, `@docs/jira-cli.mdc` or equivalent).

**Quick start:** Run `/preflight-deployment <JIRA-KEY>`. **Jira CLI** required (see `@.shipmate/docs/jira-access-for-shipmate.md`); no config required. To avoid repeated run-command prompts, add `jira issue view` and `jira issue list` to your Cursor allowlist; the agent runs these directly. Optional: `gh` for GitHub; fallback: paste ticket. Optional config: `preflight-deployment.json` or `preflight-deployment.local.json` (see Configuration).

Answer "Is this safe to deploy?" for a **release ticket** using **Jira**. Designed for teams that use **Jira** for release verification (release ticket status, Blocking links, Contains Issues, comments on linked tickets). The verdict is based only on Jira checks; GitHub/CI are optional and reported as N/A. Adapt the Jira project key and issue-type names in the JQL to your project if needed.

**Process context:** The [Binary Deployment Process Guide — Release Engineer Role](https://sailpoint.atlassian.net/wiki/spaces/ISC/pages/2791178264/Binary+Deployment+Process+Guide#Release-Engineer-Role) (ISC space) defines four steps: **Identify** what to release, **Review each deployment**, **Monitor** the deployment, and **Verify** the deployment. Under "Review each deployment" it requires: automated tests passed; additional verification defined for the component (e.g. E2E not in pipeline); for **Medium Deploy Risk** — **post-deployment verification steps must be defined** (if not, block the release); for **High Deploy Risk** — **additional steps prescribed by CAB must be followed**. After deployment, evidence of post-deployment verification is posted as a **comment on the deployment ticket**. This command integrates that by default: **Check 6** reads deploy risk from the release and every linked ticket; when any are Medium or High the verdict is **CONDITIONAL** and the agent asks **one grouped question** (lists all Medium tickets and all High tickets, one prompt) and records answers in the report so the Release Engineer can satisfy the guide and later post evidence to the ticket.

## Scope

**What this command does (all verification in scope):**

- **Check 0 — No other active Deployment (same service):** Verifies that no other Deployment ticket for the same service is in active rollout (one-per-service rule); uses Jira search by project, issue type, and summary.
- **Check 1 — Release ticket status:** Verifies the release (deployment) ticket is in a valid state for the transition (e.g. Approval Ready, In Pre-Prod High, or Done/Prod) and not blocked (e.g. not In Progress, Open, Blocked).
- **Check 2 — AC/PR/CI/Branch:** N/A (not evaluated in this report; reserved for future CI/PR integration). Include in the checks table so numbering is continuous (0–6) and the gap does not look like an oversight.
- **Check 3 — Blocking links:** Verifies the release ticket has no open blocking links (or blockers are done).
- **Check 4 — Contains Issues readiness:** Verifies each linked ticket under "Contains Issues" either (a) has status In Prod (no comment required) or (b) has at least one comment that counts as a deployment-readiness signal for the current transition (Approval Ready → In Pre-Prod High, or In Pre-Prod High → Prod). Uses transition context and optional **reserved readiness keywords** (config `reservedReadinessKeywords`): a comment containing one of those phrases counts as explicit readiness.
- **Check 5 — Bake time and deployment window (when applicable):** When the release ticket is in a **mid-rollout** state (e.g. In Pre-Prod High), verifies (1) a comment on the **release ticket** from the same Jira automation indicates **bake time complete** for the relevant scope, and (2) **deployment window**: current time is inside the window (from automated Jira scope-config comment or from config) or there is no "outside of deployment window" indication. When status is Approval Ready or Done, Check 5 is N/A.
- **Check 6 — Deploy risk verification:** Reads deploy risk from the **release ticket** and **each linked ticket** (Contains Issues) using the configured or built-in field name (`deploy-risk`). If any are Medium or High, verdict is **CONDITIONAL** and the report lists them by risk level; the agent then asks **one grouped question** (Medium: post-deployment steps defined + additional verification; High: CAB steps and evidence) and records answers in the report. Teams that do not use deploy risk: set `deployRiskFieldName` to `null` in config to disable.

**Out of scope (reported as N/A, not used for verdict):** Acceptance criteria, PR/reviews, CI, and branch/target are **not** evaluated; they are shown as one combined N/A row.

- **Use when:** Jira deployment tickets with **Blocking links** and **Contains Issues** (or equivalent). Linked tickets can be from **any** project (cross-project). **Project key:** Used only for "other active Deployment" JQL. Default = segment before first hyphen of ticket key; no config required. If board is in a different project, user can pass project key in chat; optionally ask to save to `.shipmate/config/preflight-deployment.local.json` (gitignored). Do not prompt every time. **Deploy risk** is integrated by default (built-in field name); one grouped interactive ask when any Medium/High. To disable: `deployRiskFieldName: null`. To skip prompts but keep report: `skipDeployRiskPrompts: true`.

## Inputs

- **Jira ticket** (required): The **release ticket** — key or browse link. This ticket may have **Contains Issues** (linked child tickets); readiness is also evaluated from comments on those linked tickets.
  - **Ticket key:** e.g. `PLTWRKFLW-11386`.
  - **Ticket link:** e.g. `https://sailpoint.atlassian.net/browse/PLTWRKFLW-11386`. Extract the key from the path (segment after `/browse/`).
  - Examples: `/preflight-deployment PLTWRKFLW-11386` or `/preflight-deployment https://sailpoint.atlassian.net/browse/PLTWRKFLW-11386`.
- **Branch or release ref** (optional): e.g. `main`, `release/1.2`. Default: current git branch, then `main`.

## Configuration (optional)

No config required. **Precedence:** `preflight-deployment.local.json` over `preflight-deployment.json` over built-in. Agent reads config when evaluating checks. **Post summary:** Offer at end of report; if NOT READY/CONDITIONAL, confirm before posting. **Deployment window:** Prefer Jira automation comment; else `deploymentWindows` in config; else scan for "Outside of deployment window".

| Key | Purpose | Default |
|-----|---------|---------|
| `jiraProjectKeyOverride` | Project for "other active Deployment" JQL | From ticket key |
| `postSummaryToJira` | When true, the combined post-report prompt includes options 3 (Summary + post to Jira) and 5 (Audit trail + summary + post to Jira). When false, offer 4 options only (audit trail, summary in chat, both, none). | `false` |
| `deploymentWindows` | Fallback window by scope (timezone, days, start, end) | None |
| `issueTypeDeployment` | Issue type name in JQL | `"Deployment"` |
| `statusNames` | Map: approvalReady, inPreProdHigh, inProd, notReleased | Built-in |
| `reservedReadinessKeywords` | Comment phrases that count as explicit readiness. Example: `["[preflight]", "deployment-readiness", "preflight-verification"]` | Built-in list in command |
| `deployRiskFieldName` | Jira custom field name for deploy risk (lowercase-hyphenated, e.g. `deploy-risk`). Read from **release ticket** and **each linked ticket** (Contains Issues). Used for Check 6 and report. See `@.shipmate/tools/jira-cli.mdc` (Deploy Risk: Low, Medium, High). | `"deploy-risk"` (built-in); set to `null` or omit in config to disable deploy-risk verification |
| `skipDeployRiskPrompts` | When true, do not ask interactive questions for Medium/High; report still shows deploy risk and lists, verdict still CONDITIONAL when any Medium/High. Use when evidence is recorded elsewhere. | `false` |

**Options:** One-time = pass project key in chat. Local = `preflight-deployment.local.json` (gitignored). Repo = `preflight-deployment.json` committed. Example local: `{"jiraProjectKeyOverride": "IDNCONDEPL"}`.

## Implementation and usage flow

**Implementation:** The **agent** runs `jira issue view` and `jira issue list` (Phase 1), parses the output (including Jira custom fields such as deploy-risk), then (1) uses built-in `deploy-risk` (or config `deployRiskFieldName`) to parse deploy risk from the release ticket and from each linked ticket in Batch 2 output, (2) aggregates into Medium list and High list (release + linked tickets), (3) when any Medium/High, sets Check 6 Conditional and verdict CONDITIONAL, (4) asks **one grouped question** (unless `skipDeployRiskPrompts: true`), (5) records answers in section 10. All specified in this command file.

**Usage flow — default (deploy risk enabled, no skip):** User runs `/preflight-deployment <JIRA-KEY>`. Agent fetches data, evaluates Phase 2 (including Check 6 from release + linked deploy risk). If **no Medium/High:** full report with section 10 showing deploy risk and "No Medium/High; Check 6 Pass." If **any Medium or High:** verdict CONDITIONAL; report includes section 10 with **Medium deploy risk (tickets):** [list] and **High deploy risk (tickets):** [list]; agent asks **one** combined question (both risk levels in a single message); user replies once; agent records answers in section 10 and completes report; optionally post to Jira. So at most **one round** of Q&A regardless of how many Medium/High tickets.

**Usage flow — deploy risk disabled** (`deployRiskFieldName: null` in config): Same as before deploy-risk integration: no Check 6, no section 10 deploy-risk lists, no prompts. Verdict from Checks 0–5 only.

**Usage flow — skip prompts only** (`skipDeployRiskPrompts: true`): Deploy risk still read and reported (section 10 with Medium/High lists); Check 6 still Conditional when any Medium/High and verdict CONDITIONAL; no interactive ask. Use when evidence is recorded elsewhere (e.g. Jira comments) and the report is for visibility only.

**Config location:** `deployRiskFieldName` (default `"deploy-risk"`; set `null` to disable) and `skipDeployRiskPrompts` (default `false`) in `.shipmate/config/preflight-deployment.json` or `preflight-deployment.local.json`. Only the agent reads these when parsing and building the report.

## Output

**Deployment Readiness Report.**

- **If release ticket fetch fails:** Output an abbreviated report with "What you can do" (retry, paste ticket, context file).
- **Otherwise**, output the full report in this order:
  1. **Summary** — Include **Deployment risk** line when enabled (so Deployment risk is clearly part of verification) + verdict: READY / NOT READY / CONDITIONAL.
  2. **What we're releasing** — Feature tickets (Contains Issues): **link** (`https://sailpoint.atlassian.net/browse/<KEY>`) and **title** (Summary) for each, so readers quickly see what is in the deployment.
  3. **Active Deployment conflict** — If applicable (Check 0 Fail).
  4. **Transition checked** — Release ticket status and transition evaluated.
  5. **Checks table** — Rows for Check 0, 1, **2**, 3, 4, 5, **6** (Check 2 = AC/PR/CI/Branch N/A; label Check 6 **Deployment risk verification**).
  6. **Contains Issues readiness by ticket** — Audit table.
  7. **Linked tickets already in Prod** — List or "None."
  8. **Linked tickets not in Pre-Release** — List or "None"; flag for Release Commander.
  9. **Tickets needing verification** — If Check 4 Fail; else "None; all have readiness or In Prod."
  10. **Deployment risk and risk-based verification** — Release + grouped lists (Medium tickets, High tickets); when any Medium/High, one grouped interactive ask and recorded answers.
  11. **Reasoning** — 2–3 sentences linking data to verdict.
  12. **Recommendations** — Next steps.

**After the report:** Offer one combined prompt for audit trail and/or summary (save to file, summary in chat, post to Jira when enabled; see Phase 3). Optionally offer to save project key to `preflight-deployment.local.json`; if active list is empty with no override, hint that the board may be in another project.

## Phase 1: Gather data

Run the following steps in order. Add `jira issue view` and `jira issue list` to your Cursor allowlist so the agent can run these without repeated prompts. **Flow:** 1.2 (Batch 1) → 1.2 type check (fast-fail if not Deployment) → 1.2a (other active Deployments) → 1.3 (Batch 2). Project key: from config or derived from ticket key; after report offer to save to `preflight-deployment.local.json` if user provided one.

### 1.0 Parse Jira ticket input

- If the user provided a **Jira browse URL** (e.g. `https://sailpoint.atlassian.net/browse/PLTWRKFLW-11386` or `.../browse/PLTWRKFLW-11386#icft=...`), extract the ticket key: the segment after `/browse/` and before any `?` or `#` (e.g. `PLTWRKFLW-11386`).
- If the user provided a **ticket key** (pattern `^[A-Z]+-[0-9]+$`), use it as-is.
- Set `JIRA_KEY=<extracted-or-provided-key>` for all later steps.

### 1.1 Resolve branch

- Use user-provided branch/ref, or `git branch --show-current`, or `main`. Set `BRANCH=<resolved>`.

### 1.2 Jira connection test (Batch 1) — release ticket fetch

**Run:** `jira issue view <JIRA-KEY> --plain --comments 20` (Batch 1; request all permissions). Comments needed for bake time (1.2c).

**If fail:** (a) User pasted release ticket? Parse and continue to 1.2a. (b) `.shipmate/features/<JIRA-KEY>/context/jira.md` exists? Read and continue to 1.2a. (c) Else **stop** — output "Report when release ticket fetch failed" (Phase 3) with "What you can do"; do not run 1.2a, 1.3, Phase 2, or full report.

**If succeed (or fallback):** Parse output. **Capture:** **Issue type** (e.g. Deployment, Task, Story), Summary, description, **status**, acceptance criteria, fix version, **Contains Issues** (linked keys for Batch 2 — see below), **Comments** (full text, date, **author** — for automation in 1.2c). **Contains Issues — how to get linked keys:** Parse linked keys **only** from the ticket's "Contains Issues" (or equivalent link section, e.g. "Linked Issues" if your Jira shows it that way). If no such section is found, treat as **empty** (no linked keys): do not scrape Jira keys from the rest of the output (description, comments, PR links, etc.), or you may pull in unrelated tickets and give false signals about what is in the release. Empty list → skip Batch 2 for linked tickets; report Check 4 as N/A ("No Contains Issues found"). **Deploy risk (release ticket):** Use `deployRiskFieldName` from config or built-in `deploy-risk`; capture value (Low, Medium, High) from release ticket; if field missing or unset, treat as unknown. If issue type is not Deployment (e.g. Task, Story, Sub-task; fallback only), output "Report when ticket is not a Deployment" (Phase 3) and stop; do not run 1.2a, 1.3, Phase 2, or full report. Then continue to 1.2a.

### 1.2a Active Deployment conflict (one per service in active rollout)

**Only when 1.2 succeeded or fallback.** **Rule:** One Deployment per **service** in active rollout; if another is active → NOT READY, skip Contains Issues verification.

**Service name:** From release Summary: strip trailing ` - <number>` (e.g. "sp-workflow-config - 11311" → "sp-workflow-config"). **Sanitize for JQL** before building the query: escape or strip double quotes (e.g. so a name with `"` does not break the JQL string); if the service name can contain other JQL-special characters (parentheses, brackets, etc.), escape those per JQL rules so the query does not behave unexpectedly. Use the sanitized value in the `summary ~` clause. **Active (for conflict detection):** Treat a ticket as **active** only if its status is one of the **known active (mid-rollout) statuses**, e.g. In Pre-Prod High, In Progress, Open, Blocked (adapt to your workflow; see config `statusNames` if used). Any status **not** in that list — including unknown statuses or new terminal statuses such as Cancelled, Rolled Back, Done, Approval Ready, In Prod, Not Released — treat as **not active**. This way new/unknown statuses default to "not active" (no false conflict) rather than "active" (false positive). Do not rely on exact string position in CLI table output; parse the status field from the Jira response.

**Steps:** (1) PROJECT_KEY: user → preflight-deployment.local.json → preflight-deployment.json → from JIRA_KEY. (2) Service name from release Summary; sanitize for JQL (see above). (3) `jira issue list --jql "project = <PROJECT_KEY> AND type = Deployment AND summary ~ \"<SERVICE_NAME_SAFE>\" AND key != <JIRA_KEY>" --plain` (use sanitized service name in place of `<SERVICE_NAME_SAFE>`). (4) If any returned ticket has active status → ACTIVE_ROLLOUT_CONFLICT = true, record ACTIVE_ROLLOUT_TICKET(s). (5) If true, skip Batch 2 for verification; still produce report with NOT READY and conflict section.

### 1.2b Transition context (for comment evaluation)

**From release ticket status:** Approval Ready → **Transition = Approval Ready → In Pre-Prod High** (accept pre-prod/general readiness). In Pre-Prod High → **Transition = In Pre-Prod High → Prod** (need prod or second verification).

**In Pre-Prod High → Prod:** Count comment if it explicitly mentions Prod, is generic ("ready for deployment", "good to go"), or is clearly a second verification (date after ticket entered In Pre-Prod High, or "verified in pre-prod"). Do not count only an old "Approved for In Pre-Prod High" with no prod wording unless generic; if in doubt, note "May be pre-prod verification only; consider prod-specific comment."

### 1.2c Bake time and deployment window (when applicable)

**When:** Not when status is Approval Ready or Done (Check 5 = N/A). Only for mid-rollout (e.g. In Pre-Prod High).

**Automation author:** In release ticket comments, find the comment with scope configuration related to bake time; its **author** is the automation. Use only that author's comments for scope and bake time. If none, no automation author → bake time may Fail.

**Bake time complete:** Comment on **release ticket** from automation author for **current scope** (e.g. "Scope: pre_prod_high"); use most recent matching comment. **Deployment window:**

(1) Prefer Jira automation comment (same author) with scope config (timezone, days, start, end) → current time in window = Pass. (2) Else `deploymentWindows` in config. (3) Else scan for "outside of deployment window". **Capture:** Bake time Y/N; snippet/date or "No relevant bake time complete comment"; window: Inside/Outside (source) or no indication.


### 1.3 Linked tickets (Contains Issues) — Batch 2

**Only when 1.2 succeeded and ACTIVE_ROLLOUT_CONFLICT is false.** If conflict true, skip Batch 2; proceed to Phase 2/3 with Check 0 Fail. **Linked keys** are only those captured from the "Contains Issues" (or equivalent) section in 1.2; if that list is empty, do not run Batch 2 (no `jira issue view` for other keys found elsewhere in the ticket).

**Fetch:** One Batch 2 command: for each linked key run `jira issue view <KEY> --plain --comments 20` with `echo "---END_TICKET---"` between outputs; split on that delimiter. **Capture per ticket:** key, **Summary** (title), assignee, status, full comment text, comment date (for readiness comment used). Summary is required for the report's "What we're releasing" section. **Deploy risk (linked ticket):** Using same field as release (`deployRiskFieldName` or built-in `deploy-risk`), capture deploy risk from each linked ticket output; if field missing or unset for a ticket, treat that ticket as unknown.

**In Prod** = Pass, no comment required; note "Already In Prod; no verification required." **Not Pre-Release and not In Prod** = flag "Status not Pre-Release; may not be ready for deployment." **Notes:** In Prod → that note; not Pre-Release/not In Prod → flag; Pre-Release → "—". When Transition = In Pre-Prod High → Prod and only comment may be pre-prod only, add "May be pre-prod verification only; consider prod-specific comment."

**Readiness signal** (tickets not In Prod): Use transition from 1.2b. A comment that contains one of the **reserved readiness keywords** (config `reservedReadinessKeywords`, e.g. `["[preflight]", "deployment-readiness", "preflight-verification"]`) counts as explicit readiness. Use transition context when evaluating that comment (e.g. In Pre-Prod High → Prod: comment should mention Prod or be clearly a second verification). If no comment with a reserved keyword, you may treat as no verification (Fail) or evaluate other comments as fallback (e.g. explicit go/no-go, "Evidence:", "Verified:"). **Pass** = In Prod or a qualifying readiness comment for current transition; **Fail** = not In Prod and no qualifying comment. No "Contains Issues" or empty list = N/A or Pass.

### 1.4 GitHub (branch / PR / CI) — Batch 3 (optional; not used for verdict)

PR, CI, and branch are **not** used for the preflight-deployment verdict (they are N/A; see Phase 2). You may **skip** Batch 3 entirely to reduce prompts. If you still gather GitHub data (e.g. for context or future use), run **one** command: `git branch --show-current`; then `gh repo view --json nameWithOwner -q .nameWithOwner`; then `gh pr list --head <BRANCH> --state all --limit 1`. Do **not** use this data to set Pass/Fail; report Checks 5, 6, 7 as N/A.

---

## Phase 2: Evaluate readiness

Verdict from **Check 0, 1, 3, 4, 5, and 6** (when applicable). Check 0 Fail → NOT READY, skip Contains Issues for verdict. Check 5 when applicable must Pass for READY. **Check 6** (deploy risk) when any Medium or High → CONDITIONAL and trigger grouped interactive ask (Phase 2.5) unless `skipDeployRiskPrompts` is true. **AC, PR, CI, Branch** = one N/A row; not used for verdict.

| Check | Pass | Fail | Unknown/N/A |
|-------|------|------|-------------|
| **0** No other active Deployment (same service) | No other Deployment for same service in active rollout (Phase 1.2a) | Another in active rollout → ACTIVE_ROLLOUT_CONFLICT; report conflict section, NOT READY | Jira search failed |
| **1** Release ticket status | Done/Approval Ready/In Pre-Prod High/Prod appropriate for transition | In Progress, Open, Blocked | No data |
| **2** AC/PR/CI/Branch | — | — | N/A (not evaluated; reserved for future CI/PR integration) |
| **3** Blocking links | No open blockers or blockers done | Open blockers | No links/data |
| **4** Contains Issues readiness | All linked In Prod or have readiness comment (Phase 1.3) | ≥1 not In Prod and no qualifying comment | No Contains Issues or could not fetch |
| **5** Bake time and deployment window | N/A when Approval Ready or Done. When mid-rollout: bake time complete for scope + inside window (Phase 1.2c) | Mid-rollout and (no bake time comment or outside window) | No comments or could not evaluate |
| **6** Deployment risk verification | Deployment risk disabled (config) or no Medium/High on release or any linked ticket | — | **Conditional** when any Medium or High on release ticket or any linked ticket (Phase 1); evidence requested in section 10 |

**Check 0 Fail:** Report must include **Active Deployment conflict** section (Phase 3); Summary NOT READY. **Check 4:** In Prod = no comment required; Fail only when not In Prod and no readiness signal. **Check 5:** See 1.2c for scope/relevance and window order (Jira comment → config → "outside of deployment window"). **Check 6:** Aggregate deploy risk from release ticket and all linked tickets (Batch 2). If any are Medium or High → run Phase 2.5 (unless `skipDeployRiskPrompts` is true). **After Phase 2.5:** if the user **provided** a non-empty answer for each risk level that had tickets (Medium and/or High), set Check 6 = **Pass** and verdict may be READY (if other checks pass); if the user did not provide an answer (skipped or "Not provided") for an applicable risk level, Check 6 = Conditional and verdict CONDITIONAL.

---

## Phase 2.5: Deploy risk — grouped interactive verification

**When:** Check 6 is Conditional (any Medium or High on release ticket or linked tickets; evidence requested) and config does **not** have `skipDeployRiskPrompts: true`. Low/unknown only → skip this phase; report section 10 still shows deploy risk and lists.

**Purpose:** The [Binary Deployment Process Guide](https://sailpoint.atlassian.net/wiki/spaces/ISC/pages/2791178264/Binary+Deployment+Process+Guide#Release-Engineer-Role) requires: for **Medium Deploy Risk** — *post-deployment verification steps are defined* (if not, block the release); for **High Deploy Risk** — *additional steps prescribed by CAB are followed*. This phase asks for **concrete** references in **one round** of Q&A, grouped by risk level, to minimize prompts.

**Behavior:** One round of Q&A. Two valid orderings:

- **Option A — Ask first, then report:** Ask the Phase 2.5 question in a single message (Medium/High lists + questions). Wait for the user's reply. Then produce the **full report** with section 10 already filled with the user's answers; verdict READY if they provided evidence and other checks pass.
- **Option B — Report first, then ask (same flow):** Produce the **full report** first, with section 10 containing the Medium/High lists and the questions. **Section 10 must include an explicit interactive prompt** so the user knows to reply in chat, e.g. *"Reply in this chat with: (1) Where post-deployment verification steps are defined, and (2) What additional verification beyond automated tests has been or will be done. I'll record your answer in section 10 and update Check 6 and the verdict if applicable."* When the user replies, record their answer in section 10 (output updated section 10 or a short confirmation), set Check 6 = Pass if they provided a non-empty answer for each risk level, and confirm verdict READY if other checks pass.

Record answers in the **Deployment risk and risk-based verification** section (Phase 3) in both options.

- **Build two lists:** (1) **Medium deploy risk:** release ticket (if Medium) and every linked ticket with deploy risk = Medium; (2) **High deploy risk:** release ticket (if High) and every linked ticket with deploy risk = High. Use ticket keys and, if helpful, short summary. When presenting in section 10, **label the release ticket** as "(release ticket)" in these lists so readers are not confused about which ticket is the Deployment ticket vs a Contains Issues ticket.
- **Single combined prompt:** *"This release has **Medium** deploy risk (release or linked tickets): [list keys; add '(release)' next to the release ticket key if it is Medium]. For these tickets, where are the post-deployment verification steps defined, and what additional verification beyond automated tests has been done? This release has **High** deploy risk: [list keys; add '(release)' next to the release ticket key if it is High]. For these, where are the additional steps prescribed by CAB and evidence that they are (or will be) followed?"* If only Medium (no High) or only High (no Medium), ask only the relevant part.
- **One reply:** User may answer both in one message (e.g. "Medium: runbook link X. High: CAB ticket Y."). Record in section 10 under the appropriate headings. **Verdict:** If the user provided a non-empty answer for every risk level that had tickets (e.g. both Medium and High when both had items), set Check 6 = Pass and verdict may be READY (if other checks pass). If the user did not answer or said "Not provided" for any applicable risk level, record "Not provided" and keep Check 6 Conditional, verdict CONDITIONAL.

---

## Phase 3: Produce report

**Data grounding:** Only use data from the fetch output (Phase 1); do not infer status, deploy risk, or comments from narrative text. If a value is missing in the output, report Unknown or N/A.

**Verdict:** READY = Check 0,1,3,4,5 Pass (5 Pass or N/A when applicable) and Check 6 Pass or N/A (no Medium/High, or Medium/High with evidence provided in Phase 2.5). NOT READY = any of 0,1,3,4,5 Fail (Check 0 Fail → report active conflict, wait for rollout to finish). CONDITIONAL = no Fail but ≥1 Unknown or Check 6 Conditional (e.g. Check 6 Conditional when Medium/High and user did not provide evidence; report lists those and records Phase 2.5 answers).

**Summary report and audit trail — interactive choice (one combined prompt):** When the **Next step** block does not require section 10 input (e.g. verdict READY or NOT READY), use the Next step to offer one combined prompt (see item 13 below). When section 10 input is pending, Next step is only the evidence prompt; after the user replies and you update the report, then offer the combined prompt in a follow-up. This keeps one clear action per turn.

**Prompt (when `postSummaryToJira` is true — 6 options):** *"What would you like to do with this report? 1) Save audit trail only (dated file) 2) Summary in chat only 3) Summary and post to Jira 4) Audit trail + summary in chat 5) Audit trail + summary + post to Jira 6) None."* **Prompt (when `postSummaryToJira` is false — 4 options):** *"What would you like to do with this report? 1) Save audit trail only (dated file) 2) Summary in chat only 3) Audit trail + summary in chat 4) None."*

**Behavior per option:** **(1) Audit trail only** — Save the **full report** (complete Phase 3 report as produced) to `.shipmate/preflight-deployment-reports/<JIRA-KEY>-<date>.md` (e.g. `PLTWRKFLW-11386-2026-02-24.md`). Use date `YYYY-MM-DD`; if multiple runs per day need to be kept, append time (e.g. `-1430`). Create the directory `.shipmate/preflight-deployment-reports/` if it does not exist. Confirm in chat where the file was saved. **(2) Summary in chat only** — Output the summary in the hybrid format (below); user copies and uses as they wish. **(3) Summary and post to Jira** (only when `postSummaryToJira` is true) — Output the summary in chat, then run `jira issue comment add <JIRA-KEY> "..."` (all permissions) with the summary content (hybrid format, Jira wiki markup as needed), confirm in chat and link to ticket. **(4) Audit trail + summary in chat** — Save the full report to the dated file as in (1), then output the summary in chat. **(5) Audit trail + summary + post to Jira** (only when `postSummaryToJira` is true) — Save the full report to the dated file, output the summary in chat, then post the summary to Jira as in (3). **(6) None** (or **4) None** when Jira is disabled) — Do nothing; confirm briefly in chat.

For NOT READY/CONDITIONAL, if the user chooses an option that includes posting to Jira, confirm (*"Post anyway? (yes/no)"*) and offer an optional extra note before posting. **Note:** Posting via the agent/Jira CLI can be slow or delayed; generating the summary for manual use gives the user immediate control.


**Hybrid format (summary report, for manual use or Jira comment):** Self-contained; no "full report in chat." (1) Verdict + transition (one line each). (2) **What's in this release:** list each feature ticket with title and link (e.g. "[KEY] Title" with link to `https://sailpoint.atlassian.net/browse/<KEY>`), or "No linked feature tickets." (3) Compact checks table — 7 rows: Check 0 "No other active Deployment (same service)", Check 1 "Release ticket status", Check 2 "AC/PR/CI/Branch" (N/A), Check 3 "Release ticket blocking links", Check 4 "Contains Issues readiness", Check 5 "Bake time and deployment window", Check 6 "Deployment risk verification"; Evidence explicit and reader-friendly. (4) Compact readiness: Check 4 Pass → "Contains Issues: All linked tickets have readiness or In Prod." Check 4 Fail → "Tickets needing verification:" list key (Author). Check 0 Fail → "Contains Issues skipped (active rollout)." (5) If Check 6 Conditional: "Medium risk: [keys]. High risk: [keys]. Evidence: [user answers or Not provided]." (6) User extra note if provided.

**Report structure (output in one message):**

**Do not create or write the report to a file when producing the report.** Output the full report in chat only (one message). Saving the report to a file (audit trail) happens only when the user chooses an option that includes saving (1, 4, or 5) in the combined prompt after the report.

**When to use which format:** Use the **short report** for NOT READY when the reason is **(a) Active Deployment conflict (Check 0 Fail)** or **(b) Ticket is not a Deployment**. Use the **full report** for READY, CONDITIONAL, or NOT READY when the reason is anything else (e.g. blocking links, Contains Issues fail, status wrong). This keeps both early-exit NOT READY cases (active conflict and wrong ticket type) consistent in length and structure.

**Verdict first (visual prominence):** Start the report with a **single, highly visible verdict block** so the user can see the outcome immediately. Use the following format at the very top of the report (before any other section):

```markdown
---
# Deployment Readiness: **NOT READY**  (or **READY** / **CONDITIONAL**)
One-line reason (e.g. "Another Deployment for this service is in active rollout.")
---
```

Use bold and a clear heading; keep the one-line reason on the next line. Use a horizontal rule (`---`) above and below this block to separate it from the rest of the report. For **NOT READY** and **CONDITIONAL** use wording that makes the outcome obvious at a glance.

1. **Summary** — Repeat READY | NOT READY | CONDITIONAL and one-line reason (can be briefer here). **Always include a "Deployment risk" line** when deploy risk is enabled: e.g. *"Deployment risk: Medium (release + 4 linked); evidence requested."* or *"Deployment risk: Low / none; no evidence required."* Examples: **READY** — *"Deployment risk: Medium; evidence provided. All checks passed."* **CONDITIONAL** — *"Deployment risk: Medium (release + linked); evidence not provided. Confirm post-deploy steps before proceeding."* **NOT READY** — e.g. *"Active Deployment conflict."* or *"Blocking links open."*
2. **What's in this release** — So readers understand **what is being deployed** before the checks. List each **feature ticket** (Contains Issues / linked tickets) with: **title** (the ticket summary from Jira) and **link** (`https://sailpoint.atlassian.net/browse/<KEY>`). Format as a simple list or table, e.g. one line per ticket: *"[KEY] Title of the feature"* with the key or title linking to the Jira browse URL. If Check 0 Fail (no Batch 2), write "Skipped — active rollout conflict." If there are no Contains Issues, write "No linked feature tickets."
3. **Active Deployment conflict** (if Check 0 Fail) — "Active Deployment conflict — do not proceed"; **indicate clearly which ticket(s) are the detected active Deployment(s)** (from 1.2a: tickets in the JQL result that have active status). One Deployment per service in active rollout; list each active ticket with key and `https://sailpoint.atlassian.net/browse/<KEY>`; recommend wait for that/those ticket(s) to reach Approval Ready/In Prod/Not Released.
4. **Transition checked** — Release ticket status and transition evaluated; readiness-by-ticket table: comment used, date; Notes e.g. "May be pre-prod verification only; consider prod-specific comment." when applicable.
5. **Checks table** — Rows: Check 0, 1, **2**, 3, 4, 5, **6** (Result + Evidence). **Check 2** (AC/PR/CI/Branch): N/A, Evidence *"Not evaluated; reserved for future CI/PR integration."* **Check 6** row: **"Deployment risk verification"** (so Deployment risk is clearly part of verification) — Pass when no Medium/High; **Conditional** when any Medium/High (evidence requested in section 10); N/A when deploy risk disabled.
6. **Contains Issues — readiness by ticket** — If Check 0 Fail: omit or "Skipped — active rollout." Else: table with columns **Ticket** (key + link), **Author**, **Deployment risk** (Low / Medium / High per ticket — from Jira deploy-risk field on each linked ticket), **Readiness** (Result: Pass/Fail), **Comment used**, **Comment date**, **Notes**. Including Deployment risk in this table makes it clear which linked tickets are Medium or High and ties readiness to the same list. Do not include the release (Deployment) ticket in this table — it is in section 10. **Consistency:** Section 10 Medium/High ticket lists must match the Deployment risk column in section 6 for those same tickets.
7. **Linked tickets already in Prod** — List keys or "None."
8. **Linked tickets not in Pre-Release** — List keys; flag for Release Commander. Or "None."
9. **Tickets needing verification** — If Check 4 Fail: by author, ticket keys; suggest contact for readiness comment. Else "None; all have readiness or In Prod."
10. **Deployment risk and risk-based verification** — Always present when deploy risk is enabled. **Clarify scope first:** Check 6 applies to (a) the **release ticket** (the Deployment ticket you ran preflight-deployment on, e.g. PLTWRKFLW-11386 "interactive-process - 167") and (b) each **linked ticket** under Contains Issues. We read the Jira "Deployment risk" (deploy-risk) field on all of these; evidence is requested for **every ticket that is Medium or High**, whether release or linked. Present this section in this order: **(1) One-line explainer:** *"Deployment risk is read from the release (Deployment) ticket and from each linked (Contains Issues) ticket. Evidence is requested for every ticket that is Medium or High."* **(2) Release (Deployment) ticket** — Key, one-line summary, **Deployment risk:** [Low | Medium | High]. **(3) Linked tickets (Contains Issues) by risk** — **Medium:** list each linked ticket key (and optional one-line summary) with Deployment risk = Medium. **High:** list each linked ticket key with Deployment risk = High. If the release ticket is Medium or High, include it in that list with label "(release ticket)". **(4) Combined list for evidence** — **Tickets that need evidence (Medium risk):** [keys; add "(release)" next to release key if applicable]. **Tickets that need evidence (High risk):** [keys]. **(5)** If Phase 2.5 applies and report is before user answered (Option B): **explicit interactive prompt** that references "the tickets listed above as Medium risk [and High risk]" so it is clear evidence is for those specific tickets (release and/or linked). E.g. *"Reply in this chat with: (1) Where post-deployment verification steps are defined for the tickets listed above as Medium risk [and High risk], and (2) What additional verification beyond automated tests has been or will be done. I'll record your answer here and update Check 6 and the verdict if applicable."* When the user replies, record in section 10 and update verdict. If the user already answered (Option A or after Option B): **For Medium** — "Post-deployment verification steps defined (where):" and "Additional verification beyond automated tests:" plus user's answer or "Not provided." **For High** — "Additional steps prescribed by CAB (and evidence followed):" plus user's answer or "Not provided." Align with [Binary Deployment Process Guide — Review each deployment](https://sailpoint.atlassian.net/wiki/spaces/ISC/pages/2791178264/Binary+Deployment+Process+Guide#Release-Engineer-Role). If deploy risk disabled (config): one line "Deploy risk: disabled."
11. **Reasoning** — 2–3 sentences linking data to verdict.
12. **Recommendations** — Next steps; if Check 0 Fail: wait for active ticket, then re-run; if not Pre-Release: confirm before promoting; if Check 6 Conditional (Medium/High): confirm post-deploy steps and CAB evidence before proceeding, then re-run or post evidence to deployment ticket. For NOT READY or CONDITIONAL, consider adding: confirm in Jira (e.g. ticket status, deploy risk, or active conflict tickets listed above).
13. **Next step** — **Always the last thing in the report.** One clear action so nothing feels left hanging. Choose one:
    - **Check 6 Conditional (section 10 needs your input):** *"**Next step:** Reply in this chat with: (1) Where post-deployment verification steps are defined for the tickets listed in section 10 as Medium risk [and High risk if any], and (2) What additional verification beyond automated tests has been or will be done. I'll record your answer in section 10 and update Check 6 and the verdict (to READY if everything else passes)."*
    - **READY (no pending input):** *"**Next step:** Optional — say what you'd like to do: 1) Save audit trail only 2) Summary in chat only 3) Summary + post to Jira 4) Audit trail + summary in chat 5) Audit trail + summary + post to Jira 6) None (or 1–4 when Jira post is disabled)."*
    - **CONDITIONAL with no section 10 input pending** (e.g. you already recorded "Not provided"): *"**Next step:** Optional — same choices as above (audit trail, summary, post to Jira, both, none). To move to READY, provide Deployment risk evidence in a follow-up message and I'll update the report."*
    - **NOT READY:** *"**Next step:** Resolve the issue above (e.g. wait for active rollout to finish, or fix blocking links), then re-run `/preflight-deployment [JIRA-KEY]`."*

When section 10 contains the interactive prompt (Option B), add in section 10: *"(Your reply is requested — see **Next step** at the end of this report.)"* so the user knows the ask is repeated and where to look.

**Report when release ticket fetch failed:** Batch 1 failed and no pasted ticket or `.shipmate/features/<JIRA-KEY>/context/jira.md`. **Summary** CONDITIONAL — Could not fetch release ticket; verdict not possible. **Why** one line (e.g. connection reset, TLS x509, "jira: command not found"); no further verification run. **Checks** 0,1,3,4 Unknown; AC/PR/CI/Branch N/A. **What you can do:** Retry with full/all permissions; paste ticket in chat and re-run; or save `jira issue view <JIRA-KEY> --plain` to `.../context/jira.md`. **Next step:** Retry with full permissions, or paste the release ticket in chat and I'll continue from there, or save output to `.shipmate/features/<JIRA-KEY>/context/jira.md` and re-run. See `@.shipmate/docs/jira-access-for-shipmate.md` for Jira CLI setup.

**Report when ticket is not a Deployment:** After Batch 1 the parsed issue type is not Deployment (e.g. Task, Story, Sub-task). Use the **short report** format (same structure as for Check 0 Fail). No Batch 2 or Phase 2 run. Fill: Verdict block (NOT READY, reason e.g. "Ticket is not a Deployment."); Summary; **Reason** = Not a Deployment ticket (type, key, one-line summary, status; preflight-deployment is for Deployment tickets; suggest the Deployment ticket that Contains this work); Checks (summary) = Ticket type: not Deployment, others Not run; Reasoning; Next step = run preflight-deployment on Deployment ticket key or paste link.

---

## Troubleshooting

When the release ticket fetch fails (or `jira` is not found), output the **Report when release ticket fetch failed** (Phase 3); it includes **What you can do** and the Jira doc link. For Jira CLI setup see Quick start and `@.shipmate/docs/jira-access-for-shipmate.md`.

---

## Design notes and alternatives

*For PR reviewers and maintainers: rationale for key design choices; consult before changing verdict rules, evidence flow, or summary behavior.*

- **Next step (item 13):** One clear action per turn (reply with evidence, optional summary, or re-run). Section 10 points to it when input is needed; after the user responds, the agent records in section 10 or generates the summary. Keeps the flow from feeling incomplete.

- **Deploy risk default + CONDITIONAL + grouped ask:** Default (no opt-in) aligns with the Binary Deployment Process Guide. CONDITIONAL (not hard-Fail) when Medium/High lets the report capture evidence in one Q&A round; grouped ask (all Medium/High in one prompt) avoids N prompts for N tickets and matches "Tickets needing verification" list pattern.

- **Alternatives considered:** (a) Per-ticket questions → rejected (too many prompts). (b) Opt-in deploy risk → rejected (guide expects it by default; use `deployRiskFieldName: null` to disable). (c) READY after evidence → accepted: user answer per risk level → Check 6 Pass and verdict READY when others pass; answer recorded in report.

- **Consistency:** Check 6 = Pass / Fail / **Conditional** / N/A; other checks = Pass / Fail / Unknown/N/A. Section 9 uses same "list by category" pattern as "Tickets needing verification" and "Linked tickets not in Pre-Release." Verdict: READY = all Pass or N/A; CONDITIONAL = any Unknown or Check 6 Conditional.

- **Summary: generate first, then choose:** Generate summary for user to use (or copy) before offering "post to Jira"; agent-post can be slow, so user gets immediate control and reliable evidence on the ticket.

---

## Future considerations and out of scope

**Report retention and auditing**  
**Implemented (v1).** The combined post-report prompt offers saving an audit trail (options 1, 4, 5). Full report is saved to `.shipmate/preflight-deployment-reports/<JIRA-KEY>-<date>.md`; create the directory if needed. Add time to the filename for multiple runs per day. **Alternative path:** `.shipmate/features/<JIRA-KEY>/preflight-deployment-<date>.md`. Team decision: gitignore `.shipmate/preflight-deployment-reports/` or commit (commit = repo history for compliance).
- **Audit trail vs summary vs Jira:** See the explainer — "Summary, Jira comment, and audit trail" for the distinction.

**Out of scope for this version (future consideration)**  
- **PRs without tickets:** Evaluating deployments for PRs that lack tickets — valuable extension; not in scope for this command.  
- **In-flight and post-flight commands:** Additional commands for in-flight and post-deployment checks (e.g. Cloudbees MCP, Grafana MCP) — future consideration.

**Interactive save/share flow**  
**Implemented.** Phase 3 uses one combined prompt with 4 options (when `postSummaryToJira` is false) or 6 options (when true): audit trail only, summary in chat only, summary + post to Jira, audit trail + summary in chat, audit trail + summary + post to Jira, none. Confluence and free-text "other" remain future.

---

## CLI usage

**Cursor:** Run `/preflight-deployment <JIRA-KEY>`; agent runs `jira issue view` and `jira issue list` (add them to your Cursor allowlist to avoid repeated prompts) and produces the report in chat. **Other tools:** Point agent at `@.shipmate/commands/preflight-deployment.md`; agent + command file = execution (see `@.shipmate/docs/shipmate-commands-other-tools-usage.md`). Full report structure = Phase 3 (plain text or Markdown in chat).

---
