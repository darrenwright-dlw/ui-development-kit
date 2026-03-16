# Java Security Rules (Spring Boot / Jakarta EE)

## 🚨 CRITICAL - NEVER Violate

```java
// ❌ String concatenation in queries
"SELECT * FROM users WHERE email = '" + email + "'"

// ✅ Parameterized queries ONLY
@Query("SELECT u FROM User u WHERE u.email = :email")

// ❌ Deserialize untrusted data
ObjectInputStream.readObject(userInput)

// ✅ Use Jackson with safe config, disable default typing
mapper.deactivateDefaultTyping()

// ❌ Hardcoded secrets
private static final String API_KEY = "sk-prod-..."

// ✅ Externalize all secrets
@Value("${sailpoint.api.key}") private String apiKey

// ❌ Expose entities in APIs
@GetMapping("/users/{id}") public User getUser()

// ✅ Use DTOs exclusively
public UserResponseDTO getUser() → UserMapper.toDTO(user)

// ❌ Execute user input
Runtime.getRuntime().exec("sh -c " + userInput)

// ✅ ProcessBuilder with whitelist + validation
Set<String> ALLOWED = Set.of("backup", "restore")
```

## 🛡️ Authorization & Access Control

```java
// Method-level authorization (MANDATORY)
@PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
public User updateUser(Long userId, UserUpdateDTO dto)

// Resource ownership validation
if (!document.getOwnerId().equals(auth.getPrincipal().getId())) {
    throw new AccessDeniedException("Not authorized");
}

// Use UUIDs not sequential IDs
@Id @GeneratedValue(generator = "UUID") private UUID id;
```

## 🔐 Cryptography & Secrets

```java
// BCrypt password hashing (cost ≥12)
new BCryptPasswordEncoder(12)

// AES-256-GCM for encryption
Cipher.getInstance("AES/GCM/NoPadding")

// Secure random tokens
SecureRandom.getInstanceStrong()

// TLS 1.2+ only
enabledProtocols: TLSv1.2,TLSv1.3
```

## ✅ Input Validation

```java
// Jakarta Validation on ALL DTOs
@NotBlank @Email @Size(min=12, max=128)
@Pattern(regexp="^[a-zA-Z0-9._%+-]+@sailpoint\\.com$")

// Custom validators for complex rules
public class UsernameValidator implements ConstraintValidator<ValidUsername, String> {
    return username.matches("^[a-zA-Z0-9_]+$") &&
           !username.matches("(?i).*(SELECT|DROP|INSERT).*");
}
```

## 🚫 Common Vulnerabilities

**SQL Injection**: Use JPA/Hibernate parameterized queries, never string concat
**LDAP Injection**: Use LdapTemplate.find() with bind variables
**SpEL Injection**: Never parseExpression() with user input
**Path Traversal**: Use Path.normalize(), validate startsWith(BASE_DIR)
**SSRF**: Whitelist domains, block private IPs (10.*, 192.168.*, 127.*)
**XXE**: Disable external entities in XML parsers
**Deserialization**: Disable Java serialization, use JSON with safe config

## 🔒 Spring Security Config

```java
@EnableMethodSecurity(prePostEnabled = true)
http
    .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/health").permitAll()
        .anyRequest().authenticated())
    .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
    .headers(headers -> headers
        .contentSecurityPolicy("default-src 'self'")
        .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31536000))
        .frameOptions(deny())
        .xssProtection(block()))
```

## 📋 Error Handling

```java
// Generic errors to client, detailed logs internal only
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handle(Exception ex) {
        String correlationId = UUID.randomUUID().toString();
        logger.error("Error: {}", correlationId, ex); // Full stack trace
        return ResponseEntity.status(500)
            .body(new ErrorResponse("Error occurred", correlationId)); // Generic message
    }
}
```

## 🔍 Logging & Audit

```java
// Structured logging (NO PII/secrets)
logger.info("Auth success. user={}, ip={}", userId, ip); // NO passwords

// Audit all security events
@Auditable(action = "DELETE_USER", resource = "User")

// Log failures with context
logger.warn("Auth failed. ip={}, reason={}", ip, "Invalid credentials");
```

## 📦 Dependencies

```bash
# Scan on every build
mvn dependency-check:check -DfailBuildOnCVSS=7

# Auto-update via dependabot
# Pin versions, test before upgrading majors
```

## 🎯 Threat Model Template

Every feature needs:
- Attack surface: APIs, file uploads, webhooks
- Threats: Map to CWE-89, CWE-79, CWE-862, etc.
- Mitigations: Controls implemented
- Residual risk: Document accepted risks

## 🔗 References

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Spring Security Docs](https://spring.io/projects/spring-security)
