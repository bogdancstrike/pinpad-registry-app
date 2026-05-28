# Implementation Plan & Build Guide

> Status: reflects the **as-built** application. Read alongside
> [architecture.md](architecture.md). For a quick start, see the root
> [README.md](../README.md).

This document records how the PoC is structured, how it was built, how to run
and extend it, and the acceptance criteria it satisfies.

---

## 1. Objective

A demonstrative room access-control system:

```
Backend   : Python 3.12 + QF Framework (dynamic endpoints) + SQLAlchemy + PostgreSQL
Frontend  : React 19 + TypeScript + Vite + Ant Design 5
Tracing   : OpenTelemetry → Jaeger
Deployment: Docker Compose
Hardware  : mocked pinpad terminal + mocked door controller (DB-backed state)
```

A person enters a composed code (`PIN` + `person_code`, e.g. `12340023`); the
backend validates it, mocks the unlock, decides ENTER/EXIT from presence, and
writes an immutable registry event.

---

## 2. Repository layout (actual)

```
pinpad-app/
├── main.py                     # QF FrameworkApp bootstrap; gunicorn entry `main:app`
├── config.py                   # shim → src.config.Config (QF expects top-level `config`)
├── requirements.txt
├── Dockerfile                  # backend image (migrate + seed + gunicorn)
├── docker-compose.yml          # postgres, jaeger, backend, frontend
├── alembic.ini
├── Makefile
├── .env.example
├── dist/qf-1.0.2-py3-none-any.whl
│
├── maps/
│   └── endpoint.json           # ALL routes (namespace "pinpad")
│
├── migrations/
│   ├── env.py
│   └── versions/
│       ├── 0001_initial.py
│       └── 0002_room_demo_pin.py
│
├── scripts/
│   └── seed.py                 # idempotent demo data
│
├── src/
│   ├── config.py
│   ├── common/
│   │   ├── db.py               # engine, get_db() ctx mgr, Base
│   │   ├── errors.py           # PinpadError hierarchy + Flask handler
│   │   ├── correlation.py      # correlation id + CORS
│   │   ├── security.py         # bcrypt + code masking
│   │   ├── tracing.py          # get_tracer facade
│   │   └── spans.py            # span() helper
│   ├── domain/
│   │   ├── models.py           # all ORM models
│   │   ├── access/{parser,validator,service}.py
│   │   ├── people/service.py
│   │   ├── rooms/service.py
│   │   ├── permissions/service.py
│   │   ├── presence/service.py
│   │   ├── registry/service.py
│   │   ├── hardware/service.py
│   │   └── monitoring/service.py
│   └── api/
│       ├── _helpers.py         # payload(), query(), view_arg()
│       ├── access.py people.py rooms.py permissions.py
│       ├── registry.py hardware.py monitoring.py health.py
│
└── frontend/
    ├── package.json vite.config.ts tsconfig.json index.html
    ├── Dockerfile nginx.conf
    └── src/
        ├── main.tsx App.tsx index.css
        ├── api/{client,index}.ts
        ├── stores/themeStore.ts
        ├── components/common.tsx
        └── pages/*.tsx
```

---

## 3. Build phases (how it was assembled)

1. **Backend foundation** — `config.py` (+ top-level shim), `common/{db,errors,correlation,security}`, `main.py` QF bootstrap, `requirements.txt` against the local QF wheel.
2. **Domain model & migrations** — `domain/models.py`, Alembic `0001_initial` (incl. partial unique presence index), `scripts/seed.py`.
3. **Services & API** — access (parser/validator/service), CRUD services, presence/registry/hardware/monitoring; thin `api/*` handlers; `maps/endpoint.json`.
4. **Frontend** — Vite + AntD shell, pinpad kiosk, admin CRUD, registry, dashboard/monitoring, door simulator.
5. **Deployment** — Dockerfiles, nginx proxy, compose, Makefile, README.
6. **UX pass** — pinpad demo cheat-sheet + in-room exit confirmation; `0002_room_demo_pin` migration + `/api/pinpad/{code}/hints`.
7. **Observability** — `common/{tracing,spans}`, domain spans, Jaeger in compose, tracing on by default.

---

## 4. Key implementation decisions

- **Dynamic endpoints over decorators.** Routes are data (`maps/endpoint.json`)
  dispatched by the QF router to `(app, operation, request, **kwargs)` handlers
  returning `(body, status)`. Keeps controllers uniform and declarative.
- **`/pinpad` namespace.** The QF namespace prefixes all routes, so the API is
  served under `/pinpad/...`. The SPA's axios `baseURL` is `/pinpad`; Vite (dev)
  and nginx (prod) proxy it — single origin, no CORS in the browser path.
- **`get_db()` is the transaction.** Services take a `Session` and never
  commit; the context manager commits/rolls back so a whole attempt is atomic.
- **Services are plain modules of functions**, not classes/DI — simpler for a
  PoC and easy to test.
- **Module name resolution.** Handlers are referenced as `src.api.*` so
  `importlib` resolves them with only the repo root on `sys.path`.
- **`demo_pin`** is a PoC-only plaintext column powering the kiosk cheat-sheet;
  the real credential is the bcrypt `pin_hash`.

---

## 5. API surface

All paths are prefixed with `/pinpad`.

| Method | Path | Handler |
|--------|------|---------|
| GET | `/health` `/liveness` `/readiness` | `api.health` |
| POST | `/api/access/attempt` | `api.access.attempt` |
| GET/POST | `/api/people` | `api.people` |
| GET/PUT/DELETE | `/api/people/<person_id>` | `api.people` |
| GET/POST | `/api/rooms` | `api.rooms` |
| GET/PUT/DELETE | `/api/rooms/<room_id>` | `api.rooms` |
| GET | `/api/pinpad/<room_code>/hints` | `api.rooms.pinpad_hints` (PIN, permitted people, **and `inside[]` current occupants**) |
| GET/POST | `/api/permissions` | `api.permissions` |
| DELETE | `/api/permissions/<permission_id>` | `api.permissions` |
| GET | `/api/registry/events` | `api.registry.list_events` |
| GET | `/api/registry/presence` | `api.registry.presence` |
| GET | `/api/registry/room/<room_code>` · `/person/<person_code>` | `api.registry` |
| GET | `/api/mock-hardware/doors` · `/doors/<room_code>` | `api.hardware` |
| POST | `/api/mock-hardware/doors/<room_code>/{unlock,lock,force-open,sensor-error,offline,online}` | `api.hardware` |
| GET | `/api/monitoring/{summary,doors,occupancy,denied-events}` | `api.monitoring` |

### Access attempt — request / responses

```jsonc
// POST /pinpad/api/access/attempt
{ "roomCode": "SERVER_ROOM", "enteredCode": "12340023" }
```

```jsonc
// granted
{ "decision": "GRANTED", "eventType": "ENTER",
  "message": "Access granted. ENTER registered.",
  "person": { "code": "0023", "fullName": "John Doe" },
  "room": { "code": "SERVER_ROOM", "name": "Server Room" },
  "door": { "state": "UNLOCKED", "locked": false, "controllerOnline": true },
  "eventId": "..." }

// denied
{ "decision": "DENIED", "eventType": "DENIED",
  "reason": "INVALID_ROOM_PIN", "message": "Access denied.", "eventId": "..." }

// hardware error
{ "decision": "ERROR", "eventType": "SYSTEM_ERROR",
  "reason": "DOOR_CONTROLLER_OFFLINE", "message": "Door controller is offline", "eventId": "..." }
```

---

## 6. Running it

### Docker (full stack)

```bash
cp .env.example .env
docker compose up -d --build
```

- Frontend  → http://localhost:3000
- Backend   → http://localhost:5000/pinpad
- Jaeger UI → http://localhost:16686

The backend container runs `alembic upgrade head` + `scripts/seed.py` on boot.

### Local dev

```bash
make install            # venv + QF wheel + requirements
make infra              # postgres + jaeger (docker)
cp .env.example .env
make migrate            # alembic upgrade head
make seed               # demo data
make backend            # http://localhost:5000

# second shell
make frontend-install
make frontend           # http://localhost:5173 (proxies /pinpad → :5000)
```

Make targets: `install · backend · infra · up · down · logs ·
frontend-install · frontend · frontend-build · migrate · migrate-revision ·
seed · test · lint`.

---

## 7. Seed data & demo codes

| Person | Code | Room | PIN |
|--------|------|------|-----|
| John Doe | 0023 | SERVER_ROOM | 1234 |
| Maria Popescu | 0041 | ARCHIVE_ROOM | 7777 |
| Security Officer | 0099 | SERVER_ROOM / ARCHIVE_ROOM / CONTROL_ROOM | — |

| Code | Expected |
|------|----------|
| `12340023` | John ENTER/EXIT Server Room |
| `77770041` | Maria ENTER/EXIT Archive Room |
| `24680023` | DENIED — John has no permission for Control Room |
| `99990023` | DENIED — wrong PIN |
| `12349999` | DENIED — unknown person |

---

## 8. Demo runbook

1. **Dashboard** — rooms, occupancy, door states, recent denials.
2. **People / Rooms / Permissions** — review/edit seeded data (rooms hash PIN on save).
3. **Pinpad** → Server Room → enter `12340023` (or tap John in the cheat-sheet) → **GRANTED · ENTER** → "You are in Server Room. Exit?".
4. **Registry** — see the ENTER event, code masked `****0023`.
5. Press **Yes, exit** (or re-enter the code) → **GRANTED · EXIT**; registry now shows the pair.
6. **Exit after "Stay"** — enter `12340023` again → on the in-room screen press **Stay**. John is still inside: the keypad now shows him under **"Currently inside"**. Tap his name (or re-enter `12340023`) → **GRANTED · EXIT**.
7. Enter `99990023` → **DENIED · INVALID_ROOM_PIN**.
8. **Door Simulator** → set Server Room *Offline* → pinpad `12340023` → **ERROR · DOOR_CONTROLLER_OFFLINE**.
9. **Jaeger** (`:16686`) → service `pinpad` → inspect an `access.attempt` trace: `parse → validate → door_unlock → presence → registry_write` with nested SQL spans.

---

## 9. Testing strategy

The flows below are the verification checklist (exercised manually via curl /
the UI during build):

**Unit-level (pure):** PIN parse (`12340023 → 1234,0023`; non-digit →
`INVALID_CODE_FORMAT`; wrong length → `INVALID_CODE_LENGTH`), bcrypt
hash/verify, code masking (`12340023 → ****0023`), validator reason codes.

**Integration (with Postgres):** valid code → ENTER then EXIT on repeat; wrong
PIN → DENIED; unknown person → DENIED; no permission → DENIED; door offline →
ERROR. Plus monitoring summary counts and registry pagination/filters.

> `make test` / a `tests/` suite is the natural next step; the project is
> structured so services are directly unit-testable and the access flow is
> integration-testable against a real Postgres.

---

## 10. Acceptance criteria

1. Admin can CRUD people. ✔
2. Admin can create rooms with a PIN (hashed). ✔
3. Admin can grant/revoke room permissions. ✔
4. Pinpad terminal opens per room, shows demo cheat-sheet. ✔
5. Valid code → GRANTED, door UNLOCKED, ENTER recorded. ✔
6. In-room screen offers exit; confirming records EXIT. ✔
6a. Choosing **Stay** is not a dead-end — the occupant stays inside and can exit later by re-entering their code or tapping themselves under "Currently inside". ✔
7. Wrong PIN / unknown person / no permission → DENIED with reason. ✔
8. Door offline → ERROR (`DOOR_CONTROLLER_OFFLINE`). ✔
9. Registry lists all events (masked code), filterable & paginated. ✔
10. Monitoring shows summary, occupancy, live door states. ✔
11. Door simulator drives abnormal hardware states. ✔
12. Traces (custom + DB) exported to Jaeger. ✔
13. `docker compose up --build` brings up the whole stack. ✔

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| ENTER/EXIT ambiguity (same code) | Direction derived from presence; in-room exit screen makes it explicit; monitoring shows who's inside. |
| "Stay" leaves a person with no way out | Not a dead-end: presence-based toggle means re-entering the code exits. The keypad's "Currently inside" panel surfaces open occupants with tap-to-exit so it's discoverable. |
| PIN sharing | Accepted for PoC; production path is badge+PIN / MFA + rate limiting. |
| Race on simultaneous attempts | Room row `FOR UPDATE` + partial unique presence index. |
| Audit tampering | Append-only events, no mutation endpoints; production: hash-chaining + restricted DB. |
| Demo PIN exposure | `demo_pin` is explicitly PoC-only and would be dropped in production. |

---

## 12. Next steps

Auth (Keycloak OIDC) + RBAC · automated test suite in `tests/` · WebSocket live
monitoring · real hardware gateway · audit hash-chaining + exports · Prometheus
metrics · Kubernetes/Helm packaging.
