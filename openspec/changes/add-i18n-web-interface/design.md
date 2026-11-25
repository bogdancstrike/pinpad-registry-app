# Design: web interface internationalisation (en / ro)

Status: proposed. Scope and requirements: `proposal.md` and `specs/web-i18n/spec.md` (SC-01..SC-13).
Principle: reuse what the project and its UI library already provide; add a new
dependency only where the existing stack has no equivalent.

## 1. Current state (read from code)

- `frontend/` is a Vite + React 19 + antd 5 SPA. Strings are inline literals in
  `App.tsx`, all 9 files in `src/pages/`, `components/common.tsx` (status tags,
  `fmtDateTime`), and `PinpadPage.tsx`.
- `api/client.ts` drops the API reason. The interceptor keeps only `message`, so the
  reason code in `details.reason` (access attempts) and `error` (other errors) is lost.
- Theme state lives in a zustand store persisted under `pinpad-theme` (JSON-encoded).
- `ConfigProvider` (antd) is set in `main.tsx` and again in `App.tsx` for the kiosk.
- No frontend test runner exists. Playwright is preinstalled in the sandbox.
- Backend reason codes that reach the UI (from `src/domain/access/validator.py`,
  `parser.py`, `service.py`): `INVALID_CODE_FORMAT`, `INVALID_CODE_LENGTH`,
  `ROOM_NOT_FOUND`, `PERSON_NOT_FOUND`, `ROOM_INACTIVE`, `PERSON_INACTIVE`,
  `INVALID_ROOM_PIN`, `PERSON_HAS_NO_PERMISSION_FOR_ROOM`, `PERMISSION_NOT_YET_VALID`,
  `PERMISSION_EXPIRED`, `DOOR_CONTROLLER_OFFLINE`, `DOOR_SENSOR_ERROR`, plus the
  fallback `HARDWARE_ERROR`.

## 2. Approach

**Library.** Use `i18next` with `react-i18next` (the de facto standard for React).
Provide the translation catalogues as typed JSON resources and use `t()` with keys.

**Locale-specific library data.** Use what the stack already ships rather than
writing it:
- antd: `ConfigProvider locale={antdLocale}` with `antd/locale/ro_RO` and `en_US`
  (both verified to exist in antd 5.29.3). This localises antd's own strings
  (pagination, empty states, Popconfirm buttons, DatePicker).
- dayjs: import `dayjs/locale/ro` and call `dayjs.locale(code)` on language change.
- Numbers: `Intl.NumberFormat(locale)` (built into browsers; `ro-RO` gives `1.234`).
- Dates: dayjs with a per-language pattern (see §4).

**Single configuration point.** `src/i18n/languages.ts` holds one array:
`{ code, label, antdLocale, dayjsLocale, dateTimeFormat, messages }`. The language
switcher, the browser-language detection and the resource setup are all derived from
this array. Adding a language means: a new `locales/<code>.json` plus one entry in
this array (SC-13).

**Language store.** Use a small zustand store (the project already uses zustand)
that reads and writes `localStorage['pinpad-language']` as a plain string (`en` or
`ro`). It does **not** use zustand `persist`, because `persist` JSON-encodes the value
(`"ro"` with quotes), which would fail SC-04.

**Initial language.** If `pinpad-language` holds a supported code, use it. Otherwise
walk `navigator.languages` and take the first whose primary subtag is supported. If
none matches, use `en`. This is ~15 lines, so no language-detector dependency is added.

**Switcher.** An antd `Select` (or `Segmented`) in the admin header and in the kiosk
header. It changes the store, which calls `i18n.changeLanguage`, which re-renders
everything without a reload. It also sets `document.documentElement.lang`.

**API error mapping.** The axios interceptor attaches the reason as `err.code`:
`data.details?.reason ?? data.error`. A helper `translateApiError(err)` returns
`t('errors.<CODE>')` when the code has a translation, else the API `message`, else
`t('errors.requestFailed')`. Codes are never changed (SC-10, SC-11).

## 3. Modules affected

| Module | Change |
|---|---|
| `frontend/src/i18n/languages.ts` (new) | The single language config list. |
| `frontend/src/i18n/index.ts` (new) | i18next init, `resolveInitialLanguage()`, `changeLanguage()`. |
| `frontend/src/i18n/format.ts` (new) | `formatDateTime(value, lang)`, `formatNumber(n, lang)`. |
| `frontend/src/stores/languageStore.ts` (new) | Zustand store over `pinpad-language`. |
| `frontend/src/components/LanguageSwitcher.tsx` (new) | Switcher component (shared by shell and kiosk). |
| `frontend/src/locales/en.json`, `ro.json` (new) | Catalogues: nav, pages, common, enums, errors. |
| `frontend/src/main.tsx` | Init i18n; antd `locale` from active language; dayjs locale. |
| `frontend/src/App.tsx` | Translate nav, header, tooltip, title; add switcher; kiosk switcher. |
| `frontend/src/components/common.tsx` | `fmtDateTime` takes the language; enum tag labels via `t()`. |
| `frontend/src/api/client.ts` | Interceptor keeps `code`; add `translateApiError`. |
| `frontend/src/pages/*.tsx` (9 files) | Replace literals with `t()`; use formatters for dates and counts. |
| `frontend/package.json`, `package-lock.json` | Two runtime deps (§5), one dev dep for tests. |
| `frontend/playwright.config.ts`, `frontend/e2e/*.spec.ts` (new) | Switcher and translated page tests. |
| `frontend/src/vite-env.d.ts` | No change. |
| `frontend/index.html` | `lang="en"` remains the static default; updated at runtime. |

Unchanged: backend (`src/`), routes, API contracts, schema, migrations, Dockerfile,
docker-compose, nginx.conf (the frontend builds with `npm install`, so the lock file
updates are picked up as before).

## 4. Formatting rules

- English timestamps stay `YYYY-MM-DD HH:mm:ss` (spec open question: kept as is).
- Romanian timestamps use `DD.MM.YYYY HH:mm:ss` (assumption recorded in the spec).
  This is stored per language in `languages.ts` (`dateTimeFormat`), so changing it is a
  one-line config change.
- Numbers: `Intl.NumberFormat(code).format(n)`, giving `1,234` for en and `1.234` for ro.
- Empty values keep `—`.

## 5. New dependencies

| Name | Justification |
|---|---|
| `i18next` (^27) | Standard i18n core: keyed catalogues, interpolation, fallback to `en`, and a `changeLanguage` event. Without it we would rebuild these parts by hand. |
| `react-i18next` (^18) | `useTranslation` hook and re-rendering on language change. Its peer deps (react >=18, i18next >=27.0.1) match this app. |
| `@playwright/test` (dev) | Browser tests for the switcher, reload persistence, browser-language detection and a translated page. Playwright is already the sandbox's browser tool and the addendum's test runner. Route-mocking lets the tests run without the backend or database. |

Nothing else is added. antd locales, dayjs locales and `Intl` come from packages or
the browser the project already has.

## 6. Alternatives considered

| Option | Why not chosen |
|---|---|
| Hand-rolled `t()` with a React context and JSON files | Zero deps, but it re-implements interpolation, fallback and change events that i18next already does. The project would own that code forever. |
| `react-intl` (FormatJS) | Solid, and it includes ICU formatting. But it duplicates what antd locales and `Intl` already give us, and it is heavier than needed. |
| `i18next-browser-languagedetector` | Would handle the browser-language step, but it is ~15 lines of our own code here, so a dependency is not worth it. |
| zustand `persist` for the language | Stores `"ro"` JSON-encoded, which breaks the agreed `pinpad-language = ro` (SC-04). A plain `localStorage` read/write satisfies the spec. |
| Route-prefixed languages (`/ro/...`) | Out of scope (spec non-goal). Also breaks the kiosk URL `/pinpad/<roomCode>`. |
| Translate API `message` on the backend | Out of scope. The backend stays English. The frontend maps codes, which keeps the API contract unchanged. |
| Keep literal strings and add `t()` only to new text | Fails the "no English text remains" criterion. |
| Vitest + React Testing Library for the UI | Good for unit tests, but it needs a DOM harness and does not check the real switcher and reload behaviour. Playwright covers those end to end with mocked API routes. Unit-style checks for `resolveInitialLanguage` and `translateApiError` can be added as Playwright tests that run in the browser context. |

## 7. Trade-offs

- Two runtime dependencies and one dev dependency: bundle size grows (i18next is small;
  the antd and dayjs locale files are loaded eagerly for the two languages). Acceptable
  for an internal admin app; locale code-splitting can be added later if it matters.
- Enum labels (`GRANTED`, `LOCKED`, `ENTER`, ...) become translated text. Stored values and
  API payloads stay as they are, so filters and logic still use the codes.
- Translation of the stored reason text in the registry is out of scope. The Registry
  "Reason" column shows the stored code through `translateApiError`-style mapping only when
  the code is known; free text is shown as stored (spec non-goal).
- The static `index.html` title stays English in the HTML source; the browser title is
  set at runtime. A short flash of English is possible before React mounts.
- Romanian date format is an assumption; changing it is one line in `languages.ts`.

## 8. Test plan (maps to acceptance criteria)

- `e2e/language-switcher.spec.ts`: switch to Romanian in the header (SC-01); reload keeps
  Romanian (SC-03); `localStorage['pinpad-language'] === 'ro'` (SC-04); `ro-RO` browser with
  no stored value opens Romanian (SC-05); `fr-FR` opens English (SC-06); stored `en` beats
  `ro-RO` browser (SC-07).
- `e2e/translated-pages.spec.ts`: Romanian Dashboard and Registry (SC-02, SC-08 with the
  mocked timestamp `2025-11-25 14:03:00` → `25.11.2025 14:03:00`); Monitoring number
  `1234` → `1.234` (SC-09); kiosk `/pinpad/<room>` in Romanian with mocked
  `INVALID_CODE_LENGTH` (SC-10) and unknown code `Something odd` (SC-11), and in-page switch
  (SC-12).
- SC-13 (third language): verified manually in the note's procedure. A test adds a fixture
  `fr` entry and checks the switcher lists it. No component file changes.
- Existing checks: `npm run build` (includes `tsc` only if added; at least `vite build`),
  and `docker compose up --build` must start the frontend container.

## 9. Work plan (for the build station)

1. Add dependencies and `i18n/` modules, `languageStore`, `LanguageSwitcher`.
2. Write `locales/en.json` from the existing English literals first, so English output is unchanged.
3. Write `locales/ro.json` and wire `api/client.ts` error code mapping.
4. Convert `App.tsx`, `common.tsx`, then the nine pages and `PinpadPage.tsx`.
5. Add Playwright config and the two spec files; run `npx playwright test`.
6. Run `vite build`, then `docker compose up --build frontend` to confirm startup.
