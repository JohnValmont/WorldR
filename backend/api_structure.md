# WORLDr API Specification - Phase 1

This document specifies the RESTful endpoints, payloads, JSON validation schemas, and error handling strategies for Phase 1 of WORLDr.

All paths are prefixed with the version namespace: `/api/v1`

---

## 1. Authentication APIs

Endpoints to manage registration, credentials, JWT session token generation, and token rotation.

### 1. `POST /api/v1/auth/register` (Public)
- **Request Body**:
  ```json
  {
    "username": "prime_minister",
    "email": "minister@omnia.gov",
    "password": "StrongSecurePassword123!"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "message": "User registered successfully",
    "userId": "3f6b4e6a-78b1-4f18-a6d1-12c82302e1c9"
  }
  ```

### 2. `POST /api/v1/auth/login` (Public)
- **Request Body**:
  ```json
  {
    "username": "prime_minister",
    "password": "StrongSecurePassword123!"
  }
  ```
- **Response (`200 OK`)**:
  *Sets HTTP-Only, Secure, SameSite=Strict cookie with `refreshToken`*
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "3f6b4e6a-78b1-4f18-a6d1-12c82302e1c9",
      "username": "prime_minister",
      "email": "minister@omnia.gov",
      "role": "user",
      "nationId": "dc02f06b-76ef-46e3-85f2-959c19f07a21"
    }
  }
  ```

### 3. `POST /api/v1/auth/refresh` (Cookie Verification Only)
- **Request**: Cookie `refreshToken`
- **Response (`200 OK`)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

## 2. Nation & History APIs

Endpoints to query live country statistics and historical line-chart trends.

### 1. `GET /api/v1/nations/:nation_id` (User Auth + Nation Access)
- **Response (`200 OK`)**:
  ```json
  {
    "id": "dc02f06b-76ef-46e3-85f2-959c19f07a21",
    "name": "Omnia",
    "treasury": 1021411202.00,
    "debt": 142500000.00,
    "gdp": 412501409211.00,
    "inflationCpi": 0.0185,
    "approval": 0.6820,
    "stability": 0.8140,
    "currentTick": 12
  }
  ```

### 2. `GET /api/v1/nations/:nation_id/history` (User Auth + Nation Access)
- **Query Params**: `limit=36` (ticks limit, defaults to 36)
- **Response (`200 OK`)**:
  ```json
  [
    {
      "tick": 11,
      "gdp": 410210340912.00,
      "inflationCpi": 0.0175,
      "unemploymentRate": 0.0490,
      "approval": 0.6780,
      "stability": 0.8120,
      "treasury": 1017300000.00,
      "debt": 142500000.00
    }
  ]
  ```

---

## 3. Economy & Sectors APIs

Queries sector-specific output, wages, growth, and demographic groupings.

### 1. `GET /api/v1/nations/:nation_id/economy/sectors` (User Auth + Nation Access)
- **Response (`200 OK`)**:
  ```json
  [
    {
      "name": "Agriculture",
      "output": 82000000.00,
      "workers": 120000.00,
      "productivity": 1.0500,
      "wages": 45000.00,
      "growth": 0.0120
    }
  ]
  ```

---

## 4. Law & Policies APIs

Management of nation legislation and modifiers.

### 1. `GET /api/v1/nations/:nation_id/laws` (User Auth + Nation Access)
- **Response (`200 OK`)**:
  ```json
  [
    {
      "id": "fe09e86b-76ef-46e3-85f2-959c19f07122",
      "title": "Minimum Wage Act",
      "description": "Establishes a base productivity-linked wage floor.",
      "status": "passed",
      "effects": [
        {
          "targetType": "sector",
          "targetName": "Agriculture",
          "parameterName": "wages",
          "modifierType": "multiplier",
          "modifierValue": 1.05
        }
      ]
    }
  ]
  ```

### 2. `PATCH /api/v1/nations/:nation_id/laws/:law_id` (User Auth + Nation Access)
- **Request Body**:
  ```json
  {
    "status": "repealed"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "id": "fe09e86b-76ef-46e3-85f2-959c19f07122",
    "status": "repealed"
  }
  ```

---

## 5. Budget & Taxation APIs

Controls spending allocations and taxation rates.

### 1. `GET /api/v1/nations/:nation_id/budget` (User Auth + Nation Access)
- **Response (`200 OK`)**:
  ```json
  {
    "taxes": [
      { "name": "Income Tax", "rate": 0.1800, "revenue": 1450000.00 }
    ],
    "spending": [
      { "name": "Education", "allocation": 4500000.00 }
    ]
  }
  ```

### 2. `PATCH /api/v1/nations/:nation_id/budget` (User Auth + Nation Access)
- **Request Body**:
  ```json
  {
    "taxes": [
      { "name": "Income Tax", "rate": 0.1900 }
    ],
    "spending": [
      { "name": "Education", "allocation": 4800000.00 }
    ]
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "message": "Budget allocation updated successfully"
  }
  ```

---

## 6. Simulation Tick APIs

### 1. `POST /api/v1/nations/:nation_id/ticks` (Admin Role Enforced)
Forcing a tick pushes the monthly simulation calculations.
- **Request**: Empty payload.
- **Response (`202 Accepted`)**:
  ```json
  {
    "message": "Monthly simulation tick queued",
    "jobId": "tick_job_91223"
  }
  ```

---

## 7. Input Validation & Error Handling

### Zod Validation Strategy
All incoming payload shapes are parsed against strict Zod definitions. 
Example validation middleware logic:
```typescript
import { z } from 'zod';

export const RegisterSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8)
});

export const BudgetUpdateSchema = z.object({
  taxes: z.array(z.object({
    name: z.string(),
    rate: z.number().min(0.0).max(1.0)
  })).optional(),
  spending: z.array(z.object({
    name: z.string(),
    allocation: z.number().min(0.0)
  })).optional()
});
```

### Error Payload Standard
All error responses return the same payload shape:
```json
{
  "error": "Short description of what went wrong",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters long"
    }
  ]
}
```

### HTTP Error Code Table

| Status | Code | Scenario |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Request payload fails Zod validation. |
| `401` | `UNAUTHORIZED` | Authorization header token is missing, invalid, or expired. |
| `403` | `FORBIDDEN` | Request is trying to query a nation the user is not assigned to. |
| `404` | `NOT_FOUND` | Nation ID, Law ID, or User ID does not exist in the database. |
| `409` | `DUPLICATE_RESOURCE` | Attempting to register a username or email that already exists. |
| `500` | `INTERNAL_SERVER_ERROR` | Database or Queue exception. |
