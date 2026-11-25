# Web interface internationalisation

## ADDED Requirements

### Requirement: Translated strings come from translation files
Every user-facing string in the frontend (navigation, page titles, labels, buttons,
table headers, messages, placeholders, tooltips, empty states, and the kiosk screens)
SHALL be read from a translation file keyed by message id. Components SHALL NOT contain
literal user-facing English text.

### Requirement: Supported languages are configured in one place
The system SHALL support English (`en`, default) and Romanian (`ro`). The list of
supported languages, their display names and their translation files SHALL be defined
in a single configuration module. Adding a language SHALL require only a new translation
file and one entry in that configuration.

### Requirement: Language switcher
The interface SHALL provide a language switcher in the admin shell header and on the
kiosk screens. Choosing a language SHALL immediately re-render all visible text in
that language without a page reload.

### Requirement: Language choice is remembered
The chosen language SHALL be saved in the browser's local storage under the key
`pinpad-language`, and SHALL be applied on every later visit.

### Requirement: Browser language on first visit
When no saved choice exists, the interface SHALL use the first browser language
(`navigator.languages`) whose primary subtag is supported (`ro` → Romanian). If none
is supported, it SHALL use English.

### Requirement: Locale-aware dates and numbers
Dates, times and numbers shown in the interface SHALL be formatted for the active
language. Romanian uses the `ro` locale conventions (for example `25.11.2025 14:03:00`
for dates and time, `1.234` for thousands separators); English keeps `YYYY-MM-DD HH:mm:ss`
for timestamps.

### Requirement: Translated API error codes
When the API returns an error with a known code (`error` field or `details.reason`), the
interface SHALL show the translated text for that code. Unknown codes SHALL show the API
`message` as returned, or the generic translated "Request failed" text if there is none.
Codes SHALL remain as returned by the API.

## Scenarios

### Scenario: Switching to Romanian translates the admin shell
- **ID**: i18n-switch-shell
- **GIVEN** the admin dashboard is open in English with no saved language choice
- **WHEN** the user selects "Română" in the language switcher in the header
- **THEN** the navigation labels, header subtitle, page title and theme tooltip are shown in Romanian
- **AND** no English navigation label or header text remains on screen

### Scenario: Switching language translates every admin page
- **ID**: i18n-switch-all-pages
- **GIVEN** the language is set to Romanian
- **WHEN** the user opens each of Dashboard, People, Rooms, Permissions, Registry, Monitoring and Door Simulator
- **THEN** every visible label, heading, table column, button and empty-state text on each page is in Romanian
- **AND** no English user-facing text is visible (brand names "Pinpad" and "PIN" are excepted)

### Scenario: Chosen language survives a reload
- **ID**: i18n-persist-reload
- **GIVEN** the user selected Romanian in the switcher
- **WHEN** the page is reloaded
- **THEN** the interface is shown in Romanian
- **AND** the switcher shows Romanian as selected

### Scenario: Chosen language is stored under the agreed key
- **ID**: i18n-storage-key
- **GIVEN** the user selects Romanian
- **WHEN** the browser's local storage is inspected
- **THEN** the key `pinpad-language` holds the value `ro`

### Scenario: Romanian browser opens in Romanian on first visit
- **ID**: i18n-browser-default-ro
- **GIVEN** no `pinpad-language` value is stored and the browser language is `ro-RO`
- **WHEN** the user opens the interface for the first time
- **THEN** the interface is shown in Romanian
- **AND** the switcher shows Romanian as selected

### Scenario: Unsupported browser language falls back to English
- **ID**: i18n-browser-default-en
- **GIVEN** no `pinpad-language` value is stored and the browser language is `fr-FR`
- **WHEN** the user opens the interface for the first time
- **THEN** the interface is shown in English

### Scenario: Saved choice overrides the browser language
- **ID**: i18n-saved-overrides-browser
- **GIVEN** `pinpad-language` is `en` and the browser language is `ro-RO`
- **WHEN** the user opens the interface
- **THEN** the interface is shown in English

### Scenario: Dates are formatted for the active language
- **ID**: i18n-dates-locale
- **GIVEN** a registry event created at 2025-11-25 14:03:00 exists
- **WHEN** the Registry page is shown in English and then in Romanian
- **THEN** the English view shows the timestamp as `2025-11-25 14:03:00`
- **AND** the Romanian view shows the timestamp as `25.11.2025 14:03:00`

### Scenario: Numbers are formatted for the active language
- **ID**: i18n-numbers-locale
- **GIVEN** the Monitoring page shows a count of 1234 events
- **WHEN** the page is shown in Romanian
- **THEN** the count is shown as `1.234`

### Scenario: Known API error code is shown translated
- **ID**: i18n-error-code-translated
- **GIVEN** the language is Romanian
- **WHEN** the kiosk submits a code of the wrong length and the API returns reason `INVALID_CODE_LENGTH`
- **THEN** the result screen shows the Romanian text mapped to `INVALID_CODE_LENGTH`
- **AND** the English API message is not shown

### Scenario: Unknown API error falls back to the API message
- **ID**: i18n-error-unknown-fallback
- **GIVEN** the language is Romanian
- **WHEN** an API call fails with an error code that has no translation and a message "Something odd"
- **THEN** the interface shows "Something odd" as the error text

### Scenario: Kiosk screens follow the language choice
- **ID**: i18n-kiosk-language
- **GIVEN** the language is set to Romanian
- **WHEN** the pinpad kiosk for a room is opened at `/pinpad/<roomCode>`
- **THEN** the keypad, prompts and result screens are shown in Romanian
- **AND** the language switcher on the kiosk changes the language without reload

### Scenario: Adding a language needs only a file and one config entry
- **ID**: i18n-add-language
- **GIVEN** a developer adds a translation file for French and one entry for `fr` in the language configuration
- **WHEN** the interface is built and a browser with language `fr-FR` opens it
- **THEN** the interface is shown in French and the switcher lists French
- **AND** no component source file was changed

## Interfaces affected

- **Frontend screens**: admin shell header and navigation (new switcher), Dashboard, People,
  Rooms, Permissions, Registry, Monitoring, Door Simulator, Pinpad launcher, Pinpad kiosk.
- **Frontend modules**: new i18n module and `locales/en`, `locales/ro` translation files;
  `stores` (new language store, persisted as `pinpad-language`); `components/common.tsx`
  (date and tag labels); `api/client.ts` (error mapping).
- **Browser storage**: new localStorage key `pinpad-language` (values `en` | `ro`).
- **Routes**: none added or changed.
- **Backend API / CLI / schemas / database**: none changed. Error codes already returned
  by the API (`INVALID_CODE_FORMAT`, `INVALID_CODE_LENGTH`, `DOOR_CONTROLLER_OFFLINE`,
  `DOOR_SENSOR_ERROR`, and the generic error codes) are the translation keys.
- **Docker**: `docker compose up` must still build and start the frontend image (no new services).

## Tests and verification

- Existing tests keep passing (note: the repository currently has no `tests/` directory;
  `make test` must still run as it does today).
- New frontend end-to-end tests (Playwright, already available in the sandbox) cover the
  switcher, persistence across reload, browser-language default and at least one
  translated page (Registry or Dashboard), including the date format.
- Build check: `npm run build` in `frontend/` succeeds.

## Assumptions

- Translation library: `i18next` with `react-i18next`, which fits the existing React 19 and
  Vite stack. The choice is an implementation detail and does not change user behaviour.
- The kiosk gets the same switcher as the admin shell, because "every page" must be translated.
- "Pinpad" and "PIN" are brand/technical terms and stay untranslated.
- Romanian date format `dd.MM.yyyy HH:mm:ss` and thousands separator `.` follow the common Romanian locale.
- Only the frontend changes; API `message` strings stay English and are used only as a fallback.
