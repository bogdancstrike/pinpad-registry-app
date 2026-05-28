# Architecture — PIN-Based Room Access Registry Simulator

> Status: reflects the **as-built** application. For the build/runbook see
> [impl_plan.md](impl_plan.md); for a quick start see the root
> [README.md](../README.md).

---

## 1. Purpose

The system replaces a manual key-custody process — where an employee takes a
physical key from a sealed box and hand-writes an entry in a paper registry —
with a centralized, simulated access-control platform.

A person enters a composed PIN at a room door terminal. The backend validates
the attempt, actuates a **mocked** door, decides whether it is an **ENTER** or
an **EXIT**, and writes an immutable registry event automatically.

It is intentionally a fast, demonstrative PoC, but structured so it can grow
into a production access-control system (real hardware, IdP, etc.).

---

## 2. Business problem

Manual process: arrive → unseal box → take key → write "taken" → work →
return key → reseal → write "returned". Problems: incomplete/unauditable
registry, no automatic timestamping, no real-time visibility, security depends
on human discipline.

Digital process: enter composed code at the door → central validation → mocked
unlock → automatic registry event → live monitoring dashboard.

---

## 3. The core concept

```
12340023  =  1234 (room PIN)  +  0023 (person code)
```

The composed code is split (`PIN_LENGTH` / `PERSON_CODE_LENGTH`, both 4 by
default). The backend then validates room, person, PIN, permission and door
state, and toggles direction from current presence:

- person **not** inside the room  → event is **ENTER**
- person **already** inside        → event is **EXIT**

This is why the same code both enters and exits — direction is derived from
state, not chosen by the user.

---

## 4. Technology stack (as built)

| Layer        | Choice |
|--------------|--------|
| Backend      | Python 3.12, **QF Framework** (dynamic endpoint dispatch over Flask + Flask-RESTX) |
| ORM / DB     | SQLAlchemy 2.x (typed `Mapped[...]`), PostgreSQL 16, Alembic migrations |
| Security     | bcrypt PIN hashing, entered-code masking |
| Observability| OpenTelemetry → Jaeger (OTLP gRPC), custom domain spans + auto Flask/SQLAlchemy instrumentation |
| Frontend     | React 19 + TypeScript + Vite, **Ant Design 5**, TanStack Query, Zustand, React Router 7 |
| Deployment   | Docker Compose (postgres, jaeger, backend, frontend/nginx) |

---

## 5. High-level architecture

```mermaid
flowchart LR
    User[Employee / Admin]

    subgraph FE[React + AntD SPA]
        Pinpad[Pinpad kiosk]
        Admin[People / Rooms / Permissions]
        Registry[Registry]
        Monitor[Dashboard / Monitoring]
        DoorSim[Door Simulator]
    end

    subgraph BE[QF Framework backend]
        Dyn[Dynamic endpoint router<br/>maps/endpoint.json]
        Handlers[api/* thin handlers]
        Services[domain/* services]
    end

    subgraph DATA[(PostgreSQL)]
        T[(people, rooms, access_permissions,<br/>room_presence, access_events,<br/>mock_door_devices)]
    end

    Jaeger[(Jaeger)]

    User --> FE
    FE -->|/pinpad/api/*| Dyn --> Handlers --> Services --> DATA
    Services -. OTLP spans .-> Jaeger
    BE -. auto Flask/SQLAlchemy spans .-> Jaeger
```

---

## 6. Backend architecture

### 6.1 QF Framework bootstrap

`main.py` constructs a `FrameworkApp` with `FrameworkSettings`
(`enable_dynamic_endpoints=True`, `endpoint_json_path="maps/endpoint.json"`),
calls `fw.run()` to get the Flask app, then installs correlation/CORS hooks and
the domain error handler. The same `main:app` object is the gunicorn entry
point.

```python
app = build_app()          # importable WSGI app for gunicorn main:app

def build_app():
    settings = FrameworkSettings(enable_api=True, enable_dynamic_endpoints=True,
                                 endpoint_json_path="maps/endpoint.json",
                                 enable_tracing=Config.ENABLE_TRACING, ...)
    handles = FrameworkApp(settings, app_root=BASE_DIR).run()
    install_flask_hooks(handles.app)            # correlation id + CORS
    install_flask_error_handlers(handles.app)   # PinpadError -> JSON
    return handles.app
```

Two QF-specific details the host app must satisfy:

- **Top-level `config.py`** — QF's `create_app` calls
  `app.config.from_object('config.Config')` and its ETL module reads
  `Config.WORKER_NAME` etc. at import time. `config.py` is a thin shim that
  re-exports `src.config.Config`, which carries the framework's legacy keys.
- **Tracing env bridge** — QF's tracer reads `ENABLE_TRACING` from the
  environment, so `main.py` mirrors `Config.ENABLE_TRACING` into `os.environ`.

### 6.2 Dynamic endpoints (`maps/endpoint.json`)

Every route is declared as JSON, not Python decorators. The QF dynamic router
builds a Flask-RESTX `Resource` per entry and dispatches to a handler resolved
by dotted path:

```json
{
  "namespace": "pinpad",
  "operation_name": "access_attempt",
  "request_method": ["POST"],
  "api_url": "/api/access/attempt",
  "exec_method": { "module_name": "src.api.access", "method_name": "attempt" }
}
```

The `pinpad` namespace prefixes every route, so the public path is
`POST /pinpad/api/access/attempt`. All ~40 endpoints follow this pattern.

### 6.3 Handler contract

Handlers are thin and uniform — the signature is fixed by the QF router:

```python
def attempt(app, operation, request, **kwargs):   # **kwargs carries URL params
    body = payload()                               # flask request json
    with get_db() as db:                           # commit on success, rollback on raise
        result = access_service.execute(db, body)
    return (result, 200)                           # (body, status)
```

Handlers only: parse the request, open a DB session, call one domain service,
return `(body, status)`. No business logic lives in `api/`.

### 6.4 Layering

```
src/
  config.py            # env-driven settings (+ QF legacy keys)
  common/
    db.py              # engine, sessionmaker, get_db() context manager, Base
    errors.py          # PinpadError hierarchy + Flask error handler
    correlation.py     # X-Correlation-Id + CORS hooks
    security.py        # bcrypt hash/verify + entered-code masking
    tracing.py         # facade over framework.tracing.get_tracer
    spans.py           # span() context-manager helper
  domain/
    models.py          # all ORM models (typed SQLAlchemy 2.x)
    access/            # parser, validator, service (the critical flow)
    people/ rooms/ permissions/ presence/ registry/ hardware/ monitoring/
  api/                 # thin handlers, one module per resource
```

`get_db()` is the transaction boundary: it yields a `Session`, commits on
clean exit, rolls back on exception, and always closes. Services accept that
`db` and never manage their own transactions — so a single attempt
(validation + presence + door + registry write) is atomic.

---

## 7. Domain model

```mermaid
erDiagram
    PEOPLE ||--o{ ACCESS_PERMISSIONS : has
    ROOMS  ||--o{ ACCESS_PERMISSIONS : allows
    PEOPLE ||--o{ ROOM_PRESENCE : enters
    ROOMS  ||--o{ ROOM_PRESENCE : contains
    PEOPLE ||--o{ ACCESS_EVENTS : triggers
    ROOMS  ||--o{ ACCESS_EVENTS : records
    ROOMS  ||--|| MOCK_DOOR_DEVICES : has

    PEOPLE {
        uuid id PK
        varchar person_code UK
        varchar full_name
        varchar department
        varchar role
        boolean active
    }
    ROOMS {
        uuid id PK
        varchar code UK
        varchar name
        text description
        varchar pin_hash
        varchar demo_pin "PoC only — plaintext for the demo keypad"
        boolean active
    }
    ACCESS_PERMISSIONS {
        uuid id PK
        uuid person_id FK
        uuid room_id FK
        timestamp valid_from
        timestamp valid_until
        boolean active
    }
    ROOM_PRESENCE {
        uuid id PK
        uuid person_id FK
        uuid room_id FK
        timestamp entered_at
        timestamp exited_at
        boolean active
    }
    ACCESS_EVENTS {
        uuid id PK
        uuid person_id FK "nullable"
        uuid room_id FK "nullable"
        varchar event_type
        varchar decision
        varchar reason
        varchar raw_code_masked
        jsonb door_state_before
        jsonb door_state_after
        timestamp created_at
    }
    MOCK_DOOR_DEVICES {
        uuid id PK
        uuid room_id FK UK
        varchar state
        boolean locked
        boolean door_open
        boolean controller_online
        timestamp last_unlock_at
        timestamp last_lock_at
    }
```

Notes on what the implementation enforces:

- `ACCESS_PERMISSIONS` has a unique `(person_id, room_id)` constraint — one
  permission row per person/room.
- `ROOM_PRESENCE` has a **partial unique index** `WHERE active = true`, so a
  person can have at most one open presence per room (anti-double-ENTER).
- `ACCESS_EVENTS` keeps `person_id`/`room_id` nullable so denials with an
  unknown person/room are still recorded; FKs are `ON DELETE SET NULL` to keep
  history after a person/room is removed.
- `demo_pin` exists **only** so the kiosk can display the code for testing; a
  production build would drop this column. The real secret is `pin_hash`.

---

## 8. The access attempt flow

```mermaid
sequenceDiagram
    actor Person
    participant UI as Pinpad (SPA)
    participant API as QF router
    participant Svc as access.service.execute
    participant DB as PostgreSQL
    participant Door as hardware.service
    participant Reg as registry.service

    Person->>UI: enter 12340023
    UI->>API: POST /pinpad/api/access/attempt
    API->>Svc: execute(db, payload)
    Svc->>Svc: parse -> pin, person_code
    Svc->>DB: SELECT room ... FOR UPDATE   %% serialize per room
    Svc->>DB: SELECT person
    Svc->>Svc: validate(room, person, pin, permission, window)
    alt invalid
        Svc->>Reg: register_denied(reason)
        Svc-->>UI: { decision: DENIED, reason }
    else valid
        Svc->>Door: get_state + unlock
        alt hardware fault
            Svc->>Reg: register_error(reason)
            Svc-->>UI: { decision: ERROR, reason }
        else ok
            Svc->>DB: resolve ENTER/EXIT from presence
            Svc->>DB: insert / close presence
            Svc->>Reg: register_granted(event_type)
            Svc-->>UI: { decision: GRANTED, eventType }
        end
    end
```

### 8.1 Validation order & reason codes

Validation is deterministic (`domain/access/validator.py`):

`ROOM_NOT_FOUND` → `PERSON_NOT_FOUND` → `ROOM_INACTIVE` → `PERSON_INACTIVE`
→ `INVALID_ROOM_PIN` → `PERSON_HAS_NO_PERMISSION_FOR_ROOM`
→ `PERMISSION_NOT_YET_VALID` → `PERMISSION_EXPIRED`.

Code parsing (`parser.py`) can raise `INVALID_CODE_FORMAT` /
`INVALID_CODE_LENGTH`. Hardware faults surface as `DOOR_CONTROLLER_OFFLINE` /
`DOOR_SENSOR_ERROR`.

### 8.2 Concurrency

The room row is selected `FOR UPDATE` for the duration of the attempt, and the
partial unique index on `room_presence` is the backstop. Two simultaneous
attempts for the same room serialize; a double-ENTER cannot create two open
presence rows.

---

## 9. Mock door hardware

State lives in `mock_door_devices` and is driven entirely by the backend
(`domain/hardware/service.py`). States:

```
LOCKED → UNLOCKED → LOCKED        (normal)
FORCED_OPEN, SENSOR_ERROR, OFFLINE (abnormal, for demos)
```

The **Door Simulator** page can manually drive each door (unlock, lock,
force-open, sensor-error, offline, online) so abnormal scenarios can be
demonstrated — e.g. set a door offline, then a valid code returns
`ERROR · DOOR_CONTROLLER_OFFLINE`.

---

## 10. Registry & audit

Every attempt writes one `access_events` row via `domain/registry/service.py`:

- `event_type`: `ENTER | EXIT | DENIED | SYSTEM_ERROR`
- `decision`: `GRANTED | DENIED | ERROR`
- `raw_code_masked`: the entered code with the PIN masked (`****0023`) — the
  full code is **never** persisted.
- `door_state_before` / `door_state_after`: JSONB snapshots for granted/error
  events.

The registry is append-only from the API surface: there are **no** update or
delete endpoints for events. The Registry page supports filtering by room,
decision, and event type with server-side pagination.

---

## 11. Monitoring

`domain/monitoring/service.py` aggregates for the Dashboard / Monitoring pages:

- summary KPIs (total rooms, active people, currently inside, granted today,
  denied today, doors offline)
- live door states
- current occupancy (who is inside which room, since when)
- recent denied/error attempts (last 7 days)

Frontend pages auto-refresh via TanStack Query polling (5–10s).

---

## 12. Security

- **PIN storage** — bcrypt hash (`pin_hash`), 12 rounds. Plaintext `demo_pin`
  is a deliberate PoC affordance for the kiosk cheat-sheet only.
- **Code masking** — only the trailing person code is kept in logs/registry.
- **Audit immutability** — append-only events, no mutation endpoints.
- **Concurrency safety** — `FOR UPDATE` + partial unique index.
- **Out of scope (PoC)** — there is no authentication/RBAC; the architecture
  anticipates Keycloak OIDC + roles (admin / security officer / auditor /
  viewer) as the production path.

---

## 13. Observability (tracing)

Tracing is on by default (`ENABLE_TRACING=true`) and exports OTLP/gRPC to
Jaeger.

- `src/common/tracing.py` wraps `framework.tracing.get_tracer` (NoOp when
  disabled). `src/common/spans.py` provides a `span(name, **attrs)` context
  manager.
- **Custom domain spans** wrap the access flow:
  `access.attempt` (root) → `access.parse`, `access.validate`,
  `access.door_unlock`, `access.presence`, `access.registry_write`; plus
  `door.unlock` / `door.lock`. Attributes include `access.decision`,
  `access.reason`, `access.event_type`, `access.person_code`,
  `door.state_before/after`.
- **Auto-instrumentation** (activated by QF's `init_tracing`): Flask HTTP
  server spans and SQLAlchemy query spans nest under the domain spans.

Jaeger UI is at `:16686`; the backend points at `OTLP_ENDPOINT`
(`http://jaeger:4317` in compose, `http://localhost:4317` locally).

---

## 14. Frontend architecture

```
frontend/src/
  api/client.ts     # axios instance, baseURL = /pinpad (Vite/nginx proxy)
  api/index.ts      # typed API functions + interfaces
  stores/themeStore # zustand (persisted dark/light)
  components/common # tags (decision/event/door state), date formatting
  pages/            # one page per route
  App.tsx           # AntD Layout shell + router; kiosk pinpad rendered bare
  main.tsx          # ConfigProvider (theme) + QueryClient + Router
```

Routes:

| Route                | Page                  |
|----------------------|-----------------------|
| `/dashboard`         | KPIs, occupancy, doors, denied attempts |
| `/pinpad`            | terminal launcher (pick a room) |
| `/pinpad/:roomCode`  | full-screen kiosk keypad |
| `/people`            | People CRUD |
| `/rooms`             | Rooms CRUD (PIN hashed on save) |
| `/permissions`       | grant/revoke access |
| `/registry`          | filterable, paginated audit log |
| `/monitoring`        | live doors + occupancy |
| `/hardware`          | door simulator |

### Pinpad kiosk flow

The pinpad is a small state machine (`PinpadPage.tsx`):

```
input ──submit──▶ GRANTED+ENTER ──▶ "You are in {room}. Exit?"  (inside)
  ▲                                   │ Yes → re-submit code → EXIT
  │                                   │ Stay → back to input
  └───── result (EXIT / DENIED / ERROR) ◀── GRANTED+EXIT / DENIED / ERROR
```

A PoC "Demo codes" card shows the room PIN and permitted people (from
`GET /pinpad/api/pinpad/{room_code}/hints`); tapping a person auto-fills their
full code. The kiosk route renders outside the admin shell for a clean
terminal look.

---

## 15. Deployment

```mermaid
flowchart LR
    Browser --> FE[frontend: nginx :3000]
    FE -->|/pinpad/*| BE[backend: gunicorn :5000]
    BE --> PG[(postgres :5432)]
    BE -->|OTLP :4317| J[jaeger :16686]
```

`docker compose up -d --build` brings up **postgres, jaeger, backend,
frontend**. The backend image runs `alembic upgrade head` + `scripts/seed.py`
on boot, then serves with gunicorn. nginx serves the built SPA and reverse-
proxies `/pinpad/*` to the backend, so the browser sees a single origin.

---

## 16. Configuration reference

All via env (see `.env.example`); defaults in `src/config.py`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql+psycopg2://pinpad:pinpad@localhost:5432/pinpad` | Postgres DSN |
| `API_PORT` | `5000` | Backend port |
| `ALLOWED_ORIGINS` | `*` | CORS allow-list |
| `PIN_LENGTH` / `PERSON_CODE_LENGTH` | `4` / `4` | Code split |
| `DOOR_UNLOCK_SECONDS` | `5` | Mock unlock duration |
| `ENABLE_TRACING` | `true` | OpenTelemetry on/off |
| `OTLP_ENDPOINT` | `http://localhost:4317` | Jaeger OTLP gRPC |
| `SERVICE_NAME` | `pinpad` | Trace service name |

---

## 17. Future evolution

Real pinpad/relay hardware (MQTT/serial gateway) · Keycloak OIDC + RBAC ·
badge + PIN MFA · temporary/visitor access & approvals · anti-passback ·
WebSocket live dashboard · audit hash-chaining + signed exports · Prometheus
metrics + Grafana · Kubernetes/Helm.
