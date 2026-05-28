# Pinpad — PIN-Based Room Access Registry Simulator

A demonstrative access-control system. A person enters a composed PIN at a
room door, the central backend validates the attempt, mocks a door unlock, and
automatically writes a digital registry event — replacing a paper key registry.

```
12340023  =  1234 (room PIN)  +  0023 (person code)
```

If the person is not inside → **ENTER**. If already inside → **EXIT**.

- **Backend**: Python + [QF Framework](dist/) (dynamic endpoints) + SQLAlchemy 2.x + PostgreSQL
- **Frontend**: React 19 + TypeScript + Vite + Ant Design 5 + TanStack Query
- **Deploy**: Docker Compose

See [architecture.md](architecture.md) and [impl_plan.md](impl_plan.md) for design detail.

## Project layout

```
main.py                 # QF FrameworkApp bootstrap (gunicorn entry: main:app)
config.py               # top-level shim → src.config.Config (QF expects `config.Config`)
maps/endpoint.json      # all routes, dispatched to thin handlers in src/api
src/
  config.py             # env-driven settings
  common/               # db (get_db ctx mgr), errors, correlation/CORS, security (bcrypt)
  domain/
    models.py           # ORM: people, rooms, permissions, presence, events, doors
    access/             # parser, validator, service (the critical flow)
    people|rooms|permissions|presence|registry|hardware|monitoring/  # services
  api/                  # thin handlers: (app, operation, request, **kwargs) -> (body, status)
migrations/             # Alembic
scripts/seed.py         # demo data
frontend/               # Vite + AntD SPA
```

All API routes are namespaced under **`/pinpad`** (e.g. `POST /pinpad/api/access/attempt`).
The SPA talks to `/pinpad` — Vite proxies it in dev, nginx proxies it in prod.

## Run with Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:5000/pinpad
- The backend container runs migrations + seed on boot.

## Run locally (dev)

```bash
make install            # venv + QF wheel + requirements
make infra              # postgres only (docker)
cp .env.example .env
make migrate            # alembic upgrade head
make seed               # demo data
make backend            # http://localhost:5000

# in another shell
make frontend-install
make frontend           # http://localhost:5173 (proxies /pinpad → :5000)
```

## Demo data & codes

| Person          | Code | Room          | PIN  |
|-----------------|------|---------------|------|
| John Doe        | 0023 | SERVER_ROOM   | 1234 |
| Maria Popescu   | 0041 | ARCHIVE_ROOM  | 7777 |
| Security Officer| 0099 | (all three)   |      |

| Code        | Result                                        |
|-------------|-----------------------------------------------|
| `12340023`  | John ENTER/EXIT Server Room                   |
| `77770041`  | Maria ENTER/EXIT Archive Room                 |
| `24680023`  | DENIED — John has no permission for Control   |
| `99990023`  | DENIED — wrong PIN                             |
| `12349999`  | DENIED — unknown person                        |

## Demo flow

1. **Dashboard** — rooms, occupancy, door states, denied attempts.
2. **People / Rooms / Permissions** — review or edit the seeded data.
3. **Pinpad** → pick *Server Room* → enter `12340023` → **GRANTED · ENTER**.
4. **Registry** — see the ENTER event (code masked as `****0023`).
5. Pinpad again `12340023` → **GRANTED · EXIT**.
6. Pinpad `99990023` → **DENIED · INVALID_ROOM_PIN**.
7. **Door Simulator** → set Server Room *Offline* → pinpad `12340023` → **ERROR · DOOR_CONTROLLER_OFFLINE**.

## Security notes (PoC)

- Room PINs are stored as bcrypt hashes, never plaintext.
- The entered code is masked (`****0023`) in every registry row — the PIN is never persisted.
- Access events are append-only (no update/delete endpoints).
- A partial unique index (`active = true`) on `room_presence` guards the ENTER/EXIT race;
  the room row is locked `FOR UPDATE` during an attempt.
