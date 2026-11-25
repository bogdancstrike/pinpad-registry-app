# Add internationalisation (i18n) to the web interface

## Goal

The React web interface (`frontend/`) shows all text in English, written inline in
the components. Make the interface available in more than one language:

- All user-facing frontend strings come from translation files, not from components.
- Two languages at start: English (default, `en`) and Romanian (`ro`).
- A language switcher in the interface; the choice is saved in the browser and
  restored on the next visit.
- On a first visit with no saved choice, the browser language is used if it is
  supported (`ro-*` → Romanian, otherwise English).
- Dates and numbers are formatted for the active language.
- API error codes shown in the interface are mapped to translated text.
- Adding a third language needs only a new translation file plus one entry in a
  language configuration list.

## Non-goals

- No translation of backend (Python/QF) responses, backend logs or OpenTelemetry spans.
  The API keeps its English `message` fields; the interface shows translated text
  for known error codes and falls back to the API message for unknown codes.
- No translation of data entered by users or stored in the database (person names,
  room names, room codes, department, role, descriptions, reasons stored in the registry).
- No right-to-left layout support, no pluralisation rules beyond what the chosen
  translation library provides for Romanian, no locale-specific currency (the app shows no money).
- No server-side language negotiation, no user accounts, no language stored in the database.
- No language switch in the URL (no `/ro/...` routes).
- No change to the dark/light theme behaviour, routes, API contracts or database schema.
- No new third language; only the two listed above are shipped.
