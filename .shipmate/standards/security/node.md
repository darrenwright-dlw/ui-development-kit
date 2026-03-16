# Node.js / TypeScript Security Rules

## 🚨 CRITICAL - NEVER Violate

```typescript
// ❌ String concatenation in queries
const query = `SELECT * FROM users WHERE email = '${email}'`

// ✅ Parameterized queries (Prisma/TypeORM)
prisma.user.findMany({ where: { email } })

// ❌ NoSQL injection
User.findOne({ email: req.body.email }) // Client sends { $gt: "" }

// ✅ Validate input first
const { email } = z.object({ email: z.string().email() }).parse(req.body)

// ❌ eval() or Function()
eval(userInput)

// ✅ Never execute user-controlled code

// ❌ Hardcoded secrets
const API_KEY = 'sk-prod-abc123'

// ✅ Environment variables with validation
const env = z.object({ API_KEY: z.string().min(32) }).parse(process.env)

// ❌ Command injection
exec(`cat ${filename}`)

// ✅ spawn() with whitelist
spawn('/usr/bin/app', [validatedArg])

// ❌ Weak randomness
Math.random().toString(36)

// ✅ Cryptographically secure
randomBytes(32).toString('hex')
```

## 🛡️ Authorization & Access Control

```typescript
// Centralized authorization middleware
export const requireRole = (...roles: string[]) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

// NestJS Guards (RECOMMENDED)
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler())
    return roles.some(role => user.roles?.includes(role))
  }
}

// Resource ownership validation
if (document.ownerId !== userId) {
  throw new ForbiddenException('Not authorized')
}

// UUIDs not sequential IDs
model User {
  id String @id @default(uuid())
}
```

## 🔐 Cryptography & Secrets

```typescript
// bcrypt password hashing (cost ≥12)
bcrypt.hash(password, 12)

// AES-256-GCM encryption
const cipher = createCipheriv('aes-256-gcm', key, iv)

// Secure token generation
randomBytes(32).toString('hex')
randomUUID()

// JWT with short TTLs
jwt.sign(payload, secret, { expiresIn: '15m', algorithm: 'HS256' })

// httpOnly cookies
cookie: { httpOnly: true, secure: true, sameSite: 'strict' }
```

## ✅ Input Validation

```typescript
// Zod schemas for ALL inputs (RECOMMENDED)
const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
})

// NestJS class-validator
export class CreateUserDto {
  @IsEmail() @MaxLength(255) email: string
  @IsString() @MinLength(12) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/) password: string
}
```

## 🚫 Common Vulnerabilities

**SQL Injection**: Prisma/TypeORM parameterized queries only, never template strings
**NoSQL Injection**: Validate with Zod/Joi before MongoDB queries
**Command Injection**: spawn() with args array, never exec() with user input
**Path Traversal**: path.resolve() + validate .startsWith(BASE_DIR)
**SSRF**: Whitelist domains, block private IPs with dns.resolve4()
**Template Injection**: Never compile() user input, whitelist templates only
**Prototype Pollution**: Avoid Object.assign() with user input, use Object.create(null)

## 🔒 Security Headers (Helmet.js)

```typescript
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
}))
```

## 📋 Error Handling

```typescript
// Generic errors to client, detailed logs internally
app.use((err: Error, req, res, next) => {
  const correlationId = randomUUID()
  logger.error('Error', { correlationId, err, path: req.path }) // Full stack
  res.status(500).json({ error: 'Error occurred', correlationId }) // Generic
})
```

## 🔍 Rate Limiting

```typescript
// express-rate-limit with Redis
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({ client: redis }),
})

// NestJS Throttler
@Module({
  imports: [ThrottlerModule.forRoot({ ttl: 60, limit: 10 })],
})

// Stricter for auth endpoints
@Throttle(5, 60) // 5 req/min
async login() {}
```

## 🔍 Logging & Audit

```typescript
// Structured logging (NO PII/secrets)
logger.info('Auth success', { userId, ip }) // NO passwords

// Audit security events
logger.warn('Auth failed', { ip, userAgent, reason: 'Invalid credentials' })

// Prisma audit middleware
prisma.$use(async (params, next) => {
  if (['create', 'update', 'delete'].includes(params.action)) {
    await prisma.auditLog.create({ data: { model: params.model, action: params.action } })
  }
  return next(params)
})
```

## 📦 Dependencies

```bash
# npm audit on every build
npm audit --audit-level=high

# dependabot for auto-updates
# Always use package-lock.json, npm ci in production
```

## 🎯 Multi-Tenancy (CRITICAL for SaaS)

```typescript
// EVERY query MUST filter by tenantId
const users = await prisma.user.findMany({
  where: { tenantId: currentTenant.id } // MANDATORY
})

// Prisma middleware enforcement
prisma.$use(async (params, next) => {
  if (!params.args.where) params.args.where = {}
  params.args.where.tenantId = getCurrentTenantId()
  return next(params)
})

// Tenant context with AsyncLocalStorage
const tenantContext = new AsyncLocalStorage<TenantContext>()
export const getTenantContext = () => tenantContext.getStore()!
```

## 🎯 Threat Model Template

Every feature needs:
- Attack surface: APIs, file uploads, webhooks
- Threats: Map to CWE-89, CWE-79, CWE-862, etc.
- Mitigations: Controls implemented
- Residual risk: Document accepted risks

## 🔗 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [NestJS Security](https://docs.nestjs.com/security/)
