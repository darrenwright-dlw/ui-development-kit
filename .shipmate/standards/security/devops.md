# DevOps / Infrastructure Security Rules

## 🚨 CRITICAL - NEVER Violate

```yaml
# ❌ Embed secrets in code or config
apiKey: "sk-prod-abc123"

# ✅ Use secret management (Vault, AWS Secrets Manager)
apiKey: ${vault:secret/data/api#key}

# ❌ Allow public access by default
SecurityGroupIngress:
  - IpProtocol: tcp
    FromPort: 22
    CidrIp: 0.0.0.0/0

# ✅ Deny all by default, whitelist only
SecurityGroupIngress:
  - IpProtocol: tcp
    FromPort: 443
    CidrIp: 10.0.0.0/8

# ❌ Unencrypted data at rest
resource "aws_s3_bucket" "data" {
  bucket = "my-data"
}

# ✅ Encryption enabled
resource "aws_s3_bucket" "data" {
  bucket = "my-data"
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# ❌ Run containers as root
FROM ubuntu
RUN apt-get install -y app

# ✅ Non-root user, distroless base
FROM gcr.io/distroless/static-debian11
USER nonroot:nonroot
COPY --chown=nonroot:nonroot app /app
```

## 🛡️ IAM & Least Privilege

```yaml
# AWS IAM Policy (least privilege)
# ❌ Overly permissive
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}

# ✅ Specific actions and resources
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::my-bucket/*"
}

# ✅ Deny all by default
{
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["us-east-1"]
    }
  }
}
```

```hcl
# Terraform IAM role with least privilege
resource "aws_iam_role" "app" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "app" {
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "dynamodb:Query"
      ]
      Resource = [
        aws_s3_bucket.data.arn,
        aws_dynamodb_table.items.arn
      ]
    }]
  })
}
```

## 🔐 Secrets Management

```bash
# ❌ NEVER commit secrets
export API_KEY="sk-prod-abc123"
echo "API_KEY=sk-prod-abc123" > .env

# ✅ Use HashiCorp Vault
vault kv put secret/myapp api_key="sk-prod-abc123"
export API_KEY=$(vault kv get -field=api_key secret/myapp)

# ✅ AWS Secrets Manager
aws secretsmanager create-secret \
  --name myapp/api-key \
  --secret-string "sk-prod-abc123"

# Retrieve in application
API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id myapp/api-key \
  --query SecretString \
  --output text)

# ✅ Kubernetes secrets (with encryption at rest)
kubectl create secret generic api-key \
  --from-literal=key=sk-prod-abc123

# Enable encryption at rest
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-key>
```

## 🚫 Network Security

```hcl
# Terraform Security Group (deny by default)
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Application security group"
  vpc_id      = aws_vpc.main.id

  # ✅ Deny all inbound by default (no ingress rules)

  # ✅ Allow specific outbound only
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS to internet"
  }

  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_subnet.database.cidr_block]
    description = "PostgreSQL to database subnet"
  }
}

# ✅ Network ACLs for additional layer
resource "aws_network_acl" "main" {
  vpc_id = aws_vpc.main.id

  # Deny all by default
  ingress {
    protocol   = -1
    rule_no    = 100
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}
```

```yaml
# Kubernetes NetworkPolicy (deny all by default)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# Allow specific traffic only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-policy
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
```

## 🔒 Container Security

```dockerfile
# ❌ Insecure Dockerfile
FROM ubuntu:latest
RUN apt-get update && apt-get install -y app
COPY . /app
CMD ["/app/start.sh"]

# ✅ Secure Dockerfile
FROM gcr.io/distroless/static-debian11:nonroot
# Or use Alpine with specific version
# FROM alpine:3.18

# Create non-root user
USER nonroot:nonroot

# Copy only necessary files with proper ownership
COPY --chown=nonroot:nonroot app /app

# Use specific ENTRYPOINT, not shell
ENTRYPOINT ["/app"]

# Set read-only filesystem
# docker run --read-only --tmpfs /tmp myapp
```

```yaml
# Kubernetes Pod Security
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: app
      image: myapp:1.0
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL

      volumeMounts:
        - name: tmp
          mountPath: /tmp

  volumes:
    - name: tmp
      emptyDir: {}
```

```bash
# Container image scanning
# ✅ Scan with Trivy
trivy image myapp:latest

# ✅ Scan with Grype
grype myapp:latest

# ✅ Sign and verify images (Cosign)
cosign sign myapp:latest
cosign verify myapp:latest --key cosign.pub

# ✅ Use OCI image spec with signatures
docker trust sign myapp:latest
docker trust inspect myapp:latest
```

## 🔒 Kubernetes Security

```yaml
# ❌ Overly permissive RBAC
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: admin
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]

# ✅ Least privilege RBAC
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: myapp
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: myapp
subjects:
  - kind: ServiceAccount
    name: myapp
    namespace: myapp
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# OPA/Gatekeeper policy
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
```

## 📦 Terraform Security

```hcl
# ✅ Enable encryption at rest
resource "aws_s3_bucket" "data" {
  bucket = "myapp-data"

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
        kms_master_key_id = aws_kms_key.s3.arn
      }
    }
  }

  versioning {
    enabled = true
  }

  public_access_block_config {
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }

  logging {
    target_bucket = aws_s3_bucket.logs.id
    target_prefix = "s3-access/"
  }
}

# ✅ Enforce TLS in transit
resource "aws_s3_bucket_policy" "enforce_tls" {
  bucket = aws_s3_bucket.data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyInsecureTransport"
      Effect = "Deny"
      Principal = "*"
      Action = "s3:*"
      Resource = [
        aws_s3_bucket.data.arn,
        "${aws_s3_bucket.data.arn}/*"
      ]
      Condition = {
        Bool = {
          "aws:SecureTransport" = "false"
        }
      }
    }]
  })
}
```

```bash
# Terraform security scanning
# ✅ Use tfsec
tfsec .

# ✅ Use Checkov
checkov -d .

# ✅ Use Terraform Cloud sentinel policies
sentinel apply -trace policy.sentinel
```

## 🔍 CI/CD Security

```yaml
# GitHub Actions secure workflow
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      # ✅ Pin actions to specific SHA
      - uses: actions/checkout@a12a3943b4bdde767164f792f33f40b04645d846 # v3.0.0

      # ✅ Scan for secrets
      - name: Secret scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./

      # ✅ Dependency scan
      - name: Dependency scan
        run: |
          npm audit --audit-level=high
          # or: pip-audit, govulncheck

      # ✅ SAST scanning
      - name: SAST scan
        uses: github/codeql-action/analyze@v2

      # ✅ Container scan
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Scan image
        run: trivy image myapp:${{ github.sha }}

  deploy:
    needs: security-scan
    runs-on: ubuntu-latest
    steps:
      # ✅ Use OIDC instead of long-lived credentials
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActions
          aws-region: us-east-1

      # ✅ Never echo secrets
      - name: Deploy
        run: |
          # ❌ echo "${{ secrets.API_KEY }}"
          kubectl set image deployment/myapp app=myapp:${{ github.sha }}
        env:
          API_KEY: ${{ secrets.API_KEY }} # Available but not logged
```

```bash
# ✅ Validate CI/CD scripts for command injection
# Use shellcheck
shellcheck deploy.sh

# ✅ Pin dependency versions
pip install package==1.2.3
npm install package@1.2.3

# ✅ Verify signatures
cosign verify-attestation myapp:latest --key cosign.pub
```

## 🔍 Monitoring & Audit

```yaml
# CloudWatch Logs encryption
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/app/myapp"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}

# CloudTrail for audit
resource "aws_cloudtrail" "main" {
  name                          = "main-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
}

# GuardDuty for threat detection
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }
}
```

```yaml
# Kubernetes audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all security-related events
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "rolebindings"]

  # Log authentication events
  - level: Metadata
    omitStages: ["RequestReceived"]
    verbs: ["create"]
    resources:
      - group: "authentication.k8s.io"
        resources: ["tokenreviews"]
```

## 🔗 References

- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Docker Security](https://owasp.org/www-project-docker-top-10/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
