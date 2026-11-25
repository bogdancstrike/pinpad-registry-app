# web-i18n

## ADDED Requirements

### Requirement: Translated UI strings
Every user-visible string in the frontend SHALL be read from the locale resource files; no
user-visible literal text remains in components.

#### Scenario: Romanian shows no English text
- **GIVEN** the interface is open in English on any page
- **WHEN** the user selects Română in the language switcher
- **THEN** every visible label, title, placeholder, button, table header, empty state, tooltip,
  confirmation, toast and modal text on the page is shown in Romanian and no English UI text is visible

### Requirement: Supported languages
The interface SHALL support English (`en`, default) and Romanian (`ro`).

#### Scenario: Default language is English
- **GIVEN** a first visit with no saved choice and a browser language of `fr-FR`
- **WHEN** the page loads
- **THEN** the interface is shown in English

### Requirement: Language switcher
The admin shell SHALL provide a language switcher that changes the interface language immediately
without a page reload.

#### Scenario: Switching language takes effect at once
- **GIVEN** the Dashboard is open in English
- **WHEN** the user chooses Română in the language switcher in the sidebar
- **THEN** the Dashboard title and KPI labels change to Romanian without a page reload and the URL stays `/dashboard`

#### Scenario: Switcher is available on mobile layout
- **GIVEN** the viewport is narrower than the md breakpoint
- **WHEN** the page loads
- **THEN** the language switcher is shown in the header and selecting a language changes the interface

### Requirement: Remembered choice
The chosen language SHALL be stored in `localStorage` under key `pinpad-locale` and reused on later visits.

#### Scenario: Reload keeps Romanian
- **GIVEN** the user selected Română
- **WHEN** the page is reloaded
- **THEN** the interface is shown in Romanian and `localStorage["pinpad-locale"]` equals `ro`

#### Scenario: Saved choice overrides browser language
- **GIVEN** `localStorage["pinpad-locale"]` is `en` and the browser language is `ro-RO`
- **WHEN** the page loads
- **THEN** the interface is shown in English

### Requirement: Browser language on first visit
When no saved choice exists, the interface SHALL use the first browser language whose primary
subtag is a supported language, otherwise English.

#### Scenario: Romanian browser opens in Romanian
- **GIVEN** no `pinpad-locale` value is saved and the browser reports `ro-RO`
- **WHEN** the page loads for the first time
- **THEN** the interface is shown in Romanian

#### Scenario: Unsupported browser language falls back to English
- **GIVEN** no `pinpad-locale` value is saved and the browser reports `de-DE`
- **WHEN** the page loads for the first time
- **THEN** the interface is shown in English

### Requirement: Localised dates and numbers
Dates, times and numeric KPI values SHALL be formatted for the active language.

#### Scenario: Romanian date format
- **GIVEN** the interface is in Romanian and an event occurred at 2025-03-04 09:05:07 local time
- **WHEN** the Registry page lists it
- **THEN** the time column shows `04.03.2025 09:05:07`

#### Scenario: Romanian number format
- **GIVEN** the interface is in Romanian and the summary reports 1234 granted attempts
- **WHEN** the Dashboard shows the "Granted today" KPI
- **THEN** the value is shown as `1.234`

### Requirement: Translated API errors
Error messages shown in the interface SHALL be produced from the error code returned by the API
(`error` or `details.reason`), translated into the active language. Unknown codes fall back to a
generic translated message.

#### Scenario: Known error code is translated
- **GIVEN** the interface is in Romanian and the API responds 409 with `error: "conflict"` for a duplicate person code
- **WHEN** the user saves a new person with that code
- **THEN** the toast shows the Romanian text for a conflict error and not the English API message

#### Scenario: Unknown error code falls back
- **GIVEN** the interface is in Romanian and the API responds with an unrecognised `error` code
- **WHEN** the error is displayed
- **THEN** a generic translated error message is shown and no English text from the API is displayed

#### Scenario: Access denial reason is translated on the kiosk
- **GIVEN** the Pinpad kiosk is in Romanian and the API returns `DENIED` with `reason: "INVALID_CODE_FORMAT"`
- **WHEN** the result screen is shown
- **THEN** the decision title and reason are shown in Romanian

### Requirement: Adding a language
A new language SHALL require only a new locale resource file and one entry in the language configuration.

#### Scenario: Third language is added by configuration
- **GIVEN** a developer adds `frontend/src/i18n/locales/fr.json` with all keys and adds `fr` to the supported-languages list
- **WHEN** the application is built and the browser reports `fr-FR` with no saved choice
- **THEN** the interface opens in French and the switcher lists French

#### Scenario: Missing key falls back to English
- **GIVEN** a locale file lacks a key present in English
- **WHEN** that key is rendered in that language
- **THEN** the English text is shown instead of the raw key

### Requirement: Tests
The frontend SHALL include automated tests covering the switcher and at least one translated page.

#### Scenario: Switcher test passes
- **GIVEN** the test suite is run with `npm test` in `frontend/`
- **WHEN** the switcher test renders the admin shell and selects Română
- **THEN** the test asserts the sidebar labels are Romanian and `localStorage["pinpad-locale"]` is `ro`, and passes

#### Scenario: Translated page test passes
- **GIVEN** the Dashboard is rendered with mocked API responses in Romanian
- **WHEN** the test queries the page
- **THEN** the Romanian page title and KPI labels are present and no English KPI label is present; the test passes

### Requirement: Application still starts
The application SHALL still start with `docker compose up`, with the frontend image building the new dependencies.

#### Scenario: Compose starts the stack
- **GIVEN** a clean checkout of the branch
- **WHEN** `docker compose up --build` is run
- **THEN** postgres, jaeger, backend and frontend start and `http://localhost:3000` serves the SPA in English by default

## Interfaces affected

- Frontend screens: all pages (Dashboard, Pinpad launcher, Pinpad kiosk, People, Rooms,
  Permissions, Registry, Monitoring, Door Simulator) and the admin shell (sidebar, header, language switcher).
- Frontend modules: new `frontend/src/i18n/` (config, locale files), `components/common.tsx`,
  `App.tsx`, `main.tsx`, `api/client.ts` (error mapping).
- Browser storage: new `localStorage` key `pinpad-locale`.
- Routes and HTTP API: no change. Backend error payloads are consumed as-is.
- Build: `frontend/package.json` gains i18n and test dependencies; `npm test` script added.
- CLI: none.
