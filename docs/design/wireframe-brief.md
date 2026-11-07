# Version-One Adaptive Wireframe Brief

> **Status:** Complete and approved  
> **Last reviewed:** 2026-11-06  
> **Phase:** Phase 0 — Define version one

This brief turns the confirmed route and product contracts into a manageable set
of adaptive large-screen templates. It is the input for Stitch or Figma
wireframes; it does not replace visual approval.

## Design authority

- [`DESIGN.md`](DESIGN.md) defines the current visual language.
- The Stitch **Admin / Manage Places** desktop screen is approved.
- Its manage-places table and place-editor sheet cover part of the **Admin places**
  template below.
- The existing Stitch **Home / Explore** screen is available as a reference but is
  not yet approved as the public UI source of truth.
- [`admin-ui-spec.md`](admin-ui-spec.md) defines implementation and accessibility
  requirements derived from the approved admin screen.

## Web design frames

Every visual template should be evaluated at these representative widths:

| Frame             |   Width | Structural intent                                                        |
| ----------------- | ------: | ------------------------------------------------------------------------ |
| Minimum supported | 1024 px | Large-tablet/computer viewport; compact navigation and wrapped controls  |
| Desktop           | 1440 px | Full navigation, editorial grid, tables where appropriate                |
| Wide desktop      | 1920 px | Preserve the 1440-pixel content maximum and intentional outer whitespace |

These are design frames, not hard-coded device breakpoints. The implementation
should change layout when content needs it and remain usable between frames.

The web product is not designed for phones. Physical diagonal size is not a
reliable browser capability, so support is defined as **1024 CSS pixels or wider
at default zoom**, corresponding to the intended approximately 11.9-inch-and-up
tablet/computer class. Browser zoom, text enlargement, and accessibility reflow
remain required below that effective width; those fallback layouts are not a
phone-specific product experience. A native mobile app will be designed
separately.

## Shared shells

### Public shell

- Brand, Explore, Cities, Categories, and Sign in/account entry.
- Public content maximum width and editorial whitespace from `DESIGN.md`.
- At the minimum supported width, navigation may compact into a labelled menu
  before it wraps or overflows.

### Personal shell

- Public navigation plus My activity, Add a place, Account, and Sign out.
- Clearly distinguishes private activity from public contributions.
- Admins use the same personal shell for their own visits and reviews.

### Admin shell

- Manage places, Submissions, Change proposals, Cities, Categories, Reviews,
  Users, Audit, My activity, Account, and Sign out.
- Wide layouts may use horizontal or side navigation; the minimum supported frame
  uses a labelled compact menu rather than an icon-only navigation rail.
- Admin status never changes the privacy of personal visits.

### Auth shell

- Minimal brand context, no distracting application navigation.
- Sign-in and account-setup forms use a narrow readable column.
- Error, expired-link, and success states use the same shell.

## Template inventory

Routes sharing the same layout and interaction model should use one visual
template with state variants rather than independent designs.

| Template             | Primary routes                                     | Required roles     | Design status                                                                         |
| -------------------- | -------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Home and explore     | `/`, `/places`                                     | Everyone           | 1024/1440 user frames and guest/admin headers approved                                |
| City/category browse | `/cities/[citySlug]`, `/categories/[categorySlug]` | Everyone           | 1024/1440 pattern board approved                                                      |
| Place detail         | `/places/[placeId]/[slug]`                         | Everyone           | Active-sheet and closed frames approved                                               |
| Authentication       | `/sign-in`, `/account/setup`                       | Guest/token holder | 1024/1440 forms and lifecycle-state board approved                                    |
| Account              | `/account`, `/account/security`                    | User/admin         | 1024/1440 profile/security pattern board approved                                     |
| My activity          | `/my`, `/my/visits`, `/my/reviews`                 | User/admin owner   | Overview and 1024/1440 visit/review management patterns approved                      |
| Submission workspace | `/my/submissions/*`, `/my/proposals/*`             | User/admin owner   | Core screens and 1024/1440 lifecycle-state pattern approved                           |
| Place contributions  | `*/review`, `*/visits`, `*/suggest-edit`           | User/admin owner   | Core tasks and place-specific visit history/edit/delete pattern approved              |
| Admin dashboard      | `/admin`                                           | Admin              | 1024/1440 frames approved                                                             |
| Admin places         | `/admin/places*`                                   | Admin              | Desktop reference plus 1024/direct-create/standalone-editor completion board approved |
| Moderation queue     | `/admin/submissions*`, `/admin/proposals*`         | Admin              | Proposal comparison plus queue/new-submission comparison board approved               |
| Taxonomy management  | `/admin/cities`, `/admin/categories`               | Admin              | Shared list, action, and state patterns approved at 1024/1440                         |
| Review moderation    | `/admin/reviews`                                   | Admin              | Shared list, action, and state patterns approved at 1024/1440                         |
| User management      | `/admin/users*`                                    | Admin              | Shared list, action, and state patterns approved at 1024/1440                         |
| Audit                | `/admin/audit`                                     | Admin              | Shared list, detail, and state patterns approved at 1024/1440                         |

The public-system-state reference board is approved; it
covers loading, empty, no-results, recoverable error, missing data, validation,
success feedback, and expired-session behavior.

## Priority wireframe set

The following templates establish the architecture with the least duplicate
design work.

### 1. Home and explore

Desktop structure:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Brand        Explore  Cities  Categories              Sign in    │
├──────────────────────────────────────────────────────────────────┤
│ Editorial introduction / focal image                             │
│ Search places…                                      [Search]     │
├──────────────────────────────────────────────────────────────────┤
│ Recently added                                                   │
│ [card]  [card]  [card]  [card]  →                               │
├──────────────────────────────────────────────────────────────────┤
│ Filters: City  Category  Type  Rating  Sort                       │
│ Results summary                                                   │
│ [place card/list]                                                 │
└──────────────────────────────────────────────────────────────────┘
```

Minimum-width changes:

- Compact header and labelled menu.
- Search becomes full width.
- Recent cards scroll horizontally with visible continuation.
- Filters may wrap or open a dedicated sheet; active filters remain visible as
  removable chips.
- Results use two-column cards or readable list rows.

Required states: first visit, loading, no places, no results, invalid filter,
recoverable error, signed-in navigation.

### 2. Place detail

Desktop structure:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Breadcrumbs                                                      │
│ Place name                                      ★ 4.6 · 18 reviews│
│ City · Category · Type                                           │
├───────────────────────────────┬──────────────────────────────────┤
│ Cover/gallery                 │ Summary and description          │
│                               │ Address · Phone · Links           │
│                               │ Optional public attribution       │
├───────────────────────────────┴──────────────────────────────────┤
│ [Log visit] [Write/edit review] [Suggest an edit]                │
├──────────────────────────────────────────────────────────────────┤
│ Rating breakdown and public reviews                              │
└──────────────────────────────────────────────────────────────────┘
```

Minimum-width changes:

- Gallery and identity may stack when the two-column composition becomes cramped.
- Actions wrap without truncation.
- Personal visit count is shown only when signed in.
- Contribution tasks use wide sheets or standalone routes.

Required states: no image, unrated, no reviews, hidden own review, unpublished/not
found, and authenticated/guest action variants.

### 3. Authentication and setup

```text
┌──────────────────────────────┐
│ Brand                        │
│ Sign in / Set up account     │
│ Email                        │
│ Password                     │
│ [Primary action]             │
│ Status or recovery guidance  │
└──────────────────────────────┘
```

Setup variants: valid link, validation failure, expired/revoked/used link, success,
and admin-assisted replacement guidance. The interface never reveals whether an
arbitrary unprovisioned email exists.

### 4. My activity

Desktop structure:

```text
┌──────────────────────────────────────────────────────────────────┐
│ My activity                                      [Add a place]   │
│ [Visits] [Reviews] [Submissions] [Proposed edits]                │
├──────────────────────────────────────────────────────────────────┤
│ Private summary cards                                            │
│ Recent activity list with status, place, date, and next action   │
└──────────────────────────────────────────────────────────────────┘
```

At the minimum width, use a compact tab selector or route-level menu and list
rows. Private
visit data must never appear in admin or public styling that implies shared
visibility.

### 5. Submission workspace

- Reuse the place-field organization from the approved editor where appropriate.
- Clearly label Draft, Pending review, Rejected, Withdrawn, or Published status.
- Separate private provenance from the optional proposed public attribution.
- Show save-draft and submit-for-review as distinct actions.
- Pending content becomes read-only except for Withdraw.
- Rejected content displays the admin reason and offers “Create revised draft.”
- Published-place proposals show current versus proposed fields.

The minimum-width frame uses a full-page form with a sticky task header; wider
desktop layouts may use a form or sheet when comparison context is unnecessary.

### 6. Review, visit, and suggest-edit tasks

These are three separate forms sharing a focused task shell:

- **Review:** required 1–5 overall stars, optional text, and optional enabled
  category ratings.
- **Visit:** required date and overall 1–5 rating, optional private notes, and
  optional enabled category-dimension ratings; clearly marked private and
  historically distinct from the public review.
- **Suggest edit:** current public fields prefilled, changed fields highlighted,
  private proposal note available.

Desktop may present the route as a modal/sheet over the place. At the minimum
supported width it may render as a standalone route. Direct navigation always has
complete context and a safe return to the place.

### 7. Admin dashboard

```text
┌──────────────────────────────────────────────────────────────────┐
│ Admin overview                                                    │
│ [Pending submissions] [Change proposals] [Hidden reviews]        │
├──────────────────────────────────────────────────────────────────┤
│ Needs attention                                                   │
│ Queue rows: type · subject · submitted by · age · action         │
├──────────────────────────────────────────────────────────────────┤
│ Recent administrative activity                                   │
└──────────────────────────────────────────────────────────────────┘
```

Counts are actionable links, not decorative analytics. Do not include other
users' visit counts or histories.

### 8. Admin places

Use the approved Stitch desktop screen and
[`admin-ui-spec.md`](admin-ui-spec.md). Additional wireframes are required for:

- Minimum-width list and full-page editor behavior.
- Add-place state.
- Publication status and approved public attribution.
- Empty, loading, error, validation, destructive, and permission states.
- The Visits column labelled as the signed-in admin's own visit count, or omitted
  from the admin management table if it causes ambiguity.

### 9. Moderation comparison

Desktop structure:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Submission / proposal · status · submitter · dates               │
├───────────────────────────────┬──────────────────────────────────┤
│ Current public value          │ Proposed value                   │
│ (blank for new submission)    │ Changed fields emphasized        │
├───────────────────────────────┴──────────────────────────────────┤
│ Private provenance · proposed public attribution                 │
│ Decision reason                                                   │
│ [Reject] [Approve and publish]                                    │
└──────────────────────────────────────────────────────────────────┘
```

At the minimum width, stack each current/proposed field pair rather than placing
two complete documents side by side. Approval and rejection require clear
confirmation and must handle a stale canonical place.

### 10. Administrative management lists

Cities, categories, reviews, users, and audit share a consistent list shell:

- Page heading and primary action where applicable.
- Search/filter row.
- Semantic table on wide screens; labelled summary rows on small screens.
- Pagination and result count.
- Route-specific actions and confirmations.

Category editing includes rating-capability assignments. User management includes
setup-link generation, suspension/restoration, deletion, and promotion/demotion.
Audit is read-only in version one.

## Cross-template requirements

- WCAG 2.2 AA target, visible focus, logical heading order, labelled controls, and
  keyboard-complete workflows.
- 44-pixel practical pointer targets, even where the visual control is compact.
- Loading, empty, no-results, error, success, pending, disabled, destructive, and
  expired-session states.
- Reduced-motion behavior for sheets, dialogs, galleries, and menus.
- Unsaved-change protection for drafts and editors.
- No private visits, provenance, proposals, or admin notes in public previews,
  search, metadata, or screenshots.
- Role differences are expressed through available actions and content, not only
  color or disabled controls.

## Recommended visual-design sequence

1. Revise the approved Stitch **Home / Explore** direction using
   [`public-ui-audit.md`](public-ui-audit.md).
2. Design public Place detail at minimum-width and desktop frames.
3. Extend the approved Admin places screen to the minimum-width frame and add
   system states.
4. Design Sign in and Account setup.
5. Design My activity and Submission workspace.
6. Design Admin dashboard and Moderation comparison.
7. Apply the management-list pattern to cities, categories, reviews, users, and
   audit.
8. Run a coverage review against [`../product/routes.md`](../product/routes.md).
