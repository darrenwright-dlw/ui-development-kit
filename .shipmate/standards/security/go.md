# Go Security Rules

## 🚨 CRITICAL - NEVER Violate

```go
// ❌ String concatenation in queries
query := "SELECT * FROM users WHERE email = '" + email + "'"

// ✅ Parameterized queries ONLY
db.Query("SELECT * FROM users WHERE email = $1", email)

// ❌ fmt.Sprintf for SQL/commands
cmd := exec.Command("sh", "-c", fmt.Sprintf("cat %s", filename))

// ✅ Use arguments array
cmd := exec.Command("cat", filename)

// ❌ No context timeout
resp, err := http.Get(url)

// ✅ Always use context with timeout
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)

// ❌ Hardcoded secrets
const apiKey = "sk-prod-abc123"

// ✅ Environment variables with validation
apiKey := os.Getenv("API_KEY")
if apiKey == "" {
    log.Fatal("API_KEY not set")
}

// ❌ Expose internal errors
http.Error(w, err.Error(), 500)

// ✅ Generic error, log internally
correlationID := uuid.New()
log.WithField("correlationId", correlationID).Error(err)
http.Error(w, fmt.Sprintf("Error: %s", correlationID), 500)
```

## 🛡️ SQL Injection Prevention

```go
// ✅ database/sql with placeholders
db.Query("SELECT * FROM users WHERE id = $1 AND tenant = $2", userID, tenantID)

// ✅ sqlx with named parameters
db.NamedQuery("SELECT * FROM users WHERE email = :email", map[string]interface{}{
    "email": email,
})

// ✅ GORM parameterized queries
db.Where("email = ?", email).First(&user)

// ❌ NEVER use raw SQL with string concatenation
db.Exec("DELETE FROM users WHERE id = " + userID) // SQL injection
```

## 🔐 Input Validation

```go
import "github.com/go-ozzo/ozzo-validation/v4"

// Validate all input
type UserRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

func (u UserRequest) Validate() error {
    return validation.ValidateStruct(&u,
        validation.Field(&u.Email, validation.Required, is.Email),
        validation.Field(&u.Password, validation.Required, validation.Length(12, 128)),
    )
}

// Use in handlers
func createUser(w http.ResponseWriter, r *http.Request) {
    var req UserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid JSON", 400)
        return
    }
    if err := req.Validate(); err != nil {
        http.Error(w, err.Error(), 400)
        return
    }
    // Process validated input
}
```

## 🔒 Context & Timeouts

```go
// ALWAYS use context for outbound calls
func fetchData(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}

// Database with context
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", userID)
```

## 🔐 Cryptography

```go
import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "crypto/sha256"
    "golang.org/x/crypto/bcrypt"
)

// ✅ Password hashing (cost ≥12)
hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)

// ✅ Secure random generation
token := make([]byte, 32)
if _, err := rand.Read(token); err != nil {
    return err
}

// ✅ AES-256-GCM encryption
func encrypt(plaintext, key []byte) ([]byte, error) {
    block, err := aes.NewCipher(key) // 32 bytes for AES-256
    if err != nil {
        return nil, err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := rand.Read(nonce); err != nil {
        return nil, err
    }

    return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

// ❌ NEVER use weak crypto
md5Hash := md5.Sum([]byte(password)) // Weak
```

## 🚫 Path Traversal Prevention

```go
import (
    "path/filepath"
    "strings"
)

// ✅ Validate file paths
const baseDir = "/app/uploads"

func validatePath(userPath string) (string, error) {
    // Clean and resolve path
    cleanPath := filepath.Clean(userPath)
    fullPath := filepath.Join(baseDir, cleanPath)

    // Ensure path stays within baseDir
    if !strings.HasPrefix(fullPath, baseDir) {
        return "", errors.New("path traversal detected")
    }

    return fullPath, nil
}

// ❌ Direct path concatenation
filePath := baseDir + "/" + userInput // Vulnerable

// ✅ Validated path
filePath, err := validatePath(userInput)
if err != nil {
    return err
}
```

## 🔒 Authorization

```go
// Middleware for role-based access
func requireRole(roles ...string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := getUserFromContext(r.Context())
            if user == nil {
                http.Error(w, "Unauthorized", 401)
                return
            }

            hasRole := false
            for _, role := range roles {
                if user.HasRole(role) {
                    hasRole = true
                    break
                }
            }

            if !hasRole {
                http.Error(w, "Forbidden", 403)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}

// Resource ownership validation
if document.OwnerID != userID {
    http.Error(w, "Forbidden", 403)
    return
}
```

## 🔒 TLS Configuration

```go
import "crypto/tls"

// ✅ Secure TLS config
tlsConfig := &tls.Config{
    MinVersion:               tls.VersionTLS12,
    MaxVersion:               tls.VersionTLS13,
    PreferServerCipherSuites: true,
    CipherSuites: []uint16{
        tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
        tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
        tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
        tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
    },
}

server := &http.Server{
    Addr:      ":8443",
    TLSConfig: tlsConfig,
}

// ❌ Insecure TLS config
tlsConfig.MinVersion = tls.VersionTLS10 // Weak
tlsConfig.InsecureSkipVerify = true // Dangerous
```

## 📋 Error Handling

```go
import (
    "github.com/pkg/errors"
    "github.com/google/uuid"
)

// ✅ Wrap errors without exposing internals
func processRequest(data []byte) error {
    if err := validate(data); err != nil {
        return errors.Wrap(err, "validation failed")
    }
    return nil
}

// ✅ Generic client errors, detailed logs
func handler(w http.ResponseWriter, r *http.Request) {
    correlationID := uuid.New().String()

    if err := processRequest(data); err != nil {
        // Log with full context
        log.WithFields(log.Fields{
            "correlationId": correlationID,
            "error":        err,
            "stack":        fmt.Sprintf("%+v", err), // pkg/errors stack trace
        }).Error("Request failed")

        // Generic client response
        http.Error(w, fmt.Sprintf("Error: %s", correlationID), 500)
        return
    }
}
```

## 🔍 Logging & Audit

```go
import "github.com/sirupsen/logrus"

// ✅ Structured logging (NO PII/secrets)
log.WithFields(logrus.Fields{
    "userId": userID,
    "action": "login",
    "ip":     r.RemoteAddr,
}).Info("User logged in") // NO passwords

// ✅ Sanitize sensitive data
func sanitize(s string) string {
    // Remove common PII patterns
    s = emailRegex.ReplaceAllString(s, "[EMAIL_REDACTED]")
    s = ssnRegex.ReplaceAllString(s, "[SSN_REDACTED]")
    return s
}

// Audit security events
log.WithFields(logrus.Fields{
    "event":  "auth_failure",
    "ip":     r.RemoteAddr,
    "reason": "invalid_credentials",
}).Warn("Authentication failed")
```

## 📦 Dependency Management

```bash
# Use govulncheck for vulnerability scanning
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...

# Scan dependencies in CI/CD
govulncheck -json ./... | jq '.[] | select(.Vulnerability)'

# Use go.mod with exact versions
require (
    github.com/pkg/errors v0.9.1
    golang.org/x/crypto v0.14.0
)

# Update dependencies regularly
go get -u ./...
go mod tidy
```

## 🎯 Multi-Tenancy (CRITICAL for SaaS)

```go
// EVERY query MUST filter by tenantID
type TenantContext struct {
    TenantID string
    UserID   string
}

// Middleware to extract tenant context
func tenantMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tenantID := extractTenantID(r) // From JWT or header
        if tenantID == "" {
            http.Error(w, "Missing tenant context", 400)
            return
        }

        ctx := context.WithValue(r.Context(), "tenantID", tenantID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Use in queries
tenantID := r.Context().Value("tenantID").(string)
db.Query("SELECT * FROM users WHERE tenant_id = $1 AND id = $2", tenantID, userID)
```

## 🔗 References

- [Go Security Policy](https://go.dev/security/policy)
- [OWASP Go SCP](https://owasp.org/www-project-go-secure-coding-practices-guide/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
