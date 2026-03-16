# Angular Security Rules

## 🚨 CRITICAL - NEVER Violate

```typescript
// ❌ Bypass security trust (XSS risk)
this.sanitizer.bypassSecurityTrustHtml(userInput)

// ✅ Use Angular's automatic sanitization
<div [innerHTML]="trustedContent"></div> // Angular sanitizes by default

// ❌ Direct DOM manipulation
document.getElementById('output').innerHTML = userInput

// ✅ Angular template binding
<div>{{ userInput }}</div> // Auto-escaped

// ❌ Dynamic script injection
eval(userCode)
new Function(userCode)()

// ✅ Never execute user-controlled code

// ❌ Hardcoded secrets
const API_KEY = 'sk-prod-abc123'

// ✅ Environment configuration
environment.apiKey

// ❌ Store tokens in localStorage
localStorage.setItem('token', jwt)

// ✅ httpOnly cookies or memory storage
cookie: { httpOnly: true, secure: true, sameSite: 'strict' }
```

## 🛡️ XSS Prevention

```typescript
// Angular's automatic escaping protects against XSS
<div>{{ userInput }}</div> // Safe
<div [textContent]="userInput"></div> // Safe
<img [src]="imageUrl"> // Sanitized
<a [href]="linkUrl">Link</a> // Sanitized

// NEVER bypass unless documented exception with security review
@Component({...})
export class SafeComponent {
  constructor(private sanitizer: DomSanitizer) {}

  // ✅ Sanitize before trusting (rare exceptions only)
  getSafeHtml(html: string): SafeHtml {
    // Must be reviewed and documented
    return this.sanitizer.sanitize(SecurityContext.HTML, html) || ''
  }
}
```

## 🔐 Authentication & Authorization

```typescript
// Route guards (MANDATORY for protected routes)
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const hasRole = this.authService.hasRole(route.data['roles'])
    if (!hasRole) {
      this.router.navigate(['/forbidden'])
    }
    return hasRole
  }
}

// Apply to routes
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [AuthGuard],
  data: { roles: ['ADMIN'] }
}

// Resource ownership validation
if (document.ownerId !== this.authService.userId) {
  throw new Error('Forbidden')
}
```

## 🔒 Secure Storage

```typescript
// ❌ NEVER store tokens in localStorage (XSS vulnerable)
localStorage.setItem('accessToken', token)

// ✅ httpOnly cookies (server-side only)
// Server sets: Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict

// ✅ Memory storage for short-lived tokens
export class TokenService {
  private token: string | null = null

  setToken(token: string): void {
    this.token = token // Memory only, cleared on refresh
  }
}

// ✅ SessionStorage for non-sensitive data only
sessionStorage.setItem('preferences', JSON.stringify(prefs))
```

## 🚫 CSRF Protection

```typescript
// Enable CSRF protection (Angular HttpClient default)
import { HttpClientXsrfModule } from '@angular/common/http'

@NgModule({
  imports: [
    HttpClientXsrfModule.withOptions({
      cookieName: 'XSRF-TOKEN',
      headerName: 'X-XSRF-TOKEN'
    })
  ]
})

// HttpClient automatically includes CSRF token
this.http.post('/api/update', data) // Token auto-attached
```

## 🔍 Input Validation

```typescript
// Client-side validation SUPPLEMENTS server-side (never replaces)
export class UserFormComponent {
  userForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required,
      Validators.minLength(12),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    ]]
  })

  // Server MUST re-validate
  submit(): void {
    if (this.userForm.valid) {
      this.api.createUser(this.userForm.value).subscribe()
    }
  }
}
```

## 🔒 Content Security Policy

```typescript
// Strict CSP headers (server-side)
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline'; // Angular requires inline styles
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'

// ❌ NEVER use 'unsafe-eval' or broad wildcards
script-src * 'unsafe-eval' // Dangerous

// ✅ Whitelist specific domains only
script-src 'self' https://cdn.example.com
```

## 📋 HTTP Security

```typescript
// Use HttpClient with interceptors
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add auth headers
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${this.auth.token}` }
    })
    return next.handle(authReq)
  }
}

// HTTPS only (enforce in environment)
if (location.protocol !== 'https:' && !environment.development) {
  location.replace(`https:${location.href.substring(location.protocol.length)}`)
}
```

## 🎯 Component Security

```typescript
// Prevent prototype pollution
const safeAssign = (target: any, source: any): void => {
  Object.keys(source).forEach(key => {
    if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
      target[key] = source[key]
    }
  })
}

// Safe JSON parsing
try {
  const data = JSON.parse(userInput)
  // Validate schema
  if (!this.validator.validate(data)) {
    throw new Error('Invalid data')
  }
} catch {
  // Handle error
}
```

## 🔗 References

- [Angular Security Guide](https://angular.io/guide/security)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE-79 (XSS)](https://cwe.mitre.org/data/definitions/79.html)
