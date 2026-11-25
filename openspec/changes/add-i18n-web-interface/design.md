# Design: i18n for the React admin SPA

Status: proposed · Change: `add-i18n-web-interface` · Risk: medium · Class: feature

This note sits beside `proposal.md` and `specs/web-i18n/spec.md`. It prefers what the project
already uses (antd, dayjs, zustand persist pattern, `Intl`, the browser's own language list) and
adds a dependency only where the built-in option would mean writing and maintaining more code.

## 1. Context (checked in the repo)

- `frontend/` is Vite 6, React 19, TypeScript, Ant Design 5.29, TanStack Query 5, react-router 7,
  zustand 5 (`pinpad-theme` persisted), dayjs 1.11. Baseline `npm ci && npm run build` passes on Node 22/24.
- Hard-coded English is spread over every page (about 80 literal UI strings in `pages/` and
  `components/`), plus `App.tsx` nav labels and the header. `components/common.tsx` is the only
  place that formats dates (`dayjs(...).format('YYYY-MM-DD HH:mm:ss')`).
- `src/common/errors.py` and `src/domain/access/service.py` return `{error, message, details.reason}`.
  Codes the frontend must map: `validation_error`, `not_found`, `conflict`, `hardware_error`,
  `internal_error`. Access reasons (`details.reason` / `reason`): `INVALID_CODE_FORMAT`,
  `INVALID_CODE_LENGTH`, `INVALID_ROOM_PIN`, `ROOM_NOT_FOUND`, `ROOM_INACTIVE`, `PERSON_NOT_FOUND`,
  `PERSON_INACTIVE`, `PERSON_HAS_NO_PERMISSION_FOR_ROOM`, `PERMISSION_NOT_YET_VALID`,
  `PERMISSION_EXPIRED`, `DOOR_CONTROLLER_OFFLINE`, `DOOR_SENSOR_ERROR`, `HARDWARE_ERROR`.
- `src/api/*`, routes and schemas are not touched.
- The Makefile `test` target points at a missing `tests/` directory. There is no frontend test runner.
- Probes run in this sandbox:
  - `Intl.NumberFormat('ro-RO').format(1234)` gives `1.234`, which matches the spec.
  - `Intl.DateTimeFormat('ro-RO', …)` gives `04.03.2025, 09:05:07`, with a comma. The spec wants
    `04.03.2025 09:05:07`, so dates need an explicit pattern, not the default locale output.
  - `antd/locale/ro_RO` exists. Without it, antd's own strings (pagination, empty states, Popconfirm
    buttons) stay in English, which breaks the "no English on screen" rule.
  - Peer ranges: `react-i18next@18` needs `i18next>=27.0.1`; `i18next@27` needs Node ≥22;
    `vitest@5` needs `vite^6.4`, so `vitest@4` is the version compatible with this repo's `vite ^6.0.5`.

## 2. Approach

1. **Library: `i18next` + `react-i18next`.** Standard, plural and interpolation support, and a
   `fallbackLng` setting that covers missing keys (i18n-15).
2. **Config module `frontend/src/i18n/config.ts`** is the one place listing supported languages:
   ```ts
   export const SUPPORTED_LOCALES = [
     { code: 'en', label: 'English',  antd: () => import('antd/locale/en_US'), dateFormat: 'YYYY-MM-DD HH:mm:ss' },
     { code: 'ro', label: 'Română',   antd: () => import('antd/locale/ro_RO'), dateFormat: 'DD.MM.YYYY HH:mm:ss' },
   ] as const
   export const DEFAULT_LOCALE = 'en'
   ```
   Adding a language = one JSON file + one entry here (i18n-14). The date pattern and antd locale
   sit next to the code so the rule holds for antd and dates too.
3. **Locale files `frontend/src/i18n/locales/{en,ro}.json`**, flat-namespaced keys
   (`nav.dashboard`, `people.form.code`, `errors.conflict`, `reason.INVALID_CODE_FORMAT`,
   `decision.GRANTED`, …). `en.json` is the source of truth. `ro.json` needs the same keys.
   Protocol values (`GRANTED`, `ENTER`, door states, person codes) stay as-is in the UI; only their
   labels are translated.
4. **Language resolution (`resolveInitialLocale()`)**, in this order:
   1. `localStorage['pinpad-locale']` if it is a supported code;
   2. the first entry of `navigator.languages` whose primary subtag is supported (`ro-RO` → `ro`);
   3. `en`.
   The choice is written back to `localStorage['pinpad-locale']` as the raw code (`ro`), which
   the spec requires (i18n-05). This is why it is not stored through the zustand `persist`
   middleware: that wraps the value in JSON (`{"state":…,"version":0}`).
5. **Switcher**: an antd `Select` (or `Segmented`) in the sidebar footer (desktop) and the header
   (below the `md` breakpoint). Both call `i18n.changeLanguage()`, which re-renders without a
   reload (i18n-03). The `<html lang>` attribute is kept in sync.
6. **Dates**: `fmtDateTime` uses dayjs with the pattern from the active locale's config entry.
   No dayjs locale import is needed because the pattern is explicit, so there is no comma issue.
7. **Numbers**: `Intl.NumberFormat(activeCode)` through a small `fmtNumber` helper in
   `components/common.tsx`. Used for KPI values and counts (i18n-10).
8. **API errors**: `api/client.ts` keeps `code` (`data.error`) and `reason` (`data.details?.reason`)
   on the thrown `Error` and stops using the English `message` for display. A pure helper
   `translateApiError(err, t)` in `src/i18n/errors.ts` looks up `errors.<code>` or
   `reason.<REASON>` and falls back to `errors.unknown` (i18n-11, i18n-12). The kiosk result uses
   the same mapping for `DENIED`/`ERROR` decisions (i18n-13). `message` text from the backend is
   never shown.
9. **antd built-ins**: `ConfigProvider locale` is set from the active locale's antd entry in
   `main.tsx` (kept outside `App`, so the kiosk gets it too).
10. **Tests**: Vitest 4 with jsdom 26 and React Testing Library 16. Tests live in
    `frontend/src/**/*.test.tsx` and run with `npm test` (`vitest run`). They cover:
    - the switcher (sidebar labels become Romanian, `localStorage['pinpad-locale'] === 'ro'`, i18n-16);
    - the Dashboard in Romanian with mocked API (i18n-17);
    - resolution order (saved choice wins; `ro-RO` and `de-DE` cases);
    - the missing-key fallback and the unknown-code fallback.
    The Makefile gets a `frontend-test` target. The backend `test` target is out of scope.
11. **Docker**: `frontend/Dockerfile` already runs `npm install`, so the new devDependencies install
    without any Compose change (i18n-18). No backend or compose service change.

## 3. Modules affected

- New: `frontend/src/i18n/config.ts`, `frontend/src/i18n/index.ts` (i18next init, detection, `<html lang>`),
  `frontend/src/i18n/errors.ts` (`translateApiError`), `frontend/src/i18n/locales/en.json`,
  `frontend/src/i18n/locales/ro.json`, `frontend/src/components/LanguageSwitcher.tsx`,
  test files under `frontend/src/**/__tests__/` or next to the code, `frontend/vitest.config.ts`
  (or a `test` block in `vite.config.ts`).
- Changed: `frontend/src/App.tsx` (nav labels from keys, header text, switcher placement),
  `frontend/src/main.tsx` (i18n import, antd locale), `frontend/src/components/common.tsx`
  (`fmtDateTime`, `fmtNumber`, tag labels), `frontend/src/api/client.ts` (code and reason on the error),
  every page under `frontend/src/pages/` (`PinpadPage`, `PinpadLauncherPage`, `DashboardPage`,
  `PeoplePage`, `RoomsPage`, `PermissionsPage`, `RegistryPage`, `MonitoringPage`, `DoorSimulatorPage`),
  `frontend/package.json` (dependencies and `test` script), `frontend/package-lock.json`,
  `frontend/tsconfig.json` (`types` for vitest globals if used), `Makefile` (`frontend-test`).
- Unchanged: backend (`src/`, `main.py`, `maps/`, migrations), `docker-compose.yml`, `frontend/nginx.conf`,
  `docs/`, `README.md` (the spec's non-goals rule out README translation).

## 4. Alternatives considered

| Option | Why not chosen |
|---|---|
| `react-intl` (FormatJS) | Works fine, but its ICU message syntax and `IntlProvider` are heavier than i18next for flat JSON files, and it brings a second formatting model when `Intl` and dayjs already cover dates and numbers. |
| Lingui | Needs a Babel/SWC macro or extraction step in the Vite build. That adds build complexity and a new CI step, which the spec's "one file plus one line" rule does not need. |
| Hand-rolled dictionary (`t(key)` over a plain object) | No new dependency, but it would re-implement interpolation, fallback to English, and pluralisation, and would need its own tests. More code to maintain than a standard library. |
| `i18next-browser-languagedetector` for detection and caching | Standard, but detection plus caching is about 15 lines over `localStorage` and `navigator.languages`. The plugin would add a dependency for that and would still need a custom key name and value format, so it does not earn its place. |
| Store the locale via the zustand `persist` store (like `pinpad-theme`) | Reuses an existing pattern, but it stores `{"state":{"locale":"ro"},"version":0}` under the key, not `ro`. That breaks i18n-05, so a plain `localStorage` read and write is used. |
| dayjs default locale formatting (`LL`, `L LTS`) | The `ro` locale output and `Intl` output both use a comma or month names that the spec does not ask for. An explicit pattern per language in config is what the spec describes. |
| Server-side locale (`Accept-Language`, per-user preference) | Explicitly out of scope; the backend API and contract stay unchanged. |
| `jest` with `babel-jest` | Needs a Babel transform in a Vite project. Vitest reuses the Vite config and the TypeScript setup. |
| Vitest 5 | Requires `vite ^6.4`; this repo pins `^6.0.5`. Vitest 4 is the newest line that works with the current Vite. |
| jsdom 31 | Requires Node 22.22+ and `node:22-alpine` in the Dockerfile is not pinned that way. jsdom 26 works on Node 22.12+. |

## 5. New dependencies

| Package | Version | Justification |
|---|---|---|
| `i18next` | `^27.2.7` | Standard i18n runtime: key lookup, interpolation, `fallbackLng` (missing-key rule), and the `changeLanguage` event. Node ≥22 matches the Dockerfile. |
| `react-i18next` | `^18.0.3` | React bindings (`useTranslation`, re-render on language change without reload). Peer `i18next>=27.0.1` is satisfied. |
| `vitest` (dev) | `^4.1.12` | Test runner that shares the Vite config. Compatible with `vite ^6`. Needed for the tests the spec requires. |
| `jsdom` (dev) | `^26.1.0` | DOM for Vitest. Version 26 supports Node 22.12+. |
| `@testing-library/react` (dev) | `^16.3.3` | Renders pages and drives the switcher (accepts React 19). |
| `@testing-library/dom` (dev) | `^10.4.2` | Peer of `@testing-library/react`. |

No new dependency for dates (dayjs is kept), numbers (`Intl`), antd locales (`antd/locale/*`, already
shipped), or language detection (`navigator.languages`).

## 6. Trade-offs

- **Two languages, 14 scenarios:** the Romanian file must hold every key from English. Tests check
  key parity between `en.json` and `ro.json` so a missing key fails the build, not the user.
- **Config vs. one-line rule:** a new language needs its JSON file plus a config entry with its
  antd locale and date pattern. A bare "one line" is not possible without loading antd locales by
  convention. The spec allows one config line, which this satisfies.
- **Dates:** the explicit pattern is correct for Romanian and matches the open question
  (`dd.MM.yyyy HH:mm:ss`). If the product wants another convention, only the `ro` config entry changes.
- **Per-browser choice:** the saved value lives in `localStorage` only. Clearing storage or using
  another browser resets it to the browser language, as the spec states.
- **Frontend-only error mapping:** backend messages stay English in the API. The UI never shows
  them, so logs and API consumers keep their current text.
- **Bundle size:** antd locales are loaded through `import()` per language, so the English-only
  first load stays small. The i18n runtime adds a few KB.
- **Test dependencies:** about six devDependencies and a Vitest config. This is the first frontend
  test setup in the repo; the Compose build installs them through `npm install` (no change to the image).

## 7. Open questions

- Confirm the Romanian date format `dd.MM.yyyy HH:mm:ss` and the dot thousands separator. The
  design follows the spec and makes both changes confined to the `ro` entry in config.
