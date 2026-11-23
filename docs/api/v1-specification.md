# PACT — API v1 Specification & Conventions

## 1. Base URL & Versioning
- **Local Development**: `http://localhost:8000/api/v1`
- **Production API**: `https://pact-api.onrender.com/api/v1`

All API endpoints must be prefixed with `/api/v1`. Unversioned root endpoints (`/` and `/health`) are strictly reserved for cloud load-balancer health checks and metadata.

---

## 2. Standard Error Envelope (C6 Standard)
All errors returned by the API conform to the uniform C6 envelope:

```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable error description.",
    "details": null
  }
}
```

### Standard Error Codes
- `UNAUTHORIZED` (401): Missing or expired authentication token.
- `FORBIDDEN` (403): User role lacks permission for the requested resource.
- `NOT_FOUND` (404): Requested entity does not exist.
- `VALIDATION_ERROR` (422): Request payload failed schema validation.
- `CONFLICT` (409): State conflict (e.g. attempting to update cart after monthly cutoff lock).
- `INTERNAL_SERVER_ERROR` (500): Unhandled server exception.

---

## 3. Baseline Healthcheck Endpoints

### 3.1 Root Metadata
- **Endpoint**: `GET /`
- **Response**:
```json
{
  "app": "PACT API",
  "environment": "development",
  "version": "0.1.0",
  "status": "online",
  "time_utc": "2026-11-23T14:00:00.000000+00:00"
}
```

### 3.2 Global Health
- **Endpoint**: `GET /health`
- **Response**:
```json
{
  "status": "healthy",
  "service": "pact-api",
  "environment": "development",
  "timestamp": "2026-11-23T14:00:00.000000+00:00"
}
```

### 3.3 Versioned v1 Health
- **Endpoint**: `GET /api/v1/health`
- **Response**:
```json
{
  "status": "healthy",
  "version": "v1",
  "service": "pact-api",
  "environment": "development",
  "timestamp": "2026-11-23T14:00:00.000000+00:00"
}
```
