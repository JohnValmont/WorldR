# WORLDr Authentication & Session Management System

This document specifies the authentication flows, security token strategies, cookie policies, permissions framework, and middleware routing structures for Phase 1 of WORLDr.

---

## 1. Authentication Architecture

The system utilizes a split-token approach: stateless **Access Tokens** for sub-millisecond API authorizations, and stateful, persistent **Refresh Tokens** for secure, long-lived session rotation.

```
[Client App]                              [API Server]                       [Postgres / Redis]
      |                                        |                                     |
      | ------ 1. POST /login ---------------> |                                     |
      |                                        | --- 2. Query user & check hash ---> |
      |                                        | <== Return user record ============ |
      |                                        |                                     |
      |                                        | --- 3. Save refresh token hash ---> |
      |                                        |                                     |
      | <----- 4. Cookie (Refresh) + JSON(Access) -                                  |
      |                                        |                                     |
      |                                        |                                     |
  [Authenticated Requests]                     |                                     |
      | ------ 5. Request with Access Token -> |                                     |
      |                                        | --- 6. Verify JWT in-memory ------> |
      | <----- 7. Return HTTP JSON Response -- |                                     |
```

---

## 2. Token Specifications & Cookie Strategies

### Access Token (JWT)
- **Delivery**: Returned in the HTTP JSON response body upon successful authentication.
- **Lifetime**: 15 minutes.
- **Payload Signature**:
  ```json
  {
    "sub": "3f6b4e6a-78b1-4f18-a6d1-12c82302e1c9",
    "username": "chancellor_prime",
    "role": "user",
    "nationId": "dc02f06b-76ef-46e3-85f2-959c19f07a21",
    "iat": 1782381600,
    "exp": 1782382500
  }
  ```

### Refresh Token (Stateful Session)
- **Delivery**: Returned via an `HTTP-Only`, `Secure`, `SameSite=Strict` cookie.
- **Lifetime**: 7 days.
- **Storage**: The database stores a SHA-256 hash of the generated refresh token string (`refresh_tokens` table) to prevent token theft in the event of read-only DB breaches.
- **Cookie Attribute Setup**:
  - `HttpOnly`: true (Protects token from client-side JavaScript access / XSS).
  - `Secure`: true (Forces delivery over HTTPS only).
  - `SameSite`: 'Strict' (Mitigates Cross-Site Request Forgery / CSRF).
  - `Path`: `/api/v1/auth/refresh` (Restricts cookie access to token renewal endpoint).

---

## 3. Permissions & Role-Based Access Control (RBAC)

### Security Roles
1. **`user`**:
   - Authorized to query their associated `nation_id`.
   - Access to modify allocations, budget distributions, and laws within their nation.
2. **`admin`**:
   - Access to edit global parameters.
   - Authorized to force monthly simulation ticks or toggle tick triggers.
   - Full read/write access on all nations.
3. **`moderator`**:
   - Access to audit logs.
   - Spectator status over player nations (read-only access).

---

## 4. Middleware Implementation Signatures

### 1. `authenticateToken` Middleware (TypeScript)
Verifies the presence and signature of the access JWT in the Authorization header.

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  sub: string;
  username: string;
  role: 'user' | 'admin' | 'moderator';
  nationId: string | null;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    req.user = decoded as TokenPayload;
    next();
  });
}
```

### 2. `requireRole` Middleware
Enforces access rules based on security roles.

```typescript
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permission privileges' });
    }

    next();
  };
}
```

### 3. `requireNationAccess` Middleware
Guarantees that standard users can only access their governing nation.

```typescript
export function requireNationAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { nation_id } = req.params;

  // Admins bypass nation constraints
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.nationId !== nation_id) {
    return res.status(403).json({ error: 'Access forbidden: user is not assigned to this nation' });
  }

  next();
}
```

---

## 5. Auth API Endpoints

| Method | Endpoint | Auth | Request Body | Responses |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | `{ username, email, password }` | `201 Created` |
| `POST` | `/api/v1/auth/login` | Public | `{ username, password }` | `200 OK` + Access Token (Body) + Cookie (Refresh Token) |
| `POST` | `/api/v1/auth/refresh` | Cookie Only | *(Reads refresh cookie)* | `200 OK` + New Access Token |
| `POST` | `/api/v1/auth/logout` | User | None | `204 No Content` + Deletes Cookie + Revokes Token |
| `POST` | `/api/v1/auth/assign-nation` | User | `{ nationId }` | `200 OK` (Maps user to nation, issues updated Access Token) |
