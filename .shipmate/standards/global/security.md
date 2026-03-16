# Secure Coding Standards

Apply secure-by-default architecture with defense in depth. Reference language-specific rules in `../security/{language}.md`.

## 🚨 Universal NEVER Rules

1. **Never trust any input** - user, API, LLM-generated, file, database
2. **Never expose internal errors** - generic messages only, log details internally
3. **Never hardcode secrets** - use environment variables + secret stores (Vault)
4. **Never use weak crypto** - bcrypt ≥12, AES-256-GCM, TLS 1.2+, secure random only
5. **Never execute unvalidated input** - SQL, NoSQL, OS commands, templates, deserialization
6. **Never skip authorization** - validate permissions on EVERY operation
7. **Never log PII/secrets** - structured logging with sanitization
8. **Never expose entities in APIs** - DTOs only, UUIDs not sequential IDs
9. **Never skip multi-tenancy checks** - EVERY query filtered by tenantId (SaaS)
10. **Never trust LLM output** - validate before execution, sandbox, approval gates

## ✅ Always Required

1. **Input validation** - strict schemas (Zod, Joi, Jakarta Validation, Pydantic)
2. **Output encoding** - prevent XSS/injection in all outputs
3. **Parameterized queries** - zero string concatenation in SQL/NoSQL
4. **Rate limiting** - per-user, per-tenant, per-endpoint
5. **Authentication** - on ALL endpoints except explicitly public
6. **Authorization** - least privilege, resource ownership validation
7. **Audit logging** - all security events (auth, authz, mutations, errors)
8. **Error correlation IDs** - for support tracking without exposing internals
9. **Dependency scanning** - automated CVE checks in CI/CD
10. **Threat modeling** - document attack surface, threats (CWE), mitigations

## 🎯 Multi-Tenancy (CRITICAL for SaaS)

**EVERY database query MUST filter by tenantId** - no exceptions.

Enforce via ORM middleware:
- Prisma: `prisma.$use()` to inject tenantId filter
- TypeORM: QueryBuilder with automatic tenant scope
- JPA/Hibernate: `@Filter` annotation with tenant context

Validate tenant context on EVERY request:
- Extract from JWT claims or headers
- Verify tenant active and user authorized
- Store in request-scoped context (AsyncLocalStorage, ThreadLocal)
- Cross-tenant access = immediate 403 + security alert

## 🤖 AI/LLM Security (Shipmate-Specific)

**Prompt Injection**: Sanitize user input, isolate system prompts, validate LLM responses
**Insecure Output**: NEVER execute raw LLM code without validation + sandbox + approval
**Data Leakage**: Redact PII before LLM processing (email, SSN, API keys, passwords)
**Tool Access**: Risk-based approval gates (Read=safe, Write=approval, Bash=critical)
**Agent Isolation**: Sub-agents cannot escalate parent privileges
**Rate Limiting**: Prevent DoS via expensive LLM calls
**Audit Everything**: Log all LLM calls, tool invocations, agent actions with full context

See `../security/ai-agentic.md` for detailed AI security controls.

## 🔒 Framework Defaults

**Spring Boot**: @PreAuthorize on services, DTOs for APIs, BCrypt, Jackson safe config
**NestJS**: Guards for authz, DTOs with class-validator, Throttler, Helmet
**Express**: Centralized middleware (auth, rate limit, Helmet), error handlers
**Angular**: DomSanitizer, no bypassSecurityTrust*, CSRF tokens, httpOnly cookies
**Go**: context.Context timeouts, parameterized queries, input validation, TLS config
**Python**: Pydantic validation, parameterized queries (ORM), secrets module, HTTPS-only

## 📊 Security Metrics

Track and alert on:
- Authentication failures (≥5 in 15min = alert)
- Authorization denials (unexpected patterns)
- Rate limit violations
- Input validation failures
- Dependency vulnerabilities (CVSS ≥7)
- LLM tool usage (HIGH/CRITICAL risk levels)

## 🔗 Language-Specific Rules

- Java: `@../security/java.md` - Spring Security, Jakarta Validation, JPA
- Node/TS: `@../security/node.md` - NestJS, Prisma, Zod, Helmet
- Angular: `@../security/angular.md` - DomSanitizer, route guards, CSP
- Go: `@../security/go.md` - context.Context, input validation, TLS
- Python: `@../security/python.md` - Pydantic, Django ORM, Fernet
- Rust: `@../security/rust.md` - Safe Rust, sqlx, rustls
- DevOps: `@../security/devops.md` - IAM, secrets, container security
- AI/Agentic: `@../security/ai-agentic.md` - OWASP LLM Top 10, tool controls

## 🎯 Threat Modeling

Every feature document:
- **Attack Surface**: Entry points (APIs, uploads, webhooks, LLM interactions)
- **Threats**: Specific vulnerabilities with CWE IDs (CWE-89, CWE-79, CWE-862, etc.)
- **Mitigations**: Controls implemented (validation, authz, rate limiting)
- **Residual Risk**: Accepted risks with business justification

## 🔗 References

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST SSDF](https://csrc.nist.gov/Projects/ssdf)
