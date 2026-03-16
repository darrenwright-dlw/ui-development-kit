# Python Security Rules

## 🚨 CRITICAL - NEVER Violate

```python
# ❌ String interpolation in queries
query = f"SELECT * FROM users WHERE email = '{email}'"

# ✅ Parameterized queries ONLY
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

# ❌ eval() or exec() with user input
eval(user_code)
exec(user_input)

# ✅ Never execute user-controlled code

# ❌ Hardcoded secrets
API_KEY = "sk-prod-abc123"

# ✅ Environment variables with validation
import os
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY not set")

# ❌ Weak random for secrets
import random
token = random.randint(1000, 9999)

# ✅ Cryptographically secure random
import secrets
token = secrets.token_urlsafe(32)

# ❌ Expose internal errors
return {"error": str(e)}, 500

# ✅ Generic error, log internally
correlation_id = str(uuid.uuid4())
logger.error(f"Error: {correlation_id}", exc_info=True)
return {"error": f"Error: {correlation_id}"}, 500
```

## 🛡️ SQL Injection Prevention

```python
# ✅ Django ORM (parameterized by default)
User.objects.filter(email=email)

# ✅ SQLAlchemy with bound parameters
session.query(User).filter(User.email == email)

# ✅ Raw SQL with placeholders
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

# ❌ NEVER use string formatting
cursor.execute(f"DELETE FROM users WHERE id = {user_id}") # SQL injection
cursor.execute("SELECT * FROM users WHERE email = '%s'" % email) # Vulnerable
```

## 🔐 Input Validation

```python
from pydantic import BaseModel, EmailStr, validator
from typing import Optional

# FastAPI with Pydantic validation
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    age: Optional[int] = None

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        return v

    @validator('age')
    def age_range(cls, v):
        if v is not None and (v < 0 or v > 150):
            raise ValueError('Invalid age')
        return v

# Django with serializers
from rest_framework import serializers

class UserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=12, max_length=128)

    def validate_password(self, value):
        if not any(c.isupper() for c in value):
            raise serializers.ValidationError("Must contain uppercase")
        return value
```

## 🔐 Cryptography

```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets
import hashlib

# ✅ Password hashing (use bcrypt or Argon2)
from passlib.hash import argon2

hashed = argon2.hash("password123")
valid = argon2.verify("password123", hashed)

# ✅ Secure token generation
token = secrets.token_urlsafe(32)
token_bytes = secrets.token_bytes(32)

# ✅ Fernet encryption (symmetric)
key = Fernet.generate_key()
f = Fernet(key)
encrypted = f.encrypt(b"secret data")
decrypted = f.decrypt(encrypted)

# ✅ AES-GCM encryption
key = AESGCM.generate_key(bit_length=256)
aesgcm = AESGCM(key)
nonce = secrets.token_bytes(12)
ciphertext = aesgcm.encrypt(nonce, b"plaintext", None)

# ❌ NEVER use weak crypto
import md5
md5.new(password.encode()).hexdigest() # Weak
```

## 🚫 Template Injection Prevention

```python
# Django templates (auto-escape by default)
# ✅ Safe
{{ user_input }}

# ❌ Disable autoescape only with review
{% autoescape off %}
  {{ user_input }}
{% endautoescape %}

# Jinja2 with autoescape
from jinja2 import Environment

# ✅ Autoescape enabled
env = Environment(autoescape=True)
template = env.from_string("Hello {{ name }}")

# ❌ NEVER use format() with user input
template = "Hello {name}".format(name=user_input) # Template injection risk
```

## 🔒 File Operations

```python
import os
from pathlib import Path
import magic

# ✅ Validate file paths
BASE_DIR = Path("/app/uploads")

def validate_path(user_path: str) -> Path:
    # Resolve and clean path
    full_path = (BASE_DIR / user_path).resolve()

    # Ensure path stays within BASE_DIR
    if not str(full_path).startswith(str(BASE_DIR)):
        raise ValueError("Path traversal detected")

    return full_path

# ✅ Validate MIME types
def validate_file(file_path: Path) -> bool:
    mime = magic.from_file(str(file_path), mime=True)
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    return mime in allowed_types

# ❌ Direct path concatenation
file_path = BASE_DIR + "/" + user_input # Vulnerable
```

## 🔐 Django Security Settings

```python
# settings.py

# ✅ HTTPS enforcement
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# ✅ CSRF protection (enabled by default)
MIDDLEWARE = [
    'django.middleware.csrf.CsrfViewMiddleware',
]

# ✅ Secure session cookies
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# ✅ Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ✅ Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")

# ❌ NEVER expose debug in production
DEBUG = False
ALLOWED_HOSTS = ['app.example.com']

# ✅ Secret key from environment
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY not set")
```

## 🔒 FastAPI Security

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

app = FastAPI()
security = HTTPBearer()

# ✅ JWT authentication
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# ✅ Role-based authorization
def require_role(required_role: str):
    async def role_checker(token_data: dict = Depends(verify_token)):
        if required_role not in token_data.get("roles", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return token_data
    return role_checker

# Use in routes
@app.post("/admin/users")
async def create_user(user: UserCreate, _: dict = Depends(require_role("admin"))):
    pass
```

## 📋 Error Handling

```python
import logging
import uuid

logger = logging.getLogger(__name__)

# ✅ Generic errors to client, detailed logs internally
def handle_error(e: Exception) -> dict:
    correlation_id = str(uuid.uuid4())

    # Log with full context
    logger.error(
        f"Error: {correlation_id}",
        exc_info=True,
        extra={
            "correlation_id": correlation_id,
            "error_type": type(e).__name__
        }
    )

    # Generic client response
    return {"error": f"An error occurred: {correlation_id}"}

# Django exception handler
from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        correlation_id = str(uuid.uuid4())
        logger.error(f"Error: {correlation_id}", exc_info=True)
        return Response(
            {"error": f"Error: {correlation_id}"},
            status=500
        )

    return response
```

## 🔍 Logging & Audit

```python
import logging
import structlog

# ✅ Structured logging (NO PII/secrets)
logger = structlog.get_logger()

logger.info(
    "user_login",
    user_id=user.id,
    ip=request.META.get('REMOTE_ADDR')
) # NO passwords

# ✅ Sanitize sensitive data
import re

def sanitize_log(message: str) -> str:
    # Remove common PII patterns
    message = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL_REDACTED]', message)
    message = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN_REDACTED]', message)
    return message

# Audit security events
logger.warning(
    "auth_failure",
    ip=request.META.get('REMOTE_ADDR'),
    reason="invalid_credentials"
)
```

## 📦 Dependency Management

```bash
# Use pip-audit for vulnerability scanning
pip install pip-audit
pip-audit

# Scan dependencies in CI/CD
pip-audit --format json --output audit.json

# Use requirements.txt with exact versions
Django==4.2.7
cryptography==41.0.7
pydantic==2.5.0

# Or use Poetry for dependency management
poetry add django@^4.2
poetry install --no-dev # Production
```

## 🎯 Multi-Tenancy (CRITICAL for SaaS)

```python
# Django middleware for tenant context
from django.utils.deprecation import MiddlewareMixin

class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        tenant_id = self.extract_tenant_id(request)
        if not tenant_id:
            return JsonResponse({"error": "Missing tenant context"}, status=400)
        request.tenant_id = tenant_id

    def extract_tenant_id(self, request):
        # From JWT or header
        token = request.META.get('HTTP_AUTHORIZATION', '').split(' ')[-1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get('tenant_id')

# EVERY query MUST filter by tenant_id
User.objects.filter(tenant_id=request.tenant_id, id=user_id)

# Custom manager to enforce tenant filtering
class TenantManager(models.Manager):
    def get_queryset(self):
        # Get tenant_id from thread-local storage
        tenant_id = get_current_tenant_id()
        return super().get_queryset().filter(tenant_id=tenant_id)

class User(models.Model):
    tenant_id = models.UUIDField()
    objects = TenantManager()
```

## 🔗 References

- [Django Security](https://docs.djangoproject.com/en/stable/topics/security/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [OWASP Python Security](https://owasp.org/www-project-python-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
