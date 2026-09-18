# Frontend Architecture Specification

## 1. Purpose

This document defines the architecture and coding rules for an Astro + Lit frontend application.

The architecture is designed around these principles:

- Astro is responsible for application composition, routing, SSR and page-level composition.
- Lit Web Components are responsible for presentation and user interaction.
- Services are responsible for application state, data orchestration and communication with APIs.
- Request execution is centralized and reusable.
- AI requests use an OmniRoute-inspired routing architecture.
- Domain modules communicate through events instead of direct coupling.
- A top-level Application Orchestrator coordinates cross-domain workflows.
- Web Components must not directly call APIs.
- Domain components must not directly depend on other domain components.
- Each domain in `webs/` has exactly one directory level.
- Each web domain may contain `tool/` for helper JavaScript and `style/` for CSS.

---

# 2. High-Level Architecture

```text
                         ASTRO
                           │
                  Routing / SSR / Pages
                           │
                           ▼
                    Application Shell
                           │
                           ▼
                Application Orchestrator
                           │
                     Event Bus
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
        AUTH            BILLING             AI
        domain          domain            domain
          │                │                │
          ▼                ▼                ▼
      Lit Web          Lit Web          Lit Web
      Components       Components       Components
          │                │                │
          └────────────────┼────────────────┘
                           │
                         Events
                           │
                           ▼
                        Services
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         Request       AI Router     State/Data
         Engine
              │            │
              │      ┌─────┼─────┐
              │      ▼     ▼     ▼
              │   OpenAI  Gemini Anthropic
              │
              ▼
          External APIs
```

---

# 3. Architectural Layers

The application consists of five major layers.

```text
┌───────────────────────────────────────────┐
│ ASTRO                                     │
│ SSR / Routing / Page Composition           │
├───────────────────────────────────────────┤
│ WEBS                                      │
│ Lit Web Components / Presentation          │
├───────────────────────────────────────────┤
│ APPLICATION                               │
│ Event Bus / Application Orchestrator       │
├───────────────────────────────────────────┤
│ SERVICES                                  │
│ State / Data / Request / Routing           │
├───────────────────────────────────────────┤
│ PROVIDERS                                 │
│ REST / GraphQL / AI / Auth / External API  │
└───────────────────────────────────────────┘
```

## Layer responsibilities

### Astro

Astro is responsible for:

- routing
- SSR
- page composition
- layouts
- initial server-side data
- loading web components
- composing application shells

Astro should NOT contain:

- domain business logic
- retry logic
- API orchestration
- AI provider selection
- complex application state

---

### Webs

`webs/` contains Lit Web Components.

Web Components are responsible for:

- rendering UI
- receiving properties
- handling user interaction
- dispatching UI events
- responding to application events
- reflecting service state into UI

Web Components must NOT:

- call REST APIs directly
- call AI providers directly
- contain authentication logic
- contain retry logic
- contain provider routing logic
- import another domain's component
- own global application state

---

### Application

The application layer contains:

- Event Bus
- Application Orchestrator
- cross-domain workflow coordination
- application-level event contracts

The Application layer decides:

```text
"What should happen next?"
```

It does not implement low-level API details.

---

### Services

Services are the main application/data layer.

A Service is NOT merely an API wrapper.

A Service is responsible for:

- application state
- data normalization
- request orchestration
- API communication through Request Engine
- handling request lifecycle
- exposing domain state
- publishing domain events
- consuming relevant domain events
- invoking AI routing when required

Services answer:

```text
"How should this domain perform its operation?"
```

---

### Providers

Providers represent external systems:

- REST APIs
- GraphQL APIs
- authentication APIs
- AI providers
- third-party services

Providers must be accessed through the appropriate Service or infrastructure layer.

Web Components must never access providers directly.

---

# 4. Source Code Structure

The source tree should follow this structure:

```text
src/
│
├── app/
│   ├── app.js
│   ├── orchestrator.js
│   └── events/
│       ├── event-bus.js
│       ├── event-map.js
│       └── event-types.js
│
├── services/
│   │
│   ├── core/
│   │   ├── request-executor.js
│   │   ├── request-state.js
│   │   ├── request-error.js
│   │   ├── retry-policy.js
│   │   ├── auth-policy.js
│   │   └── rate-limit-policy.js
│   │
│   ├── router/
│   │   ├── router.js
│   │   ├── routing-strategy.js
│   │   ├── provider-registry.js
│   │   └── health-registry.js
│   │
│   ├── api/
│   │   ├── api-service.js
│   │   └── api-client.js
│   │
│   ├── ai/
│   │   ├── ai-service.js
│   │   ├── ai-router.js
│   │   └── ai-request.js
│   │
│   ├── auth/
│   │   ├── auth-service.js
│   │   ├── session-service.js
│   │   └── user-service.js
│   │
│   └── providers/
│       ├── openai/
│       ├── anthropic/
│       ├── google/
│       └── ...
│
├── webs/
│   │
│   ├── auth/
│   │   ├── svc-sign-up.js
│   │   ├── svc-sign-in.js
│   │   ├── svc-waitlist.js
│   │   ├── svc-user-button.js
│   │   ├── svc-user-profile.js
│   │   ├── tool/
│   │   │   ├── validation.js
│   │   │   ├── formatter.js
│   │   │   └── mapper.js
│   │   └── style/
│   │       ├── sign-up.css
│   │       ├── sign-in.css
│   │       ├── waitlist.css
│   │       ├── user-button.css
│   │       └── user-profile.css
│   │
│   ├── billing/
│   │   ├── svc-pricing.js
│   │   ├── svc-checkout.js
│   │   ├── svc-subscription.js
│   │   ├── tool/
│   │   └── style/
│   │
│   ├── ai/
│   │   ├── svc-chat.js
│   │   ├── svc-prompt-input.js
│   │   ├── svc-model-selector.js
│   │   ├── svc-generation-status.js
│   │   ├── tool/
│   │   └── style/
│   │
│   └── common/
│       ├── svc-button.js
│       ├── svc-modal.js
│       ├── svc-toast.js
│       ├── tool/
│       └── style/
│
└── types/
    ├── api.js
    ├── auth.js
    ├── ai.js
    └── events.js
```

---

# 5. Webs Directory Rule

The `webs/` directory MUST contain domain directories only.

Correct:

```text
webs/
├── auth/
├── billing/
├── ai/
├── organization/
└── dashboard/
```

Incorrect:

```text
webs/
├── components/
├── buttons/
├── forms/
├── modals/
└── auth/
```

Do not create nested domain/component directories such as:

```text
webs/auth/sign-in/
webs/auth/sign-up/
```

Instead:

```text
webs/auth/
├── svc-sign-up.js
├── svc-sign-in.js
├── svc-waitlist.js
└── svc-user-profile.js
```

The domain itself is the first-level boundary.

---

# 6. `svc-*` Naming Convention

Every Lit Web Component in `webs/` should use:

```text
svc-<feature>.js
```

Examples:

```text
svc-sign-up.js
svc-sign-in.js
svc-waitlist.js
svc-user-button.js
svc-user-profile.js
```

The `svc-` prefix identifies a user-facing service component / web component.

The filename should describe the business capability rather than the technical implementation.

Prefer:

```text
svc-sign-in.js
```

over:

```text
login-form.js
```

Prefer:

```text
svc-user-profile.js
```

over:

```text
profile-component.js
```

---

# 7. Domain Layer Example: Auth

The Auth domain may expose:

```text
webs/auth/

├── svc-sign-up.js
├── svc-sign-in.js
├── svc-waitlist.js
├── svc-user-button.js
├── svc-user-profile.js
│
├── tool/
│   ├── validation.js
│   ├── formatter.js
│   └── mapper.js
│
└── style/
    ├── sign-up.css
    ├── sign-in.css
    ├── waitlist.css
    ├── user-button.css
    └── user-profile.css
```

### `svc-sign-up.js`

Provides the registration UI.

Responsibilities:

- render signup form
- validate basic UI input
- dispatch signup event
- display loading state
- display success state
- display errors
- react to auth events

It must NOT directly call:

```javascript
fetch('/api/auth/signup');
```

---

### `svc-sign-in.js`

Provides authentication UI.

It can support:

- password login
- OAuth / Google SSO
- MFA
- passkeys
- enterprise SSO

The component does not implement the authentication protocols.

It delegates authentication to:

```text
UI
 ↓
Event
 ↓
Application Orchestrator
 ↓
AuthService
 ↓
RequestExecutor
 ↓
Auth Provider
```

---

### `svc-waitlist.js`

Responsible for:

- collecting user interest
- dispatching waitlist signup event
- displaying state
- handling success/failure

Backend/API logic remains outside the component.

---

### `svc-user-button.js`

Responsible for:

- rendering current user avatar
- opening account menu
- displaying authentication state
- dispatching sign-out event

It receives user/session state from the application layer.

---

### `svc-user-profile.js`

Responsible for:

- profile rendering
- profile editing UI
- security settings UI
- dispatching profile update events

The component does not directly manage API requests.

---

# 8. `tool/` Directory

Each domain may contain a `tool/` directory.

Example:

```text
webs/auth/tool/
├── validation.js
├── formatter.js
└── mapper.js
```

`tool/` contains small domain-local helpers.

Examples:

```javascript
validateEmail()
validatePassword()
formatUserName()
mapAuthError()
normalizeProfile()
```

Tools should be:

- pure where possible
- small
- reusable within the domain
- independent of Lit rendering

Do NOT put application state into `tool/`.

Do NOT put API calls into `tool/`.

Do NOT put cross-domain business logic into `tool/`.

---

# 9. `style/` Directory

Each domain may contain:

```text
style/
```

Example:

```text
webs/auth/style/
├── sign-up.css
├── sign-in.css
├── user-button.css
└── user-profile.css
```

CSS should remain close to its domain.

Do not place business logic in CSS.

Components should import only the styles they require.

---

# 10. Component Architecture

Every Lit component follows this conceptual model:

```text
                  Lit Component
                       │
        ┌──────────────┼──────────────┐
        │              │              │
      Input          State         Events
        │              │              │
        ▼              ▼              ▼
      Props        UI State       CustomEvent
```

A component should primarily perform:

```text
render()
handleUserInput()
dispatchEvent()
consumeState()
```

A component should NOT perform:

```text
fetch()
retry()
provider selection
authentication
rate-limit handling
AI routing
global state mutation
```

---

# 11. Event-Driven Communication

Domains must communicate through events.

Example:

```text
Auth
 │
 │ auth.signed-in
 ▼
Event Bus
 │
 ├──────► Dashboard
 │
 ├──────► UserButton
 │
 ├──────► Billing
 │
 └──────► Notification
```

Auth does not need to know that Billing exists.

Auth only publishes:

```javascript
auth.signed-in
```

Other domains subscribe to that event if needed.

---

# 12. Event Bus

The Event Bus is the communication infrastructure.

Conceptually:

```javascript
eventBus.emit('auth.signed-in', {
  user,
  session
});
```

Subscription:

```javascript
eventBus.on('auth.signed-in', ({ user, session }) => {
  // react to event
});
```

The Event Bus must support:

- subscribe
- unsubscribe
- publish
- typed/defined event contracts
- cleanup

Avoid anonymous permanent listeners that can create memory leaks.

---

# 13. Event Naming Convention

Use domain-oriented event names.

Recommended:

```text
auth.sign-in-requested
auth.signed-in
auth.sign-out-requested
auth.signed-out

api.request-started
api.request-succeeded
api.request-failed
api.request-retrying

ai.generation-started
ai.generation-completed
ai.generation-failed
ai.provider-fallback

user.profile-updated

billing.checkout-started
billing.checkout-completed
billing.checkout-failed
```

Events should describe something that happened or an explicit command/request.

---

# 14. UI Events vs Application Events

There are two event levels.

## UI events

Used between Web Components and the Application layer.

Example:

```javascript
this.dispatchEvent(
  new CustomEvent('auth:sign-in', {
    detail: {
      email,
      password
    },
    bubbles: true,
    composed: true
  })
);
```

## Application events

Used between Services and Application modules.

Example:

```javascript
eventBus.emit('auth.signed-in', {
  user,
  session
});
```

Do not force every internal service interaction through DOM events.

Use:

```text
DOM CustomEvent
```

for UI boundaries.

Use:

```text
Application Event Bus
```

for application/domain boundaries.

---

# 15. Application Orchestrator

The Application Orchestrator is the top-level coordinator.

It answers:

```text
"What should happen next?"
```

It does not implement low-level business logic.

Example:

```text
svc-sign-in
      │
      │ auth:sign-in
      ▼
Application Orchestrator
      │
      ▼
AuthService.signIn()
      │
      ▼
RequestExecutor
      │
      ▼
Authentication API
      │
      ▼
auth.signed-in
      │
      ├────────► UserButton
      ├────────► Dashboard
      └────────► Billing
```

The Orchestrator may coordinate multiple services:

```text
auth.signed-in
      │
      ▼
Orchestrator
      │
      ├── UserService.load()
      ├── BillingService.load()
      ├── NotificationService.load()
      └── DashboardService.initialize()
```

The Orchestrator should NOT implement these services internally.

---

# 16. Service Architecture

A Service represents a domain/application capability.

Example:

```text
AuthService

State
├── status
├── user
├── session
├── permissions
└── error

Actions
├── signIn()
├── signUp()
├── signOut()
├── refreshSession()
└── updateProfile()
```

A service owns domain state.

Example:

```javascript
class AuthService {
  state = {
    status: 'idle',
    user: null,
    session: null,
    error: null
  };

  async signIn(credentials) {
    // delegate to request infrastructure
  }
}
```

The Service should expose state changes to the application layer.

---

# 17. Request Engine

All API requests should pass through a common Request Engine.

Do not duplicate request infrastructure inside every Service.

Architecture:

```text
AuthService ─────┐
UserService ─────┤
BillingService ──┤
ProductService ──┤
AIService ───────┘
                  │
                  ▼
           RequestExecutor
                  │
       ┌──────────┼──────────┐
       │          │          │
      Auth    RateLimit    Retry
       │          │          │
       └──────────┼──────────┘
                  │
                  ▼
              Provider
```

The Request Engine is responsible for common request behavior.

---

# 18. Request Lifecycle

A request has a lifecycle.

```text
IDLE
 │
 ▼
PENDING
 │
 ├── AUTH
 │
 ├── RATE_LIMIT
 │
 ├── ROUTING
 │
 └── PROVIDER
       │
       ├──────────────► SUCCESS
       │
       ▼
     ERROR
       │
       ▼
     RETRY
       │
       ├──────────────► SUCCESS
       │
       ▼
     FAILED
```

Request state should distinguish:

```text
status
phase
attempt
data
error
```

Example:

```javascript
{
  status: 'pending',
  phase: 'rate-limit',
  attempt: 1,
  data: null,
  error: null
}
```

---

# 19. Request State

Recommended model:

```javascript
{
  status:
    'idle'
    | 'pending'
    | 'success'
    | 'failed',

  phase:
    'auth'
    | 'rate-limit'
    | 'routing'
    | 'provider'
    | 'retry'
    | 'resolve'
    | 'reject',

  attempt: Number,

  data: unknown,

  error: AppError | null
}
```

This is preferable to:

```javascript
{
  loading: true
}
```

because the UI can display meaningful progress.

For example:

```text
pending + auth
→ "Authenticating..."

pending + rate-limit
→ "Checking availability..."

pending + routing
→ "Selecting provider..."

pending + provider
→ "Processing..."

pending + retry
→ "Retrying..."
```

---

# 20. Normal API Flow

Normal API requests follow:

```text
Request
  │
  ▼
Authentication
  │
  ▼
Rate Limit
  │
  ▼
Loading
  │
  ├──────────────► Resolve
  │                   │
  │                   ▼
  │                SUCCESS
  │
  ▼
Reject
  │
  ▼
Retry Policy
  │
  ├──────────────► Request again
  │
  ▼
FAILED
```

Retry should be configurable.

Example:

```javascript
{
  retry: {
    enabled: true,
    attempts: 1,
    delay: 500
  }
}
```

---

# 21. Retry Rules

Retry must NOT blindly retry every error.

Default behavior should follow error semantics.

Do not retry by default:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
422 Validation Error
```

Potentially retry:

```text
408 Request Timeout
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout
Network Error
```

The retry policy must be configurable.

Example:

```javascript
const retryPolicy = {
  enabled: true,
  attempts: 1,
  delay: 500,
  exponentialBackoff: false
};
```

For `429`, respect provider/server retry hints such as `Retry-After` where available.

---

# 22. Error Normalization

External providers can return completely different error structures.

Do not expose raw provider errors directly to Web Components.

Normalize them:

```text
Provider Error
      │
      ▼
RequestError
      │
      ▼
AppError
      │
      ▼
Service State
      │
      ▼
Web Component
```

Example:

```javascript
{
  code: 'RATE_LIMITED',
  message: 'Request rate limit exceeded',
  status: 429,
  retryable: true,
  provider: 'provider-name',
  requestId: '...'
}
```

The UI should not need to understand provider-specific error formats.

---

# 23. AI Architecture

AI requests are different from normal API requests.

They must use an OmniRoute-inspired architecture.

```text
AIService
    │
    ▼
AIRequest
    │
    ▼
AIRouter
    │
    ├── capability
    ├── model
    ├── provider health
    ├── rate limit
    ├── quota
    ├── cost
    ├── latency
    ├── context window
    └── routing strategy
    │
    ▼
Provider Adapter
    │
    ├── OpenAI
    ├── Anthropic
    ├── Google
    ├── DeepSeek
    └── Other Providers
```

The AI Service should never contain provider-selection logic.

---

# 24. AI Routing

AI routing should support strategies such as:

```text
priority
weighted
round-robin
fastest
cheapest
fallback
auto
```

Example:

```javascript
await aiService.generate({
  model: 'auto',
  capability: 'coding',

  messages,

  routing: {
    strategy: 'fallback',
    maxAttempts: 3
  }
});
```

Possible flow:

```text
AI Request
    │
    ▼
Provider A
    │
    ├── success → response
    │
    └── 429
          │
          ▼
      Provider B
          │
          ├── success → response
          │
          └── timeout
                │
                ▼
            Provider C
                │
                ▼
              success
```

This behavior should be transparent to the Web Component.

---

# 25. Provider Adapter

Every external AI provider should have an adapter.

Example:

```text
providers/
├── openai/
│   └── adapter.js
├── anthropic/
│   └── adapter.js
├── google/
│   └── adapter.js
└── deepseek/
    └── adapter.js
```

All adapters should implement a common interface.

Conceptually:

```javascript
class ProviderAdapter {
  async generate(request) {}
  async healthCheck() {}
}
```

The AI Router talks to the common adapter interface instead of provider-specific APIs.

---

# 26. AI Fallback

AI fallback is different from normal API retry.

Normal API retry:

```text
same request
    ↓
same provider
    ↓
retry
```

AI fallback:

```text
request
   ↓
Provider A
   ↓
failure
   ↓
Provider B
   ↓
failure
   ↓
Provider C
```

These mechanisms must remain conceptually separate.

```text
Retry Policy
```

handles repeating an operation.

```text
AI Routing Policy
```

handles changing provider/model.

---

# 27. Service vs Web Component

The separation must remain strict.

## Web Component

```text
User interaction
      ↓
dispatch event
      ↓
render state
```

## Service

```text
receive intent
      ↓
execute operation
      ↓
manage state
      ↓
publish result
```

Example:

```text
<svc-sign-in>
      │
      │ auth:sign-in
      ▼
Application Orchestrator
      │
      ▼
AuthService
      │
      ▼
RequestExecutor
      │
      ▼
Auth API
```

Never:

```text
<svc-sign-in>
      │
      ▼
fetch()
```

---

# 28. Cross-Domain Independence

Domains must be independently understandable.

For example:

```text
Auth
Billing
AI
Dashboard
Notification
```

should not directly import each other's Web Components.

Avoid:

```javascript
import Billing from '../billing/svc-billing.js';
```

inside Auth.

Instead:

```text
Auth
 │
 └── auth.signed-in
          │
          ▼
       Event Bus
          │
          ▼
       Billing
```

This creates loose coupling.

---

# 29. Event Contract Example

Use a centralized event contract.

```javascript
const EventMap = {
  'auth.sign-in-requested': {
    email: '',
    password: ''
  },

  'auth.signed-in': {
    user: null,
    session: null
  },

  'auth.signed-out': {
    reason: null
  },

  'api.request-started': {
    requestId: ''
  },

  'api.request-succeeded': {
    requestId: '',
    data: null
  },

  'api.request-failed': {
    requestId: '',
    error: null
  },

  'ai.generation-started': {
    requestId: ''
  },

  'ai.generation-completed': {
    requestId: '',
    response: null
  },

  'ai.generation-failed': {
    requestId: '',
    error: null
  },

  'ai.provider-fallback': {
    requestId: '',
    from: '',
    to: ''
  }
};
```

The event contract is part of the application's public internal API.

Do not casually rename events without updating consumers.

---

# 30. State Flow

The standard state flow should be:

```text
USER ACTION
    │
    ▼
WEB COMPONENT
    │
    │ event
    ▼
APPLICATION ORCHESTRATOR
    │
    ▼
SERVICE
    │
    ▼
REQUEST ENGINE
    │
    ▼
API / AI ROUTER
    │
    ▼
RESPONSE
    │
    ▼
SERVICE STATE
    │
    │ domain event
    ▼
EVENT BUS
    │
    ▼
WEB COMPONENTS
    │
    ▼
UI UPDATE
```

This flow should be preferred over direct component-to-service-to-component communication.

---

# 31. State Ownership

State must have a clear owner.

### Component state

Temporary UI-only state:

```text
dropdownOpen
inputValue
focused
local validation message
```

### Service state

Application/domain state:

```text
currentUser
session
subscription
AI generation
API request
permissions
```

### Orchestrator state

Workflow state:

```text
initialization
cross-domain coordination
startup sequence
global workflow
```

Do not duplicate the same application state in multiple components.

---

# 32. Data Normalization

Services should normalize API responses before exposing them.

Example:

```text
Raw Provider Response
        ↓
API Client
        ↓
Response Mapper
        ↓
Domain Model
        ↓
Service State
        ↓
Web Component
```

Components should consume domain models, not provider-specific response formats.

---

# 33. Astro Integration

Astro should compose the application.

Example conceptual flow:

```text
Astro Page
   │
   ├── App Shell
   │
   ├── Auth Web Components
   │
   ├── Dashboard Web Components
   │
   └── AI Web Components
```

Astro may provide initial SSR data.

After hydration:

```text
Lit Components
      ↓
Application Layer
      ↓
Services
```

takes ownership of interactive application behavior.

---

# 34. Dependency Direction

Dependencies should flow downward:

```text
Astro
  ↓
Web
  ↓
Application
  ↓
Services
  ↓
Infrastructure / Providers
```

Avoid upward dependencies.

For example:

```text
Service → Lit Component
```

is forbidden.

Instead:

```text
Service
  ↓
Event / State
  ↓
Web Component
```

---

# 35. Forbidden Patterns

The following patterns are prohibited.

## Direct API calls from components

```javascript
class SignIn extends LitElement {
  async login() {
    return fetch('/api/login');
  }
}
```

Forbidden.

---

## AI provider calls from components

```javascript
await openai.chat.completions.create(...)
```

Forbidden.

---

## Duplicate retry logic

```javascript
try {
  await fetch(...)
} catch {
  await fetch(...)
}
```

inside individual components/services is forbidden when RequestExecutor can handle it.

---

## Provider-specific UI logic

Do not write:

```javascript
if (provider === 'openai') {
  ...
}
```

inside Lit components.

---

## Direct domain component imports

Avoid:

```javascript
import UserButton from '../auth/svc-user-button.js';
```

from another domain.

Use events and application orchestration.

---

## Global mutable state inside `webs/`

Do not create:

```javascript
window.appState = {};
```

inside a web domain.

Application state belongs to Services/Application.

---

# 36. Configuration

Request behavior should be configurable.

Example:

```javascript
const requestConfig = {
  auth: {
    required: true
  },

  rateLimit: {
    enabled: true
  },

  retry: {
    enabled: true,
    attempts: 1,
    delay: 500
  },

  timeout: 30000
};
```

AI configuration:

```javascript
const aiConfig = {
  routing: {
    strategy: 'auto',
    maxAttempts: 3
  }
};
```

Configuration should not be hard-coded into individual Web Components.

---

# 37. Observability

The Request Engine should generate enough metadata for debugging.

Recommended:

```text
requestId
timestamp
domain
operation
status
phase
attempt
provider
model
duration
error
```

Example:

```javascript
{
  requestId: 'req_123',
  domain: 'ai',
  operation: 'generate',
  phase: 'provider',
  attempt: 2,
  provider: 'anthropic',
  model: '...',
  duration: 1830,
  status: 'success'
}
```

Do not expose sensitive credentials or secrets in logs.

---

# 38. Design Goals

The architecture should optimize for:

### Loose coupling

Domains can evolve independently.

### Reusability

Request, retry, authentication, rate-limit and routing behavior should be shared.

### Replaceability

A provider can be replaced without modifying Web Components.

### Testability

Services and routers should be testable without rendering Lit components.

### Observability

Request lifecycle and failures should be traceable.

### Scalability

Adding a new domain should not require modifying unrelated domains.

---

# 39. Adding a New Domain

When adding a new domain:

```text
webs/<domain>/
```

Create:

```text
webs/<domain>/
├── svc-feature-a.js
├── svc-feature-b.js
├── tool/
└── style/
```

Then create corresponding application/service infrastructure only when required.

Example:

```text
webs/organization/
├── svc-organization-switcher.js
├── svc-member-list.js
├── svc-invite-member.js
├── tool/
└── style/
```

Communication with Auth, Billing, Dashboard, etc. must happen through application events.

---

# 40. Adding a New API

Do NOT modify every component.

Use:

```text
Web Component
      ↓
Service
      ↓
RequestExecutor
      ↓
API Client / Provider
```

If the API requires special behavior, add it to the relevant infrastructure layer.

---

# 41. Adding a New AI Provider

Adding a provider should require:

```text
1. Create Provider Adapter
2. Register Provider
3. Define capabilities
4. Define health/rate-limit behavior
5. Add routing metadata
```

It should NOT require modifications to:

```text
svc-chat.js
svc-prompt-input.js
svc-generation-status.js
```

unless the UI itself needs a new capability.

---

# 42. Core Architectural Principle

The most important rule is:

```text
UI expresses intent.
Application orchestrates intent.
Services execute domain operations.
Request Engine manages request lifecycle.
Router selects execution strategy.
Providers perform external operations.
Events communicate results.
```

Or more simply:

```text
UI
 ↓
EVENT
 ↓
ORCHESTRATOR
 ↓
SERVICE
 ↓
REQUEST ENGINE
 ↓
ROUTER
 ↓
PROVIDER
 ↓
SERVICE STATE
 ↓
EVENT
 ↓
UI
```

---

# 43. AI Coding Agent Rules

When an AI coding agent modifies this project, it MUST follow these rules:

1. Inspect the existing architecture before creating new files.
2. Do not introduce direct API calls inside `webs/`.
3. Do not introduce provider-specific logic inside Lit components.
4. Reuse `RequestExecutor` for API requests.
5. Reuse existing retry, authentication and rate-limit policies.
6. Use `AIRouter` for AI operations.
7. Do not duplicate request lifecycle logic.
8. Keep domain boundaries independent.
9. Communicate cross-domain behavior through events.
10. Keep `webs/` domain directories at exactly one level.
11. Web Component filenames must follow `svc-*.js`.
12. Domain helpers belong in `tool/`.
13. Domain CSS belongs in `style/`.
14. Do not put API logic in `tool/`.
15. Do not put application state in `tool/`.
16. Do not create unnecessary abstractions for one-off behavior.
17. Normalize external API errors before exposing them to UI.
18. Preserve existing event contracts unless intentionally changing the architecture.
19. Keep state ownership explicit.
20. Prefer composition and dependency injection over global mutable state.

---

# 44. Final Mental Model

The project should be understood as a frontend application with an internal runtime:

```text
                         USER
                          │
                          ▼
                   ┌─────────────┐
                   │  Lit Web UI │
                   └──────┬──────┘
                          │
                       Event
                          │
                          ▼
               ┌────────────────────┐
               │ Application        │
               │ Orchestrator       │
               └─────────┬──────────┘
                         │
                         ▼
               ┌────────────────────┐
               │ Domain Services    │
               │                    │
               │ State + Data       │
               │ + Business Flow    │
               └─────────┬──────────┘
                         │
                         ▼
               ┌────────────────────┐
               │ Request Engine      │
               │                    │
               │ Auth               │
               │ Rate Limit         │
               │ Retry              │
               │ Error Handling     │
               └─────────┬──────────┘
                         │
                         ▼
               ┌────────────────────┐
               │ Router              │
               │                    │
               │ API / AI Routing   │
               └─────────┬──────────┘
                         │
                  ┌──────┴──────┐
                  ▼             ▼
              API Provider   AI Provider
                  │             │
                  └──────┬──────┘
                         │
                         ▼
                    Normalized
                     Response
                         │
                         ▼
                   Service State
                         │
                         ▼
                    Domain Event
                         │
                         ▼
                     Event Bus
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
             Auth     Dashboard    Billing
              │          │          │
              └──────────┼──────────┘
                         ▼
                         UI
```

The architectural objective is to make the Web Components **replaceable**, the Services **testable**, the Providers **replaceable**, and the Domains **independent**.

The OmniRoute-inspired part should primarily exist inside the request/AI infrastructure rather than leaking into the UI layer.