# Hotel Booking Portal

A small hotel booking portal for a full-stack interview assignment.

## Project status

Phase 0: repository structure and environment example prepared.
The backend and frontend will be implemented in later phases.

## Local versions

- Java 21.0.7 LTS
- MySQL Community Server 8.0.45

## Repository layout

```text
backend/      Spring Boot application (planned)
frontend/     React application (planned)
db/schema.sql MySQL schema and sample data
docs/         Screenshots (planned)
.env.example  Database environment variable examples
```

`DESIGN.md` and complete run instructions will be added in the documentation phase.

## Database configuration

Credentials must come from environment variables. `.env.example` contains
placeholders only; Spring Boot does not automatically read `.env` files.

Set the variables in PowerShell before running the future backend:

```powershell
$env:DB_URL = 'jdbc:mysql://localhost:3306/hotel_booking?allowPublicKeyRetrieval=true&useSSL=false'
$env:DB_USERNAME = 'your_mysql_username'
$env:DB_PASSWORD = 'your_mysql_password'
```

Replace the username and password placeholders locally. Never save real credentials
in tracked files.

The schema includes five sample hotels. It has been reviewed for syntax but has
not yet been executed against MySQL. Run it once on a fresh database during database
setup; its table creation and sample inserts are not designed for repeated runs.
