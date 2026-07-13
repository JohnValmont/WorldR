11_API_SPECIFICATION.md ? Every REST endpoint, request, response, permissions.
# 12_API_SPECIFICATION.md

# Chapter 1 — API Architecture & Design Principles

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This document defines the API architecture used by WORLDr.

The API serves as the single communication layer between clients and the backend services. It exposes gameplay functionality, retrieves simulation data, processes player actions, and coordinates with the Simulation Engine.

The API shall never contain authoritative gameplay logic.

---

# 2. Design Principles

The API follows these principles:

- Stateless
- Secure
- Consistent
- Predictable
- Versioned
- Scalable

Business rules belong in the Simulation Engine.

The API is responsible only for receiving requests, validating inputs, invoking backend services, and returning responses.

---

# 3. High-Level Architecture

```
Client
   │
   ▼
API
   │
   ▼
Simulation Engine
   │
   ▼
Database
```

The client never communicates directly with the database.

All authoritative writes pass through the Simulation Engine.

---

# 4. API Responsibilities

The API is responsible for:

- Authentication
- Request validation
- Response formatting
- Error handling
- Rate limiting
- File uploads
- Invoking simulation services

The API is **not** responsible for gameplay decisions.

---

# 5. API Style

The primary API shall use REST principles.

General conventions:

- Resources use plural nouns
- JSON request and response bodies
- HTTPS only
- UTF-8 encoding
- Consistent HTTP status codes

Examples:

```
GET    /countries

GET    /characters/{id}

POST   /businesses

PATCH  /governments/{id}

DELETE /notifications/{id}
```

Realtime updates are handled separately through Supabase Realtime and WebSockets where appropriate.

---

# 6. Versioning

Public APIs shall be versioned.

Example:

```
/api/v1/...
```

Breaking changes require a new API version.

Non-breaking additions may remain within the same version.

---

# 7. Resource Organization

Endpoints should be grouped by domain.

Examples:

```
/auth

/characters

/countries

/governments

/elections

/businesses

/markets

/citizens

/military

/diplomacy
```

Each resource should have a clearly defined owner.

---

# 8. Error Handling

Errors shall use a consistent structure.

Every error response should include:

- HTTP Status Code
- Error Code
- Human-readable Message
- Request Identifier (when applicable)

Internal implementation details should never be exposed.

---

# 9. Security

Every request shall pass through:

Authentication

↓

Authorization

↓

Validation

↓

Simulation Engine

↓

Database

Players shall only access data they are authorized to view or modify.

---

# 10. Summary

The WORLDr API provides a secure, consistent, and scalable communication layer between clients and the Simulation Engine.

By separating transport concerns from gameplay logic and enforcing standardized request handling, the API remains maintainable, extensible, and suitable for long-term development.

---

# End of Chapter 1
# 12_API_SPECIFICATION.md

# Chapter 2 — Authentication & Authorization

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines how clients authenticate with the WORLDr backend and how requests are authorized before interacting with the Simulation Engine.

Authentication verifies identity.

Authorization determines whether the authenticated actor is permitted to perform the requested action.

Both are mandatory for all protected endpoints.

---

# 2. Authentication Model

WORLDr uses Supabase Authentication as the identity provider.

Authentication supports:

- Email & Password
- Secure Session Tokens
- Token Refresh
- Session Expiration

Future authentication providers may be added without changing the API architecture.

---

# 3. Authentication Flow

```
Player

↓

Login

↓

Supabase Authentication

↓

JWT Access Token

↓

API Request

↓

Token Verification

↓

Authorized Request
```

Every protected request must include a valid authentication token.

---

# 4. Authorization Model

Authorization determines what an authenticated player is allowed to do.

Authorization decisions are based on:

- Player Identity
- Active Character
- Government Position
- Organization Membership
- Ownership
- Simulation State

The Simulation Engine is the authoritative source for gameplay authorization.

---

# 5. Public Endpoints

Some endpoints are available without authentication.

Examples include:

- World Information
- Public Countries
- Public News
- Game Status
- Documentation

Public endpoints shall expose only non-sensitive information.

---

# 6. Protected Endpoints

Protected endpoints require authentication.

Examples include:

- Character Management
- Business Creation
- Government Actions
- Voting
- Banking
- Inventory
- Private Notifications

Unauthenticated requests shall be rejected.

---

# 7. Administrative Endpoints

Administrative endpoints require elevated permissions.

Examples include:

- Server Administration
- Simulation Controls
- World Configuration
- Moderation Tools
- Maintenance Operations

Administrative APIs shall never be accessible through normal player permissions.

---

# 8. Authorization Rules

Every protected request follows the same authorization process.

```
Receive Request

↓

Authenticate Player

↓

Identify Active Character

↓

Verify Permissions

↓

Validate Simulation Rules

↓

Execute Request
```

If authorization fails, the request shall terminate immediately.

---

# 9. Principle of Least Privilege

Clients receive only the permissions necessary to perform their current actions.

Examples:

A citizen may:

- View public information
- Manage personal assets
- Vote (when eligible)

A government official may additionally:

- Approve legislation
- Assign ministries
- Execute executive actions

Permissions should never exceed gameplay responsibilities.

---

# 10. Token Handling

Authentication tokens shall:

- Be transmitted only over HTTPS
- Have limited lifetimes
- Be validated on every request
- Be refreshable through secure mechanisms

Expired or invalid tokens shall require re-authentication.

---

# 11. Error Responses

Authentication and authorization failures shall return standardized responses.

Examples include:

- Authentication Required
- Invalid Token
- Session Expired
- Access Denied
- Insufficient Permissions

Responses should not expose internal security details.

---

# 12. Summary

The WORLDr API uses a layered security model in which Supabase Authentication verifies player identity while the Simulation Engine determines gameplay permissions.

By separating authentication from authorization and applying consistent permission checks to every protected endpoint, the API maintains secure and predictable access control across all gameplay systems.

---

# End of Chapter 2

# 12_API_SPECIFICATION.md

# Chapter 3 — Resource Design & Routing

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines how API resources are organized and how endpoints are structured throughout WORLDr.

A predictable routing structure improves maintainability, simplifies frontend development, and provides a consistent experience for every gameplay system.

All endpoints shall follow the same conventions regardless of domain.

---

# 2. Resource-Oriented Design

The API is organized around resources.

A resource represents a game entity or collection of entities.

Examples include:

- Characters
- Countries
- Governments
- Businesses
- Citizens
- Elections
- Markets
- Notifications

Each resource owns its endpoints.

---

# 3. URL Structure

Endpoints follow a consistent hierarchy.

```
/api/v1/{resource}

/api/v1/{resource}/{id}

/api/v1/{resource}/{id}/{sub-resource}
```

Examples:

```
GET    /api/v1/countries

GET    /api/v1/countries/{id}

GET    /api/v1/countries/{id}/government

GET    /api/v1/businesses/{id}/employees

GET    /api/v1/characters/{id}/inventory
```

URLs should describe resources rather than actions.

---

# 4. HTTP Methods

Standard HTTP methods shall be used consistently.

| Method | Purpose |
|---------|----------|
| GET | Retrieve data |
| POST | Create new resource |
| PATCH | Update existing resource |
| PUT | Replace entire resource (rare) |
| DELETE | Remove or archive resource |

Method usage should remain consistent across all domains.

---

# 5. Route Organization

Endpoints should be grouped by simulation domain.

Examples:

```
/auth

/players

/characters

/world

/countries

/governments

/elections

/businesses

/markets

/population

/military

/diplomacy

/notifications
```

Each domain remains logically independent.

---

# 6. Resource Identifiers

Every resource shall use a unique identifier.

Example:

```
GET /api/v1/characters/5e41d...
```

Clients should treat identifiers as opaque values.

The format of identifiers should not influence application logic.

---

# 7. Query Parameters

Query parameters should be used for filtering, sorting, searching, and pagination.

Examples:

```
GET /businesses?page=2

GET /countries?sort=population

GET /citizens?country_id=123

GET /markets?search=steel
```

Query parameters should never modify server state.

---

# 8. Nested Resources

Nested routes may be used when a child resource naturally belongs to a parent.

Examples:

```
/countries/{id}/regions

/businesses/{id}/employees

/governments/{id}/ministries

/characters/{id}/assets
```

Nesting should generally be limited to one or two levels to keep routes simple.

---

# 9. Bulk Operations

Where appropriate, the API may support operations affecting multiple resources.

Examples:

- Archive Notifications
- Mark Messages as Read
- Update Multiple Assets
- Assign Multiple Employees

Bulk operations should remain explicit and well documented.

---

# 10. Consistency Guidelines

Endpoints should:

- Use plural resource names
- Avoid verbs in URLs
- Follow identical naming conventions
- Return consistent response structures
- Behave predictably across domains

Developers should be able to infer endpoint behavior from its structure.

---

# 11. Summary

The WORLDr API is organized around resource-oriented routing with consistent URL structures, HTTP methods, and naming conventions.

By grouping endpoints into clearly defined domains and following predictable routing standards, the API remains intuitive for developers, scalable for future gameplay systems, and easy to maintain throughout the project's lifetime.

---

# End of Chapter 3

# 12_API_SPECIFICATION.md

# Chapter 4 — Request & Response Standards

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines the standard structure for every request and response exchanged between clients and the WORLDr API.

Consistent request and response formats simplify frontend development, improve debugging, reduce implementation errors, and provide a predictable developer experience across every gameplay system.

All API endpoints shall follow these standards.

---

# 2. Content Type

The API communicates using JSON.

Requests:

```
Content-Type: application/json
```

Responses:

```
Content-Type: application/json
```

Binary data (images, files, etc.) shall use the appropriate upload mechanisms rather than JSON.

---

# 3. Request Structure

Every request consists of:

- HTTP Method
- URL
- Headers
- Optional Query Parameters
- Optional Request Body

Example:

```http
POST /api/v1/businesses

Authorization: Bearer <token>

Content-Type: application/json
```

```json
{
  "name": "Nova Industries",
  "industry": "Manufacturing",
  "country_id": "country_001"
}
```

---

# 4. Request Validation

Every request shall be validated before reaching the Simulation Engine.

Validation includes:

- Required fields
- Data types
- Allowed values
- Length limits
- Enumeration validation
- Identifier format

Invalid requests shall be rejected immediately.

---

# 5. Response Structure

Successful responses should follow a consistent format.

Example:

```json
{
  "success": true,
  "data": { },
  "meta": { }
}
```

Where appropriate:

- `data` contains the requested resource.
- `meta` contains pagination or additional metadata.

---

# 6. Collection Responses

Collection endpoints should return lists using a consistent structure.

Example:

```json
{
  "success": true,
  "data": [
    { },
    { },
    { }
  ],
  "meta": {
    "page": 1,
    "page_size": 25,
    "total": 412
  }
}
```

Large collections should always support pagination.

---

# 7. Resource Responses

Single-resource endpoints return one object.

Example:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "...",
    "status": "..."
  }
}
```

The structure should remain consistent regardless of resource type.

---

# 8. Empty Responses

Operations that do not return resource data should still provide confirmation.

Example:

```json
{
  "success": true,
  "message": "Operation completed successfully."
}
```

---

# 9. Pagination

Endpoints returning large datasets should support pagination.

Metadata should include:

- Current Page
- Page Size
- Total Records
- Total Pages

Clients should never be required to load extremely large datasets in a single request.

---

# 10. Sorting & Filtering

Collection endpoints may support:

Filtering

```
?country_id=...
```

Sorting

```
?sort=population
```

Ordering

```
?order=desc
```

Searching

```
?search=steel
```

Query behavior should be consistent across all endpoints.

---

# 11. Field Selection

Where beneficial, clients may request only specific fields.

Example:

```
GET /api/v1/countries?fields=id,name,population
```

Field selection reduces unnecessary data transfer.

---

# 12. Timestamp Format

All timestamps shall use UTC and ISO 8601 format.

Example:

```
2026-08-14T18:42:31Z
```

Clients are responsible for local timezone conversion.

---

# 13. Numeric Values

Numeric values shall be transmitted as JSON numbers.

Examples include:

- Population
- GDP
- Tax Rate
- Inflation
- Treasury Balance

Formatting for display belongs to the frontend.

---

# 14. Response Consistency

Responses should:

- Follow identical structures
- Use consistent naming
- Return predictable metadata
- Avoid unnecessary nesting
- Exclude internal implementation details

Clients should not require endpoint-specific parsing logic.

---

# 15. Summary

The WORLDr API uses standardized JSON request and response structures to provide a consistent and predictable interface across all gameplay systems.

By enforcing uniform validation, pagination, filtering, metadata, and formatting conventions, the API simplifies client development while remaining scalable and easy to maintain.

---

# End of Chapter 4

# 12_API_SPECIFICATION.md

# Chapter 5 — Error Handling & Validation

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines how the WORLDr API validates requests and reports errors.

Consistent validation and standardized error responses improve developer experience, simplify debugging, reduce client-side complexity, and protect the backend from invalid or malicious requests.

Every endpoint shall follow these standards.

---

# 2. Validation Principles

Every request shall be validated before any business logic executes.

Validation includes:

- Authentication
- Authorization
- Request Format
- Required Fields
- Data Types
- Allowed Values
- Resource Existence
- Simulation Preconditions

Invalid requests shall terminate immediately.

---

# 3. Validation Pipeline

Every request follows the same validation sequence.

```
Receive Request

↓

Authenticate User

↓

Authorize Action

↓

Validate Request

↓

Validate Resource

↓

Simulation Engine

↓

Database
```

Each step must succeed before continuing.

---

# 4. Types of Validation

The API performs multiple validation layers.

## Authentication Validation

Verifies:

- Access Token
- Session Validity
- Token Expiration

---

## Authorization Validation

Verifies:

- Player Permissions
- Character Permissions
- Government Permissions
- Organization Membership

---

## Request Validation

Verifies:

- Required Fields
- Invalid Fields
- Missing Values
- Invalid JSON
- Unsupported Content Types

---

## Resource Validation

Verifies:

- Resource Exists
- Resource Is Active
- Resource Is Accessible

---

## Simulation Validation

Performed by the Simulation Engine.

Examples:

- Character is eligible to vote.
- Business has sufficient funds.
- Election is currently active.
- Law can legally be proposed.

---

# 5. HTTP Status Codes

The API shall use standard HTTP status codes.

| Status | Meaning |
|---------|----------|
| 200 | Success |
| 201 | Resource Created |
| 204 | Success (No Content) |
| 400 | Invalid Request |
| 401 | Authentication Required |
| 403 | Access Denied |
| 404 | Resource Not Found |
| 409 | Conflict |
| 422 | Validation Failed |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

Status codes should accurately describe the outcome of the request.

---

# 6. Error Response Format

Every error shall use the same structure.

Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Tax rate must be between 0 and 100."
  }
}
```

Responses should be easy for clients to parse programmatically.

---

# 7. Error Codes

Every API error should include a stable error code.

Examples:

```
INVALID_REQUEST

INVALID_TOKEN

SESSION_EXPIRED

ACCESS_DENIED

RESOURCE_NOT_FOUND

VALIDATION_ERROR

SIMULATION_RULE_FAILED

RATE_LIMIT_EXCEEDED

INTERNAL_SERVER_ERROR
```

Applications should rely on error codes rather than human-readable messages.

---

# 8. Validation Messages

Messages should:

- Clearly explain the problem
- Avoid exposing internal implementation details
- Be concise
- Be suitable for display to end users when appropriate

Good Example:

```
Business name already exists.
```

Poor Example:

```
Unique constraint violation on businesses_name_index.
```

---

# 9. Unexpected Errors

Unexpected failures should return a generic response.

Example:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred."
  }
}
```

Internal exception details shall never be exposed through the API.

---

# 10. Logging

Errors should be logged according to severity.

Examples include:

- Authentication failures
- Authorization failures
- Validation failures
- Server exceptions
- Database errors
- External service failures

Logs should contain sufficient information for troubleshooting without exposing sensitive data.

---

# 11. Client Responsibilities

Clients should:

- Validate obvious user input before submission
- Handle all documented error codes
- Retry only transient failures where appropriate
- Display meaningful messages to users

Clients should never assume that requests will always succeed.

---

# 12. Summary

The WORLDr API employs a layered validation process and standardized error handling model to ensure reliability, consistency, and security.

By validating requests before execution, returning predictable HTTP status codes and structured error responses, and separating client-facing messages from internal implementation details, the API provides a robust foundation for both frontend development and long-term maintenance.

---

# End of Chapter 5

# 12_API_SPECIFICATION.md

# Chapter 6 — Realtime Communication

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines how real-time communication is implemented within WORLDr.

While most gameplay interactions occur through standard REST API requests, certain systems require immediate updates without requiring clients to repeatedly poll the server.

Realtime communication improves responsiveness while reducing unnecessary network traffic.

---

# 2. Communication Model

WORLDr uses two communication models.

**REST API**

Used for:

- Creating resources
- Updating resources
- Deleting resources
- Fetching persistent data

**Realtime Channels**

Used for:

- Live notifications
- World events
- Chat
- Active gameplay updates
- Simulation broadcasts

Each technology should be used for its intended purpose.

---

# 3. Realtime Technologies

Realtime communication may be provided using:

- Supabase Realtime
- WebSockets

The underlying implementation may evolve without changing the public API.

---

# 4. Event Flow

```
Simulation Engine

↓

Event Generated

↓

Realtime Service

↓

Subscribed Clients

↓

UI Update
```

The Simulation Engine is the only authoritative source of realtime events.

Clients shall never broadcast authoritative gameplay events directly.

---

# 5. Event Categories

Realtime events generally fall into the following categories.

### Personal Events

Visible only to one player.

Examples:

- Notification received
- Business completed production
- Election reminder
- Contract accepted
- Private message

---

### Organization Events

Visible to members of an organization.

Examples:

- Political party announcements
- Company updates
- Military orders
- Government decisions

---

### Country Events

Visible to players within a country.

Examples:

- Election results
- New legislation
- Cabinet changes
- Economic reports
- National emergencies

---

### Global Events

Visible to all connected players.

Examples:

- World announcements
- Server maintenance
- Global rankings
- Major world events
- Seasonal events

---

# 6. Subscriptions

Clients subscribe only to channels they are authorized to receive.

Examples:

```
character

country

business

organization

global
```

Subscriptions should be established after successful authentication.

Unauthorized subscriptions shall be rejected.

---

# 7. Event Structure

Realtime events should follow a consistent format.

Example:

```json
{
  "event": "government.updated",
  "timestamp": "2026-07-15T09:00:00Z",
  "data": {
  }
}
```

Every event should include:

- Event Name
- Timestamp
- Event Data

Additional metadata may be included when necessary.

---

# 8. Connection Management

Clients should:

- Establish a connection after authentication
- Detect connection loss
- Automatically reconnect when appropriate
- Re-subscribe after reconnecting

Temporary network interruptions should not require user intervention.

---

# 9. Reliability

Realtime updates improve responsiveness but should not replace authoritative API requests.

If a realtime event is missed:

- The client should synchronize using the REST API.

The REST API remains the authoritative source for current state.

---

# 10. Security

Realtime communication follows the same security model as the REST API.

Every subscription shall require:

- Authentication
- Authorization
- Channel validation

Players shall only receive events they are permitted to access.

---

# 11. Summary

WORLDr combines REST APIs for authoritative data operations with realtime communication for live updates and notifications.

By separating persistent state changes from event broadcasting and enforcing the same authentication and authorization rules across both systems, the platform delivers a responsive multiplayer experience while preserving consistency and security.

---

# End of Chapter 6

# 12_API_SPECIFICATION.md

# Chapter 7 — Performance, Security & Rate Limiting

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines the operational standards that ensure the WORLDr API remains secure, responsive, and reliable under normal and peak workloads.

The API should provide consistent performance while protecting backend services from abuse, accidental misuse, and malicious activity.

---

# 2. Design Principles

The API shall follow these principles:

- Secure by Default
- Performance Through Simplicity
- Least Privilege
- Fail Gracefully
- Monitor Continuously
- Scale Incrementally

Security and performance shall be considered during design rather than added later.

---

# 3. API Performance

API endpoints should be designed to:

- Return only necessary data
- Minimize response size
- Avoid unnecessary database queries
- Support pagination
- Support efficient filtering
- Minimize processing time

Endpoints should remain predictable regardless of simulation complexity.

---

# 4. Response Time Goals

While exact targets may evolve, the API should strive for:

| Endpoint Type | Target Response Time |
|--------------|----------------------|
| Authentication | < 500 ms |
| Standard Reads | < 300 ms |
| Standard Writes | < 500 ms |
| Complex Searches | < 1000 ms |
| Large Reports | Asynchronous |

Long-running operations should execute as background jobs whenever practical.

---

# 5. Rate Limiting

Rate limiting protects the platform from excessive traffic.

Limits may vary based on endpoint category.

Examples:

| Endpoint Type | Example Strategy |
|--------------|------------------|
| Authentication | Strict limits |
| Public APIs | Moderate limits |
| Gameplay Actions | Player-based limits |
| Administrative APIs | Role-based limits |

Clients exceeding limits should receive a standard rate limit response.

---

# 6. API Security

Every request should be protected through:

- HTTPS
- Authentication
- Authorization
- Input Validation
- Row Level Security (where applicable)
- Parameterized Database Queries

Sensitive operations may require additional verification.

---

# 7. Abuse Prevention

The API should detect and mitigate abusive behavior.

Examples include:

- Excessive request frequency
- Automated account creation
- Brute-force login attempts
- Invalid request flooding
- Suspicious activity patterns

Mitigation strategies should minimize disruption for legitimate players.

---

# 8. Monitoring

Operational metrics should be collected continuously.

Examples include:

- Request Volume
- Average Response Time
- Error Rate
- Authentication Failures
- Rate Limit Violations
- Active Connections
- Endpoint Usage

Monitoring supports capacity planning and operational stability.

---

# 9. Logging

Important API events should be logged.

Examples:

- Authentication attempts
- Administrative actions
- Server errors
- Validation failures
- Rate limit events

Logs should contain sufficient diagnostic information without exposing sensitive data.

---

# 10. Scalability

The API architecture should support future growth through:

- Stateless API servers
- Horizontal scaling
- Load balancing
- Background job processing
- Independent service deployment

Scalability improvements should not require changes to the public API contract.

---

# 11. Summary

The WORLDr API combines secure request handling, efficient resource usage, proactive monitoring, and controlled rate limiting to provide a reliable interface for players and backend systems.

By emphasizing security, observability, and scalable design, the API remains capable of supporting future growth while maintaining a consistent and responsive experience.

---

# End of Chapter 7

# 12_API_SPECIFICATION.md

# Chapter 8 — Implementation Standards

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter establishes the implementation standards for all APIs within WORLDr.

These standards ensure that every endpoint, regardless of gameplay domain, follows the same architectural conventions, naming patterns, security requirements, and quality expectations.

Consistency across the API is essential for long-term maintainability and developer productivity.

---

# 2. Design Principles

Every API implementation shall adhere to the following principles:

- Consistency
- Simplicity
- Predictability
- Security
- Maintainability
- Scalability

When multiple implementation approaches exist, the simplest solution that satisfies the requirements should be preferred.

---

# 3. Endpoint Standards

Every endpoint should:

- Belong to a single domain
- Perform one primary responsibility
- Use the correct HTTP method
- Return standardized responses
- Validate all input
- Require authentication where appropriate

Endpoints should avoid combining unrelated operations.

---

# 4. Naming Conventions

Endpoints shall follow consistent naming rules.

Use:

- lowercase
- plural resource names
- kebab-case only when necessary

Examples:

```
/api/v1/characters

/api/v1/businesses

/api/v1/governments

/api/v1/elections

/api/v1/notifications
```

Avoid:

```
/getCharacters

/createBusiness

/updateGovernment
```

HTTP methods already communicate the intended action.

---

# 5. Business Logic

The API shall not contain gameplay rules.

API responsibilities include:

- Receive request
- Authenticate player
- Authorize request
- Validate input
- Invoke Simulation Engine
- Return response

The Simulation Engine is responsible for all gameplay decisions.

---

# 6. Versioning Policy

API changes shall follow these guidelines.

Non-breaking changes may include:

- New optional fields
- New endpoints
- Performance improvements
- Additional filters

Breaking changes require a new API version.

Existing versions should remain supported until officially deprecated.

---

# 7. Documentation

Every endpoint should be documented with:

- Purpose
- HTTP Method
- Route
- Authentication Requirements
- Request Parameters
- Request Body
- Response Structure
- Possible Error Codes

Documentation should remain synchronized with implementation.

---

# 8. Testing

API implementations should be tested before deployment.

Testing should cover:

- Successful requests
- Invalid requests
- Authentication failures
- Authorization failures
- Validation failures
- Edge cases
- Error handling

Automated testing should be preferred whenever practical.

---

# 9. Observability

API implementations should support operational visibility.

Important information includes:

- Request duration
- Response status
- Error frequency
- Endpoint usage
- Authentication failures

Operational metrics should assist in debugging and performance analysis without exposing sensitive information.

---

# 10. Future Development

Future gameplay modules should integrate into the existing API architecture rather than introducing new communication patterns.

New APIs should:

- Follow established routing conventions
- Use standardized request and response formats
- Respect authentication and authorization rules
- Reuse existing error handling
- Maintain backward compatibility whenever possible

Consistency across domains is more valuable than isolated optimizations.

---

# 11. Compliance Checklist

Before deploying a new endpoint, verify:

- Correct resource ownership
- Appropriate HTTP method
- Route follows naming standards
- Input validation implemented
- Authentication applied
- Authorization verified
- Standard response format used
- Error handling implemented
- Documentation updated
- Tests completed

This checklist represents the minimum implementation standard for all APIs.

---

# 12. Summary

The WORLDr API Specification establishes a unified standard for designing, implementing, securing, and maintaining backend endpoints.

By enforcing consistent routing, standardized request and response formats, layered security, robust validation, and clear implementation practices, the API provides a stable interface between clients and the Simulation Engine while remaining scalable, maintainable, and adaptable to future gameplay systems.

---

# End of Chapter 8

# End of Document