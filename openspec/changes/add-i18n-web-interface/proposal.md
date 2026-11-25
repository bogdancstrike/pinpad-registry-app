# Add internationalisation (i18n) to the web interface

## Goal

The React SPA (`frontend/`) shows all text in English, hard-coded in the components.
Add i18n so every user-facing string comes from translation files, with two languages at
launch: English (default) and Romanian. Users switch language from the interface; the
choice is remembered. Dates and numbers follow the chosen language. Adding a third
language requires only a translation file and one line of configuration.

Context from the repository:
- Frontend: React 19, TypeScript, Vite, Ant Design 5, TanStack Query, Zustand (persisted
  `pinpad-theme` store), dayjs (used by `components/common.tsx`).
- Pages: Dashboard, Pinpad launcher, Pinpad kiosk (outside the admin shell), People, Rooms,
  Permissions, Registry, Monitoring, Door Simulator.
- Backend errors are JSON `{ error: <code>, message: <English text>, details: { reason } }`
  (`src/common/errors.py`, `src/domain/access/*`). Access decisions carry `reason` codes
  (e.g. `INVALID_CODE_FORMAT`, `DOOR_SENSOR_ERROR`). The backend is not changed for i18n.
- The repository has no frontend test runner. The Makefile `test` target points at a
  `tests/` directory that does not exist.

## Decisions taken (no product decision needed)

- Library: `i18next` with `react-i18next` (mature, supports interpolation and plural rules).
  Dates via `dayjs` locales; numbers via `Intl.NumberFormat`.
- Locale files: `frontend/src/i18n/locales/<code>.json`; the supported-language list lives in
  one configuration module (`frontend/src/i18n/config.ts`). Adding a language = new JSON file
  + one entry in that list.
- Persistence: `localStorage` key `pinpad-locale`. Resolution order: saved choice →
  `navigator.languages` (first supported match, matching on the primary subtag, e.g. `ro-RO` → `ro`)
  → `en`.
- Backend messages are mapped in the frontend by error code / reason code; unknown codes fall
  back to the `error.unknown` string. The backend API contract is unchanged.
- Romanian uses correct diacritics (ă, â, î, ș, ț).
- Frontend tests use Vitest + React Testing Library + jsdom (added as devDependencies).
  Existing frontend has no tests, so "existing tests pass" means the build and lint/typecheck
  pass plus the backend pytest suite is unaffected.

## Non-goals

- Translating backend-generated text beyond mapping codes in the frontend (no server-side
  locale negotiation, no `Accept-Language` handling, no backend message catalogues).
- Right-to-left layouts, pluralisation beyond what i18next provides by default, or
  translation of seed/demo data (person names, room names, free-text descriptions entered by admins).
- Translating `README.md`, `docs/`, or log/trace output.
- Translating technical identifiers that are protocol values: decision codes
  (`GRANTED`, `DENIED`, `ERROR`), event types (`ENTER`, `EXIT`, ...), door states, and
  personal codes are displayed as-is inside tags, but their labels are translated.
- A language picker that is server-stored per user (choice is per browser only).
- Changes to Docker Compose services; only the frontend build gains new dependencies.
