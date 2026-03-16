# Determine Project Mechanics

**Purpose:** Detect project type, frameworks, architecture, and technical characteristics to inform intelligent instruction distillation and tool configuration.

**Used By:** `shipmate learn`, `shipmate init`, Copilot distillation process

**Agents:** References `@core/agents/architect.md` and `@core/agents/analyzer.md`

---

## Objective

Analyze the codebase to detect:
- Primary language(s) and frameworks
- Project type and architecture patterns
- Testing infrastructure
- Build and deployment tools
- Monorepo structure (if applicable)

Output structured project characteristics for use by distillation agents.

---

## Detection Process

### 1. Package Manager & Manifest Detection

Scan for project manifests to identify the primary ecosystem:

| File | Ecosystem | Extract |
|------|-----------|---------|
| `package.json` | Node.js/JavaScript | dependencies, devDependencies, scripts |
| `pom.xml` | Java/Maven | dependencies, plugins, modules |
| `build.gradle(.kts)` | Java/Gradle | dependencies, plugins |
| `requirements.txt` | Python | packages |
| `pyproject.toml` | Python | dependencies, build system |
| `Pipfile` | Python | packages, dev-packages |
| `go.mod` | Go | module, require |
| `Cargo.toml` | Rust | dependencies, features |
| `Gemfile` | Ruby | gems |
| `*.csproj` | .NET | PackageReference |
| `composer.json` | PHP | require, require-dev |

**Multiple manifests indicate potential monorepo or polyglot project.**

---

### 2. Framework Detection

#### JavaScript/TypeScript Frameworks

| Framework | Detection Signals |
|-----------|-------------------|
| **React** | `react` in dependencies, `.jsx`/`.tsx` files, `React.` imports |
| **Angular** | `@angular/core` in dependencies, `angular.json` config |
| **Vue** | `vue` in dependencies, `.vue` files, `vue.config.js` |
| **Next.js** | `next` in dependencies, `next.config.js`, `pages/` or `app/` dir |
| **Nuxt** | `nuxt` in dependencies, `nuxt.config.ts` |
| **Express** | `express` in dependencies, `app.use()` patterns |
| **NestJS** | `@nestjs/core` in dependencies, `nest-cli.json` |
| **Fastify** | `fastify` in dependencies |
| **Hono** | `hono` in dependencies |

#### Java Frameworks

| Framework | Detection Signals |
|-----------|-------------------|
| **Spring Boot** | `spring-boot-starter-*` dependencies, `@SpringBootApplication` |
| **Quarkus** | `quarkus-*` dependencies, `application.properties/yaml` |
| **Micronaut** | `micronaut-*` dependencies |
| **Jakarta EE** | `jakarta.*` imports, `beans.xml` |

#### Python Frameworks

| Framework | Detection Signals |
|-----------|-------------------|
| **FastAPI** | `fastapi` in requirements, `@app.get`/`@app.post` decorators |
| **Django** | `django` in requirements, `settings.py`, `urls.py` |
| **Flask** | `flask` in requirements, `@app.route` decorators |

#### Go Frameworks

| Framework | Detection Signals |
|-----------|-------------------|
| **Gin** | `gin-gonic/gin` in go.mod |
| **Echo** | `labstack/echo` in go.mod |
| **Fiber** | `gofiber/fiber` in go.mod |
| **Chi** | `go-chi/chi` in go.mod |

---

### 3. Testing Framework Detection

| Framework | Detection Signals |
|-----------|-------------------|
| **Jest** | `jest` in devDependencies, `jest.config.js` |
| **Vitest** | `vitest` in devDependencies, `vitest.config.ts` |
| **Mocha** | `mocha` in devDependencies |
| **Playwright** | `@playwright/test` in devDependencies, `playwright.config.ts` |
| **Cypress** | `cypress` in devDependencies, `cypress.config.ts` |
| **pytest** | `pytest` in requirements, `conftest.py`, `test_*.py` files |
| **JUnit** | `junit` in dependencies, `@Test` annotations |
| **Go testing** | `*_test.go` files |

---

### 4. Build Tool Detection

| Tool | Detection Signals |
|------|-------------------|
| **Webpack** | `webpack.config.js`, `webpack` in devDependencies |
| **Vite** | `vite.config.ts`, `vite` in devDependencies |
| **esbuild** | `esbuild` in devDependencies |
| **Rollup** | `rollup.config.js` |
| **Turbopack** | `turbo.json` with build config |
| **Maven** | `pom.xml`, `mvnw` |
| **Gradle** | `build.gradle(.kts)`, `gradlew` |
| **Make** | `Makefile` |

---

### 5. Monorepo Detection

| Pattern | Detection Signals |
|---------|-------------------|
| **pnpm workspaces** | `pnpm-workspace.yaml`, `packages/` or `apps/` dirs |
| **Yarn workspaces** | `workspaces` in root `package.json` |
| **npm workspaces** | `workspaces` in root `package.json` |
| **Nx** | `nx.json`, `project.json` files |
| **Turborepo** | `turbo.json` |
| **Lerna** | `lerna.json` |
| **Rush** | `rush.json` |
| **Bazel** | `WORKSPACE`, `BUILD` files |

**Monorepo indicators:**
- Root `package.json` with `workspaces` field
- Multiple `package.json` files in subdirectories
- `packages/`, `apps/`, `libs/` directory structure

---

### 6. Infrastructure Detection

| Tool | Detection Signals |
|------|-------------------|
| **Docker** | `Dockerfile`, `docker-compose.yml` |
| **Kubernetes** | `k8s/`, `*.yaml` with `kind: Deployment` |
| **Terraform** | `*.tf` files, `.terraform/` |
| **GitHub Actions** | `.github/workflows/*.yml` |
| **GitLab CI** | `.gitlab-ci.yml` |
| **Jenkins** | `Jenkinsfile` |
| **CircleCI** | `.circleci/config.yml` |

---

### 7. Project Type Classification

Based on detected patterns, classify the project:

| Type | Indicators |
|------|------------|
| **Frontend SPA** | React/Angular/Vue, no server-side code, static hosting config |
| **Full-Stack** | Frontend framework + backend framework in same repo |
| **Backend API** | Express/NestJS/FastAPI/Spring with no frontend |
| **Library** | No app entry point, exports in package.json/pyproject.toml |
| **CLI Tool** | `bin` field in package.json, argument parsing patterns |
| **Microservice** | Docker + API, single-purpose, part of larger system |
| **Monorepo** | Multiple packages/apps, workspace configuration |

---

## Output Format

Generate structured output for consumption by distillation agents:

```yaml
project_mechanics:
  # Primary identifiers
  name: "project-name"
  type: "frontend-spa|backend-api|fullstack|library|cli|microservice|monorepo"

  # Languages
  languages:
    primary: "typescript"
    secondary: ["javascript"]

  # Frameworks
  frameworks:
    frontend:
      - name: "react"
        version: "18.x"
    backend:
      - name: "express"
        version: "4.x"
    testing:
      - name: "jest"
        version: "29.x"
      - name: "playwright"
        version: "1.x"

  # Build infrastructure
  build:
    tool: "vite"
    package_manager: "pnpm"

  # Monorepo (if applicable)
  monorepo:
    enabled: true
    tool: "turborepo"
    packages:
      - name: "web"
        path: "apps/web"
        type: "frontend"
      - name: "api"
        path: "apps/api"
        type: "backend"
      - name: "shared"
        path: "packages/shared"
        type: "library"

  # Infrastructure
  infrastructure:
    containerized: true
    ci_cd: "github-actions"
    deployment: "kubernetes"

  # Detected patterns
  patterns:
    - "feature-flags"
    - "api-versioning"
    - "multi-tenancy"

  # Files analyzed
  analyzed:
    manifest: "package.json"
    config_files:
      - "tsconfig.json"
      - "vite.config.ts"
      - "docker-compose.yml"
```

---

## Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 DETECTION FLOW                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Scan Root Directory                                      │
│     ├── Find package manifests (package.json, pom.xml, etc.) │
│     ├── Find config files (tsconfig, vite, webpack, etc.)    │
│     └── Detect directory structure patterns                  │
│                                                              │
│  2. Parse Manifest Files                                     │
│     ├── Extract dependencies                                 │
│     ├── Identify framework versions                          │
│     └── Detect workspace configuration                       │
│                                                              │
│  3. Analyze Source Files                                     │
│     ├── Scan for import patterns                             │
│     ├── Detect file extensions distribution                  │
│     └── Identify architectural patterns                      │
│                                                              │
│  4. Classify Project                                         │
│     ├── Determine project type                               │
│     ├── Identify primary/secondary languages                 │
│     └── Detect monorepo structure                            │
│                                                              │
│  5. Generate Output                                          │
│     ├── Create structured YAML output                        │
│     └── Store in .shipmate/project-mechanics.yml             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### With Copilot Distillation

The `project_mechanics` output feeds into `@core/agents/copilot-distiller.md` as the `[PROJECT_CONTEXT]` placeholder:

```
copilot-distiller.md receives:
  - project_mechanics.frameworks → Select relevant standards
  - project_mechanics.type → Adjust instruction focus
  - project_mechanics.patterns → Include pattern-specific guidance
```

### With Cursor Rules

Project mechanics inform which `.mdc` rules to generate:
- Frontend framework → `shipmate-{framework}.mdc`
- Testing framework → `shipmate-testing.mdc` with appropriate globs
- Monorepo → Package-specific rules

### With Vision Builder

Extends the vision created by `create-product-vision.md` with technical details:
- Architecture type informs system diagrams
- Framework versions inform tech stack documentation
- Patterns inform domain glossary

---

## Execution

### Via CLI

```bash
shipmate learn  # Runs as part of learn workflow
shipmate init   # Runs during initialization
```

### Manual Invocation

If running manually, execute with architect and analyzer personas:

```
Analyze this codebase and output project mechanics following the
determine-project-mechanics workflow format.

Focus on:
1. Package manifests and dependencies
2. Framework and testing detection
3. Build and infrastructure tools
4. Project type classification
5. Monorepo structure (if any)

Output as structured YAML.
```

---

## Notes

- Detection should be fast (< 10 seconds for typical projects)
- Prefer explicit signals (package.json) over heuristics (file patterns)
- When uncertain, include both possibilities with confidence scores
- Cache results in `.shipmate/project-mechanics.yml` for reuse
- Re-run on `shipmate update` to detect project evolution
