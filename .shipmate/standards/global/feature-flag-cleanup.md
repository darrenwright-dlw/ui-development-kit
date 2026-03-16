# Feature Flag Cleanup Patterns

Reference standard for cleaning up feature flags across frontend and backend codebases at SailPoint. These patterns ensure behavioral preservation - cleanup must be a no-op, keeping the flag-ON path.

For LaunchDarkly CLI usage, see `@tools/launchdarkly-cli.mdc`.

---

## Discovery Categories

When searching for feature flag usages, check ALL applicable categories. Never skip categories.

### Universal Categories (Frontend + Backend)

#### Enum / Constant Definitions

- `FLAG_NAME` in feature flag enums/constants
- Variables/constants assigned `FLAG_NAME`
- String literals matching `FLAG_NAME`

#### Configuration Files

- `featureFlagIn` / `featureFlagNotIn` in `mfe.json` (frontend MFE)
- Flag references in `application.yml` / `application.properties` (Spring Boot)
- Flag references in environment config or `.env` files

#### LaunchDarkly Flag Lookup

Verify the flag exists in LD and check its metadata:

```bash
ldcli flags get --project idn --flag FLAG_NAME --output json | jq '{key: .key, maintainer: .maintainer, tags: .tags, creationDate: .creationDate}'
```

> **Note:** The `saas-feature-flags` repo (`sailpoint/saas-feature-flags`) is **archived and deprecated**. Flag management is now done directly in LaunchDarkly. See [Feature Flag Lifecycle and Policy](https://sailpoint.atlassian.net/wiki/spaces/IDN/pages/2205583775/Feature+Flag+Lifecycle+and+Policy) for the current process.

#### Analysis Artifacts

If the repo contains `ff-analysis/`:
- `all_flags_in_launchdarkly.txt` - full LD flag inventory
- `flags_in_ld_not_in_code.txt` - flags in LD but not referenced in code
- `launchdarkly_flags_full.json` - detailed LD export

#### Tests

- Mocks, spies, and stubs tied to `FLAG_NAME`
- Test names mentioning `FLAG_NAME`
- Feature flag test context/fixtures referencing `FLAG_NAME`

#### Other References

- Comments/TODOs/docs/README references
- Any remaining literal matches of `FLAG_NAME`

---

### Frontend Categories (Angular / TypeScript)

#### Service Calls (alias-tolerant)

Do NOT assume the variable name is `featureFlagService`. Search for method calls using `FLAG_NAME` regardless of receiver identifier:

- `isEnabled('FLAG_NAME')`
- `anyEnabled([... 'FLAG_NAME' ...])`
- `allEnabled([... 'FLAG_NAME' ...])`
- `getNumericFeatureFlagValue('FLAG_NAME')`
- `isFeatureFlagDefined('FLAG_NAME')`

#### Legacy ExtJS Calls

For repos still using ExtJS (e.g. `cloud-ext-admin`):

- `SLPTaiq.getLDFlag('FLAG_NAME')`

#### Decorators

- `@HasFeatureFlag('FLAG_NAME')`
- `@HasAnyFeatureFlag(..., 'FLAG_NAME', ...)`
- `@HasAllFeatureFlags(..., 'FLAG_NAME', ...)`
- `@LacksFeatureFlag('FLAG_NAME')`
- `@LacksAnyFeatureFlag(..., 'FLAG_NAME', ...)`
- `@LacksAllFeatureFlags(..., 'FLAG_NAME', ...)`

#### Route Guards & Authorization

- `authReqs` objects with `has`/`hasAny`/`hasAll`/`lacks`/`lacksAny`/`lacksAll` containing `FLAG_NAME`
- `featureFlaggedCanActivate('FLAG_NAME', ...)`
- Route `data` objects referencing `FLAG_NAME`

#### MFE Configuration

- `featureFlagIn` arrays containing `FLAG_NAME` in `mfe.json`
- `featureFlagNotIn` arrays containing `FLAG_NAME` in `mfe.json`
- Mapping objects in generator files (e.g. `tools/slpt-nx-plugin/src/generators/import-mfe/generator.ts`)

#### Templates (HTML)

- Properties derived from `FLAG_NAME` in `.ts` consumed in `@if`/`@else`/`@switch`/`*ngIf`/`[hidden]` in `.html`
- `[featureFlag]` bindings referencing `FLAG_NAME`

**Important:** Trace indirect `.ts` property -> `.html` usage.

#### Frontend Tests

- `jest.spyOn` / `mockImplementation` / `mockReturnValue` tied to `FLAG_NAME`
- `FeatureFlagService` mock providers referencing `FLAG_NAME`
- `FLAG_TESTING_CONTEXT` / `FlagContextTestingModule` setups with `FLAG_NAME`
- `describe`/`it` names mentioning `FLAG_NAME`
- `featureFlags.add('FLAG_NAME')` / `featureFlags.delete('FLAG_NAME')`

#### Storybook Stories

Search `*.stories.ts` for:

- `FeatureFlagService` provider mocks referencing `FLAG_NAME`
- `MockFeatureFlagService` configs with `FLAG_NAME`
- Local mock classes enabling `FLAG_NAME`
- `FLAG_TESTING_CONTEXT` providers with `FLAG_NAME`
- Story names tied to flag behavior (e.g. `WithFlagEnabled`)

#### Cypress Integration Tests

Search `*.cypress.ts` / `*.cypress.js` for:

- `cy.loadStory()` loading flag-specific stories
- `describe`/`it` names referencing flag behavior
- `cy.intercept` related to flag behavior

**Important:** Cypress depends on Storybook names/existence.

---

### Backend Categories (Java)

SailPoint Java services use two main abstractions from `cloud-modules` and `atlas`:

- **`FeatureFlagService`** (from `com.sailpoint.atlas.service.FeatureFlagService` - **deprecated**, being replaced by `AtlasFeatureFlagService`)
- **`FeatureFlagClient`** (from `com.sailpoint.featureflag.FeatureFlagClient` - the lower-level interface backed by `LDFeatureFlagClient`)

These are injected via Guice (`@Inject`), not Spring Boot.

#### Service Wrapper Calls (Most Common)

```bash
grep -rn "_featureFlagService.getBoolean\|featureFlagService.getBoolean\|_featureFlagService.getString\|_featureFlagService.getInt" --include="*.java" .
```

Look for:
- `_featureFlagService.getBoolean(Flags.FLAG_NAME)` - single-arg (default=false, uses RequestContext for org/pod)
- `_featureFlagService.getBoolean(Flags.FLAG_NAME, defaultValue)` - with explicit default
- `_featureFlagService.getBoolean("FLAG_NAME", featureUser, defaultValue)` - string key with custom user
- `_featureFlagService.getString(...)` / `_featureFlagService.getInt(...)`

#### Client Interface Calls (Lower Level)

```bash
grep -rn "_featureFlagClient.getBoolean\|featureFlagClient.getBoolean\|_featureFlagClient.getJson\|_featureFlagClient.getString" --include="*.java" .
```

Look for:
- `_featureFlagClient.getBoolean(key, featureUser, false)` - always requires a `FeatureUser` context
- `_featureFlagClient.getJson(key, featureUser, clazz, defaultValue)` - JSON variation flags
- `_featureFlagClient.flagExists(key)` - existence check

#### Enum / Constant Definitions

Backend services define flags as Java enums:

```bash
grep -rn "enum FLAGS\|enum.*Flags\|enum.*FeatureFlag" --include="*.java" .
```

Look for patterns like:
- `public enum FLAGS { FLAG_NAME, ... }`
- `public enum FeatureFlags { FLAG_NAME, ... }`
- Constants: `public static final String FLAG_NAME = "FLAG_NAME";`

#### REST Resources (Controllers)

```bash
grep -rn "featureFlagService\|featureFlagClient" --include="*Resource.java" .
```

Flag checks in REST resources typically gate entire endpoints or switch behavior:
- `if (_featureFlagService.getBoolean(Flags.FLAG_NAME)) { ... }` in resource methods
- API versioning: v2026 resources gated by flags (e.g. `ProvisioningPolicyV2026Resource`)
- Request filters/interceptors checking flag state

#### Services / Business Logic

```bash
grep -rn "featureFlagService\|featureFlagClient" --include="*Service.java" --include="*ServiceImpl.java" --include="*Helper.java" .
```

#### Event Handlers / Workers

```bash
grep -rn "featureFlagService\|featureFlagClient" --include="*EventHandler.java" --include="*Listener.java" --include="*Worker.java" --include="*Job.java" .
```

#### Backend Tests

Tests use Mockito with `@Mock` annotation:

```bash
grep -rn "@Mock.*FeatureFlagService\|@Mock.*FeatureFlagClient\|when.*getBoolean\|when.*featureFlag" --include="*Test.java" .
```

Look for:
- `@Mock FeatureFlagService featureFlagService;` or `@Mock FeatureFlagService _featureFlagService;`
- `@Mock FeatureFlagClient _featureFlagClient;`
- `when(featureFlagService.getBoolean(Flags.FLAG_NAME)).thenReturn(true);`
- `when(_featureFlagClient.getBoolean(eq("FLAG_NAME"), any(), eq(false))).thenReturn(true);`
- `verify(_featureFlagService).getBoolean(Flags.FLAG_NAME);`

---

### Backend Categories (Go)

SailPoint Go services use the `atlas-go` feature store abstraction.

#### Feature Store Calls

```bash
grep -rn "IsEnabled\|IsEnabledForUser\|IsExistsAndEnabled\|BoolVariation" --include="*.go" .
```

Look for:
- `feature.IsEnabled(ctx, flag, defaultValue)` - context-based evaluation (extracts org/pod from ctx)
- `feature.IsEnabledForUser(user, flag, defaultValue)` - explicit user evaluation
- `feature.IsExistsAndEnabled(ctx, flag, defaultValue, defaultIfNotFound)` - safe evaluation when flag may not exist
- Direct `client.BoolVariation(key, context, default)` calls (lower-level, less common)

#### Flag Type Definitions

Go flags are typed as `feature.Flag` (string alias):

```bash
grep -rn "Flag\s*=" --include="*.go" . | grep -v "_test.go\|vendor"
```

Look for:
- `const FLAG_NAME feature.Flag = "FLAG_NAME"`
- String constants used as flag keys

#### Go Tests

```bash
grep -rn "mockLD\|MockFeature\|On.*BoolVariation\|On.*IsEnabled" --include="*_test.go" .
```

Look for:
- `mockLD.On("BoolVariation", mock.Anything, mock.Anything, mock.Anything).Return(true, nil)`
- `mockLD.On("IsEnabled", mock.Anything, mock.Anything, mock.Anything).Return(true, nil)`
- Testify mock patterns

---

## LaunchDarkly Verification

Use `ldcli` to verify flag state before cleanup. See `@tools/launchdarkly-cli.mdc` for full guide.

### Check Flag Status

```bash
# Get flag details (default project: idn)
ldcli flags get --project idn --flag FLAG_NAME --output json

# Check production state
ldcli flags get --project idn --flag FLAG_NAME --env production --output json | jq '.on, .fallthrough'

# Check test state
ldcli flags get --project idn --flag FLAG_NAME --env test --output json | jq '.on, .fallthrough'
```

### Check Prerequisites (Reverse)

```bash
# Check if this flag has prerequisites
ldcli flags get --project idn --flag FLAG_NAME --output json | jq '.prerequisites'

# Search for flags that depend on this one
ldcli flags list --project idn --limit 200 --output json | jq '[.items[] | select(.prerequisites[]?.key == "FLAG_NAME") | .key]'
```

### Check Tags

```bash
ldcli flags get --project idn --flag FLAG_NAME --output json | jq '.tags'
```

Required tags: `team-*`, `expiration_month-YYYYMM`. Optional: `visibility-*`, `ticket-*`.

### LD Project Selection

| Project | Key | Common Prefixes |
|---------|-----|-----------------|
| IdentityNow | `idn` | `UI_`, `GOV_`, `CONN_`, `PLTUI_`, `UIGOV`, `ISCANT` |
| CAM | `cam` | `CAM_` |
| ARM | `arm` | `ARM_` |
| Identity Risk | `sir` | `SIR_` |
| NERM Classic | `nerm-classic` | `NERM_` |

### FEATS Auto-Segments

If the flag uses FEATS-managed auto-segments (`FLAG_NAME_SEGMENT_TRUE` / `FLAG_NAME_SEGMENT_FALSE`), cleanup requires coordination with the FEATS service to remove those segments from LaunchDarkly.

---

## Cleanup Transformations

### Universal Patterns

For any language: keep the flag-ON path, remove the conditional and dead code.

```
// Before (pseudocode)
if (flagEnabled) {
  newBehavior();
} else {
  oldBehavior();
}

// After
newBehavior();
```

For negated checks (`!flagEnabled` / `@LacksFeatureFlag`): keep the else branch (which is the ON-path).

### Frontend (Angular / TypeScript)

#### `isEnabled` in Conditional

Keep the true branch, remove conditional. If negated condition (`!isEnabled`), keep the else branch.

```typescript
// Before
if (this.featureFlagService.isEnabled(FeatureFlag.MY_FLAG)) {
  this.doNewThing();
} else {
  this.doOldThing();
}

// After
this.doNewThing();
```

#### `isEnabled` Assigned to Property

Remove assignment/property declaration. Replace property usage with true-path logic. Remove dead branches in TS + template.

#### `anyEnabled` / `allEnabled`

Remove `FLAG_NAME` from array only. If only remaining element logic is trivial, simplify safely.

#### `@HasFeatureFlag`

Remove decorator and property. Inline true behavior.

#### `@LacksFeatureFlag`

Resolves to false when flag is enabled. Remove dead guarded code.

#### `authReqs.featureFlag`

Remove `FLAG_NAME` requirement from `authReqs`. Remove empty wrappers when applicable.

#### `featureFlaggedCanActivate`

Replace with flag-ON guard path.

#### `mfe.json`

Remove `FLAG_NAME` from `featureFlagIn`/`featureFlagNotIn`. Remove property if array becomes empty. Update generator mappings if present.

#### Templates

Remove wrappers around always-true conditions. Keep ON-path content. Remove dead `@else`/`*ngIf` blocks.

#### Storybook

Remove flag-only providers/mocks. If story existed only for flag-ON variant, merge/remove and rename. Remove obsolete `FLAG_TESTING_CONTEXT` setups if empty.

#### Cypress

Update/remove tests tied to removed/renamed stories. Rename flag-based describe blocks to behavior-based names. Remove file if only flag-specific coverage existed and is obsolete.

#### Legacy ExtJS (`SLPTaiq.getLDFlag`)

Same logic as `isEnabled` - keep flag-ON path, remove conditional.

### Backend (Java)

#### `FeatureFlagService.getBoolean` (Most Common)

```java
// Before
if (_featureFlagService.getBoolean(Flags.FLAG_NAME)) {
    return newService.process(request);
} else {
    return legacyService.process(request);
}

// After
return newService.process(request);
```

Remove the flag from the `Flags` enum. If the enum becomes empty, delete the enum class and update imports.

#### `FeatureFlagClient.getBoolean` (Lower Level)

```java
// Before
if (_featureFlagClient.getBoolean("FLAG_NAME", featureUser, false)) {
    processNewWay(request);
} else {
    processOldWay(request);
}

// After
processNewWay(request);
```

If no other flags use the `_featureFlagClient` in this class, remove the `@Inject FeatureFlagClient` field and the `FeatureUser` construction.

#### `FeatureFlagClient.getJson` (JSON Variation)

If the flag returns a JSON config object, replace with the ON-path config directly:

```java
// Before
MyConfig config = _featureFlagClient.getJson("FLAG_NAME", featureUser, MyConfig.class, DEFAULT_CONFIG);

// After
// Inline the ON-path config or load from a constant
MyConfig config = NEW_CONFIG;
```

#### API Versioning via Flags

If a flag gates a versioned resource (e.g. `v2026` endpoint):

```java
// Before - in ProvisioningPolicyV2026Resource
if (_featureFlagService.getBoolean(Flags.FLAG_NAME)) {
    // v2026 behavior
} else {
    // delegate to legacy resource
}

// After
// v2026 behavior (remove delegation to legacy)
```

Keep the new versioned resource. Remove fallback to the old resource. If the old resource is no longer referenced, delete it.

#### Negated Checks

```java
// Before - negated check means flag-ON disables this code
if (!_featureFlagService.getBoolean(Flags.FLAG_NAME)) {
    // old behavior only when flag is OFF
    doLegacyThing();
}

// After
// Delete the entire block - flag is ON, so this code is dead
```

#### Event Handlers / Workers

If a worker checks flag state before processing, remove the check and keep the ON-path logic.

### Backend (Go)

#### `feature.IsEnabled`

```go
// Before
if enabled, _ := feature.IsEnabled(ctx, Flags.FLAG_NAME, false); enabled {
    return newHandler(ctx, req)
}
return legacyHandler(ctx, req)

// After
return newHandler(ctx, req)
```

#### `feature.IsExistsAndEnabled`

```go
// Before
if enabled, _ := feature.IsExistsAndEnabled(ctx, Flags.FLAG_NAME, false, false); enabled {
    useNewBehavior()
} else {
    useLegacyBehavior()
}

// After
useNewBehavior()
```

Remove the flag constant. If no other flags remain in the constants block, delete the file.

### Shared Cleanup Steps

#### Import Cleanup

Remove unused feature flag service/client/decorator/enum/testing imports and injections.

#### Cascade Cleanup

For every service/class/file deleted:

- Delete corresponding test files (spec/test)
- Remove barrel exports from `index.ts` or equivalent
- Remove constructor/field injections from all consumers
- Remove import statements from all consumers
- If a deleted service was `providedIn: 'root'` (Angular), no module-level provider cleanup needed; otherwise remove from module providers arrays
- For Java: if removing `@Inject FeatureFlagClient` or `@Inject FeatureFlagService`, check that the Guice module binding is not affected
- For Go: if removing a feature flag constant, check that the package's `init()` or registration functions don't reference it

---

## Post-Code Cleanup: LaunchDarkly & Flag Repo

After code cleanup is merged, complete the flag lifecycle with a policy gate:

1. **Create LD archival follow-up task** - Create a Jira sub-task assigned to the engineer running cleanup (include acceptance criteria: 7-day production bake, no regressions, no active dependents)
2. **Wait for 7-day production bake** - Do not archive before cleaned-up code has run in production for at least 7 days
3. **Archive in LaunchDarkly** - Mark the flag as archived via `ldcli` or the LD UI after the gate is met
4. **Remove auto-segments** - If FEATS auto-segments exist, coordinate with FEATS team to remove `FLAG_NAME_SEGMENT_TRUE` and `FLAG_NAME_SEGMENT_FALSE`

---

## Validation Checklist

After cleanup, verify:

1. No `FLAG_NAME` in any source files (`*.ts`, `*.java`, `*.html`, `*.json`, `*.yml`, `*.properties`)
2. No dead else branches remain
3. No orphaned template refs to removed properties (frontend)
4. No unused imports from cleanup
5. Every file from discovery report addressed (including cascade files)
6. No `FLAG_NAME` in test files (`*.spec.ts`, `*Test.java`, `*IT.java`)
7. No `FLAG_NAME` in `*.stories.ts` (frontend)
8. No broken `cy.loadStory` refs after story cleanup (frontend)
9. All deleted files' tests also deleted (cascade check)
10. All barrel files / module registrations updated for deleted exports (cascade check)
11. No remaining imports/injections of deleted services/classes (cascade check)
12. LD archival follow-up task created, 7-day production gate satisfied, and no regressions/active dependents confirmed before archival
