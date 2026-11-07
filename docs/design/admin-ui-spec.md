# Administration UI Specification

> **Status:** Version-one administration patterns approved  
> **Last reviewed:** 2026-11-07  
> **Phase:** Phase 0 — Define version one

This document translates the approved administration design into implementation
requirements. It is a living specification: update it when a responsive design,
additional administrative screen, or interaction decision is approved.

## Source and authority

- **Design system:** [`DESIGN.md`](DESIGN.md), “Serene Editorial Travel”
- **Stitch project:** **TravelTrove Web UI** (`18045474233674104599`)
- **Original approved screen:** **Admin / Manage Places**
  (`e2eaecfef4734fb6956a08d7a0a73ae4`)
- **Responsive completion boards:** minimum 1024
  (`6e63cbdd48584972bfd1ff937a97d10b`) and desktop 1440
  (`e3c12b56f4d646d0a0f55b72aa7392ac`)
- **Generated artifacts reviewed:** screenshots and generated HTML

The screenshot is authoritative for the approved desktop composition. `DESIGN.md`
is authoritative for the reusable visual language. The Stitch-generated HTML is
reference material for discovering content and intended interactions; it is not
production code and does not establish architecture, semantics, accessibility,
or exact component APIs.

The original **Manage Places** screen establishes the visual direction. The
approved completion boards establish minimum-width list reflow, direct create,
standalone edit, publication transitions, moderation queues, and new-submission
comparison. The generated HTML remains reference material rather than production
code.

The Visits column was initially conceived as a finished-product element. Visit
capture is now confirmed for version one. It displays the signed-in user's own
visit count and never an aggregate or another user's activity. Guests do not see
visit counts.

## Executive design summary

The administration experience is a quiet, editorial repository rather than a
dense enterprise dashboard. Its primary view is a searchable, filterable table
of places. Editing happens in a focused 480-pixel sheet over the list, preserving
the user's repository context. Small nested dialogs allow a city, category, or
image to be added without abandoning the place form.

The interface uses warm neutral surfaces, charcoal text, restrained deep-sage
actions, generous whitespace, subtle hairlines, and Inter typography. The visual
direction is suitable for version one, but the approved screen does not yet cover
minimum-width behavior, creation versus editing differences, destructive actions,
validation and system states, authorization cues, or all agreed version-one data.

## Screen anatomy

### 1. Global header

- Fixed, translucent header with a subtle bottom border and blurred backdrop.
- Brand at the left: **TravelTrove**, the confirmed version-one product name,
  using the restrained approved text wordmark.
- Primary links: **Explore** and **Manage Places**.
- Account control at the right, represented by a person icon in the artifact.
- Content is centered in a maximum 1440-pixel container.
- The current admin destination must be programmatically identified as current,
  not indicated by color alone.

### 2. Page introduction and primary action

- Page title: **Manage Places**.
- Repository count: “28 saved places across 8 cities” in the example.
- Supporting text explains the page's purpose.
- **Add Place** is the visually dominant action and uses the primary pill button.
- Counts are live data and must use correct singular/plural grammar.

### 3. Search and filters

- Place search with the prompt **Filter existing places…**.
- City filter with **All Cities** as its neutral value.
- Category filter with **All Categories** as its neutral value.
- A sort/filter control and a visible summary such as **Sorted by recently
  modified**.
- Filter state should be represented in URL query parameters so it is reloadable,
  shareable, and compatible with browser navigation.
- Search should be debounced or explicitly submitted; it must not issue a request
  for every unthrottled keystroke.
- Provide a clear-all action whenever one or more non-default filters are active.

### 4. Places table

The approved columns are:

| Column                  | Required content                                  |
| ----------------------- | ------------------------------------------------- |
| Place Name              | Thumbnail, place name, and short address/locality |
| City                    | City and country                                  |
| Category                | Category icon and name                            |
| Source / Recommended By | Recommender/source plus source type               |
| Visits                  | Visit count or **Unvisited**                      |
| Actions                 | Direct **Edit** action and an overflow menu       |

Rows use hairline separators rather than individual elevated cards. The example
shows five rows and the summary **Showing 5 of 28 places**, followed by Previous
and Next pagination controls.

Implementation requirements:

- The entire row may offer a large pointer target, but it must not replace a real,
  keyboard-accessible edit link or button.
- Table headers must use semantic header cells. Sortable headers must expose
  direction with `aria-sort`.
- Thumbnails require meaningful alternative text when informative; redundant
  thumbnails should use empty alternative text.
- Overflow actions require a labelled menu button, keyboard navigation, focus
  management, and safe destructive confirmation.
- Pagination must retain search, filter, and sort parameters.
- The current example is not evidence that version one should be limited to five
  rows per page; page size remains a product decision.

### 5. Place editor sheet

The approved edit state opens a right-docked sheet over a dimmed, blurred page.

- Desktop width: **480 CSS pixels**.
- Full viewport height with independently scrolling form content.
- Header contains the eyebrow **Repository Entry**, a contextual title, Close,
  and **Save Changes**.
- The underlying page remains visually recognizable but is inert while the sheet
  is modal.
- Entrance/exit motion is approximately 300 milliseconds and must respect
  `prefers-reduced-motion`.

The artifact contains these groups and fields:

| Group                  | Fields and actions shown                                                        |
| ---------------------- | ------------------------------------------------------------------------------- |
| Basic Information      | Place name; city; add city; category; add category; address; phone number       |
| Curated Imagery        | Ordered image thumbnails; remove image; image count; add image                  |
| Links & Coordinates    | Website; Google Maps; directory/Yelp; Instagram; reservation URL                |
| Recommendation Details | Recommended by; date recommended; source type; source URL; recommendation notes |
| Personal Field Notes   | Multiline personal notes                                                        |

The product meaning, ownership, and visibility of these fields are governed by
[`../product/place-model.md`](../product/place-model.md). The screen must not
collapse private provenance, admin-only notes, user reviews, and private visit
notes into a single generic notes field.

The sheet must be implemented as an accessible modal dialog on desktop:

- Give it an accessible name derived from the visible title.
- Move focus into it when opened and restore focus to the trigger when closed.
- Trap focus while open and make background content inert.
- Close through its labelled button and Escape unless a nested dialog is open.
- Warn before closing when unsaved changes exist.
- Keep the primary save action available without forcing a long scroll; the
  header may remain sticky inside the sheet.
- Show pending, success, field-error, form-error, and retry states.
- Prevent double submission.

### 6. Nested dialogs

The generated artifact defines three centered dialogs, each approximately 420
pixels wide:

- **Add New City:** city name, optional state/region, country.
- **Add Category:** category name and icon picker.
- **Attach Photo:** image URL or device upload, drag-and-drop target, accepted
  examples JPG/PNG/HEIC, and a displayed 10 MB example limit.

These dialogs express an intended workflow, but their data rules and file limits
are not approved merely because they appear in generated HTML. Each dialog must:

- have a visible title and programmatic description where useful;
- use labelled form controls and inline validation;
- return focus to its invoking control;
- preserve the unsaved parent form;
- add a successfully created city/category to the relevant selector and select it;
- not close on a failed save/upload;
- place destructive or cancel actions before the primary action in keyboard order.

Opening a modal on top of another modal adds complexity. During implementation,
prefer a single coordinated dialog/sheet manager and verify the experience with
keyboard and screen-reader testing.

## Design tokens

### Canonical palette

The discrepancy between `DESIGN.md` front matter and prose is resolved. The
machine-readable front-matter values are canonical, and the narrative now uses
the same values and semantic token names. Do not create duplicate near-identical
tokens during implementation.

### Typography

- Use Inter with only weights 400, 500, and 600.
- Use the named display, headline, body, and label scales from `DESIGN.md`.
- Uppercase eyebrow and section labels use the small label styles with positive
  tracking.
- Body copy must not be reduced below the specified 13-pixel `body-sm` token.
- Interface copy should use sentence case except for editorial eyebrows.

### Spacing, radius, and elevation

- Maximum content width: 1440 pixels.
- Desktop page margins: 3rem; minimum-width margins may reduce to 2rem.
- Base component radius: 12 pixels; pills: fully rounded.
- Use surface changes and one-pixel hairlines before shadows.
- Reserve stronger shadows for modal layers; the very strong generated
  `shadow-2xl` is not consistent with the subtler design-system guidance and
  should be toned down in production.

### Controls

- Default button/control height is 40 pixels in the approved desktop design.
- Pointer targets should be at least 44 × 44 CSS pixels wherever layout permits;
  compact controls need sufficient surrounding hit area.
- Primary actions use deep sage; do not use the accent decoratively.
- Inputs require visible boundaries in default, hover, focus, error, and disabled
  states.

## Component inventory

The production component system should support these reusable primitives rather
than reproduce the generated page as a single component:

| Area              | Components                                                                        |
| ----------------- | --------------------------------------------------------------------------------- |
| Application shell | `AppHeader`, `PrimaryNav`, `AccountMenu`, `PageContainer`                         |
| Page heading      | `PageHeader`, `RepositorySummary`, `PrimaryAction`                                |
| Query controls    | `SearchField`, `SelectFilter`, `SortMenu`, `ActiveFilters`                        |
| Data display      | `DataTable`, `PlaceRow`, `PlaceThumbnail`, `CategoryLabel`, `Pagination`          |
| Overlays          | `Dialog`, `SideSheet`, `AlertDialog`, `Backdrop`                                  |
| Forms             | `FormField`, `TextInput`, `Select`, `DateInput`, `Textarea`, `FormErrorSummary`   |
| Place editor      | `PlaceForm`, `PlaceBasics`, `PlaceLinks`, `RecommendationFields`, `PersonalNotes` |
| Media             | `ImageList`, `ImageItem`, `ImageUploader`, `UploadProgress`                       |
| Feedback          | `InlineError`, `Toast`, `LoadingState`, `EmptyState`, `NoResultsState`            |

Names describe responsibilities rather than prescribing a particular component
library. Accessible headless primitives may provide the overlay, menu, and select
behavior, while the project owns the TravelTrove visual treatment.

## Adaptive web behavior

The web application targets viewports of 1024 CSS pixels or wider at default
browser zoom. It is not a phone product; a native mobile application will be
designed separately.

### Minimum supported viewport (1024 pixels)

- Retain the table only if essential columns remain legible without horizontal
  page scrolling; otherwise use labelled summary rows.
- Prioritize Place, City, Category, and Actions; move source and personal-visit
  metadata into a secondary line or disclosure.
- Search may occupy its own row and filters may wrap beneath it.
- The editor may use a wider sheet or a standalone page when 480 pixels is too
  constrained for the field layout.
- Nested dialogs remain keyboard-complete and must not extend outside the
  viewport.

### Desktop and wide desktop

- Use the approved table composition.
- Use the 480-pixel right-side editor sheet where content remains comfortable.
- Keep search and filters on one row when space permits.
- Preserve the 1440-pixel content maximum on wider screens.

Browser zoom and text enlargement must still reflow without loss of content or
functionality. This accessibility fallback is not a separately supported phone UI.
Minimum-width and desktop mockups are required before visual signoff.

## Accessibility requirements

Target WCAG 2.2 AA for public and administrative interfaces.

- Every control needs a persistent visible label. Placeholder text is not a label.
- Icon-only buttons need accessible names and tooltips where helpful.
- Focus must be clearly visible at all times. `DESIGN.md` asks for no outer focus
  glow; meet that aesthetic with a high-contrast 2-pixel outline or equivalent
  inset treatment. A border-color change alone is acceptable only if it meets
  focus-appearance contrast and area requirements.
- Validate text, control, border, and disabled-state contrast against the final
  reconciled palette.
- Announce result counts, upload progress, save results, and asynchronous errors
  without unexpectedly moving focus.
- Associate field errors with inputs and provide an error summary after failed
  submission.
- Do not use icons, color, or spatial position as the sole communication method.
- Support zoom to 200 percent and reflow at 400 percent without loss of content or
  two-dimensional page scrolling.
- Use native input types and autocomplete tokens where appropriate.
- Uploaded images require alternative text or an explicit decorative decision.
- Respect reduced-motion, increased-contrast, and browser text-size preferences.

The generated HTML removes outlines from many controls and uses custom selects.
Those implementation details fail the production requirement unless accessible
focus and keyboard behavior are restored.

## Required states not shown

Each relevant component or workflow needs designs for:

- initial loading and background refresh;
- empty repository;
- no search/filter results;
- recoverable and terminal loading errors;
- field validation and form-level errors;
- save/upload pending, success, and failure;
- disabled and read-only fields;
- image upload progress, invalid file, duplicate, and failed processing;
- unavailable or deleted city/category references;
- pagination boundaries;
- unsaved changes;
- destructive confirmation and deletion failure;
- expired session and insufficient permission;
- offline or interrupted network requests.

## Product and architecture implications

- The index requires server-side pagination plus allowlisted search, city,
  category, and sort parameters.
- The design introduces recommendation provenance that is not fully represented
  in the preliminary Phase 2 model. Those fields must be accepted, changed, or
  deferred before schema design.
- City is the confirmed version-one product and schema term; the implementation
  should use `cities` consistently rather than the broader `locations` name.
- Multiple links are modeled as named fields in the artifact. Decide whether they
  remain explicit columns or become typed related records.
- Multiple ordered images and removal actions reinforce the need for media order
  and transactional cleanup.
- Add-city and add-category flows imply permission checks inside the place editor,
  not merely at route level.
- The table's visit count is backed by version-one visit records and represents
  only the signed-in user's visits, including when the viewer is an admin.
- The editor must share one validation contract across client feedback and
  server-side enforcement.

## Resolved and remaining decisions

Resolved for version one:

- `DESIGN.md` machine-readable semantic colors are the canonical palette.
- `user` and `admin` shells, navigation, and privacy boundaries are approved.
- Complete private recommendation provenance and separately governed public
  attribution fields are confirmed in `place-model.md`.
- Visit capture/history and the explicitly owner-only **My visits** count are
  approved. Visit ratings never enter public aggregates.
- Canonical place fields, review/visit rating capabilities, and publication
  states are confirmed in the product contracts and approved completion boards.
- Inline city/category creation is an admin capability; ordinary users submit
  places against active taxonomy values.
- Place links are typed, ordered HTTPS records with optional labels.
- Row actions and publish, unpublish, archive, reject, approve, withdraw, and
  destructive confirmations are visually specified.
- Minimum 1024 and desktop 1440 patterns are approved. Wider viewports preserve
  the 1440-pixel content maximum.
- Loading, empty, no-results, validation, error, success, permission, session,
  and destructive states are approved through shared reference boards.
- Bulk actions and multi-select are not version-one features. Page size is an
  implementation choice and must not alter the approved pagination contract.

Remaining decisions:

1. Set actual upload formats, size limits, image count, and processing behavior
   during Phase 6; generated examples do not establish those limits.

## Acceptance criteria for the implemented screen

- The visual hierarchy and spacing match the approved desktop reference using the
  reconciled design tokens.
- Search, city/category filters, sorting, and pagination are URL-addressable and
  work together.
- An authorized user can open, edit, validate, save, and safely close a place
  without losing list context.
- Nested city, category, and image workflows preserve parent form state.
- Loading, empty, no-results, error, pending, success, and unsaved-change states
  are implemented.
- Authorization is enforced on the server for every read and mutation.
- The screen works at the supported minimum, desktop, and wide-desktop viewports
  after adaptive designs are approved.
- Keyboard-only and screen-reader workflows pass manual testing, and automated
  accessibility checks have no serious or critical findings.
- Reduced motion and 200-percent zoom are usable without loss of functionality.
