Apply secure Rust practices:
- prefer safe Rust only; identify any unsafe blocks and justify risk.
- enforce type-safe request/response DTOs.
- use crates with strong security history (actix-web, axum).
- validate inputs with typed validators.
- use sqlx query! macros for compile-time parameterized SQL.
- forbid panics in production code paths.
- enforce strict error handling with thiserror or anyhow without leaking internals.
- implement secure session, cookie, and CSRF handling.
- enforce TLS via rustls only.
Generate threat models with CWE mapping.
