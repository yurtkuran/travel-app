# Phase 0 Design Consistency Review

> **Status:** Complete; ready for Phase 1  
> **Last reviewed:** 2026-11-07  
> **Phase:** Phase 0 — Define version one

This review closes the design-consistency work for the version-one web
application. It evaluates the approved Stitch screens and repository contracts as
one system rather than as isolated mockups.

## Outcome

The application is ready to enter Phase 1. **TravelTrove** with the restrained
text wordmark is the confirmed version-one identity.

No normal browser route lacks an approved composition or reusable pattern. The
minimum supported 1024-pixel and desktop 1440-pixel structures are approved, and
wide screens preserve the 1440-pixel content maximum. Shared state boards cover
the reusable loading, empty, no-results, validation, recoverable error, success,
pending, expired-session, forbidden, and destructive-action behaviors.

## Canonical visual system

- `docs/design/DESIGN.md` is the visual-token source of truth.
- The machine-readable front-matter colors are canonical. The narrative palette
  has been reconciled to the same semantic names and values.
- Inter weights are limited to 400, 500, and 600.
- The minimum practical pointer target is 44 by 44 CSS pixels.
- Focus uses a visible 2-pixel primary outline or equivalent inset treatment;
  the absence of a diffuse glow must never mean no focus indicator.
- Version-one web design begins at 1024 CSS pixels at default zoom. Reflow for
  browser zoom and text enlargement remains required; phone-product design is
  reserved for the separate native application.

Key contrast checks for the canonical palette:

| Pair | Contrast ratio | Intended use |
|---|---:|---|
| `on-surface` on `surface` | 16.25:1 | Primary text |
| `on-surface-variant` on `surface` | 8.92:1 | Secondary text |
| `outline` on `surface` | 4.25:1 | Non-text boundaries and controls |
| `on-primary` on `primary` | 13.94:1 | Dark primary actions |
| White on `primary-container` | 10.09:1 | Approved sage action buttons |
| `on-error` on `error` | 6.46:1 | Destructive/error actions |

Final component-level contrast still requires automated and manual testing in
Phase 1 because opacity, imagery, disabled states, and browser rendering can
change an otherwise valid token pairing.

## Route and shell consistency

- Public, authentication, personal, account, administration, and focused-task
  shells have distinct navigation and access cues.
- All product routes in `docs/product/routes.md` map to an approved screen or
  reusable pattern. Protocol and health routes correctly remain non-visual.
- Query-driven search, filters, sorting, and pagination remain URL-addressable.
- Direct-navigation forms contain full context even when desktop in-app
  navigation may use a dialog or sheet.
- Reference boards describe route families; production pages render only the
  relevant route specimen, never the entire board.

## Privacy and authorization consistency

- Guests are unauthenticated; stored roles are only `user` and `admin`.
- Admin privileges never expose another user's visits, visit ratings, visit
  notes, sessions, or other owner-only activity.
- **My visits** always means the signed-in person's derived count and is labelled
  explicitly, including in administration.
- Per-visit ratings are private historical snapshots and never contribute to
  public rating aggregates.
- Only visible, non-hidden public reviews contribute to public aggregates.
- Complete recommendation provenance remains private to its submitter and
  administrators. Optional public attribution is separately proposed and
  approved.
- Setup links are single-use, shown once during the live transaction, and never
  represented by a real/example token in design artifacts.
- Audit views are read-only and redact tokens, email bodies, IP addresses,
  session secrets, and sensitive payloads.

## Scope consistency

The approved baseline deliberately excludes:

- Public registration
- Phone-specific web layouts
- Notifications, wishlists, saved places, and bookmark features
- Browse-map mode
- Bulk administration and multi-select
- Advanced audit analytics or export
- Integrated invitation email delivery
- The three legacy destination guides
- Assumed wholesale migration of legacy data

These exclusions prevent generated design details from silently expanding
version-one scope.

## Implementation handoff

Phase 1 may begin with these design constraints:

1. Implement semantic tokens from `DESIGN.md`; do not copy generated Stitch HTML
   or create near-duplicate colors.
2. Build shared shells, form primitives, tables/labelled rows, overlays, feedback
   states, and authorization boundaries before route-specific styling.
3. Treat all authorization and ownership checks as server requirements; visual
   role differences are not security controls.
4. Use the screen IDs in `docs/design/README.md` as canonical visual references.
   Earlier regenerated drafts are superseded.
5. Validate keyboard flows, focus trapping/return, reduced motion, contrast,
   200-percent zoom, and 400-percent reflow during component implementation.

## Confirmed application identity

- **Application name:** TravelTrove
- **Wordmark:** The approved restrained text treatment used throughout the
  version-one screens
- **Spelling:** Preserve the internal capitals in `TravelTrove`

The following decisions remain open but are assigned to later phases and do not
block Phase 1:

- Initial category seed values — Phase 2 data design/seed work
- Final media formats, dimensions, size limits, image count, and processing —
  Phase 6
- Supported browser policy — Phase 1/8 verification planning
- Staging topology and independent backup destination — Phase 8
