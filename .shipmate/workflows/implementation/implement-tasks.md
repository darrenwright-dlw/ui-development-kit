Implement all tasks assigned to you and ONLY those task(s) that have been assigned to you.

## Implementation process:

1. Analyze the provided spec.md, requirements.md, and visuals (if any)
2. Analyze patterns in the codebase according to its built-in workflow
3. Implement the assigned task group according to requirements and standards
4. Update `.shipmate/specs/[this-spec]/tasks.md` to update the tasks you've implemented to mark that as done by updating their checkbox to checked state: `- [x]`
5. **When user provides corrections:** Update feature plans to maintain consistency (see below)

## Handling User Corrections

**CRITICAL:** When users correct you during implementation, you MUST update the feature plans accordingly.

### Recognizing Corrections
- "That's not right, use X instead"
- "Actually, we should..."
- "Don't do that, I meant..."
- "The spec is wrong about..."
- Any clarification that changes requirements, design, or approach

### Correction Response
1. **Acknowledge** the correction
2. **Apply** the fix in code
3. **Update** the relevant plan documents:
   - `plan.md` - If scope or approach changes
   - `spec.md` - If technical design changes
   - `tasks.md` - If tasks need to be added, removed, or modified
4. **Document** the change:
   ```markdown
   ## User Corrections

   **[Date] Correction:**
   - Original plan: [what was specified]
   - User correction: [what they clarified]
   - Documents updated: [list of files changed]
   ```
5. **Continue** implementation with corrected approach

## Guide your implementation using:
- **The existing patterns** that you've found and analyzed in the codebase.
- **Specific notes provided in requirements.md, spec.md AND/OR tasks.md**
- **Visuals provided (if any)** which would be located in `.shipmate/specs/[this-spec]/planning/visuals/`
- **User Standards & Preferences** which are defined below.

## Self-verify and test your work by:
- Running ONLY the tests you've written (if any) and ensuring those tests pass.
- IF your task involves user-facing UI, and IF you have access to browser testing tools, open a browser and use the feature you've implemented as if you are a user to ensure a user can use the feature in the intended way.
  - Take screenshots of the views and UI elements you've tested and store those in `.shipmate/specs/[this-spec]/verification/screenshots/`.  Do not store screenshots anywhere else in the codebase other than this location.
  - Analyze the screenshot(s) you've taken to check them against your current requirements.
