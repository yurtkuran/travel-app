# TravelTrove Implementation Plan

> **Document status:** Living document
> **Last updated:** 2026-11-07  
> **Current phase:** Phase 4 — Build the application shell and navigation
> **Project status:** Implementation in progress

This document is the implementation roadmap and ongoing record of scope,
architecture decisions, phase status, and completion criteria for TravelTrove.
It must be updated whenever scope changes, an architectural decision is
made, or a phase advances.

## Status key

- **Not started** — No implementation work has begun.
- **In progress** — Work is actively underway.
- **Blocked** — Progress requires a decision or external dependency.
- **Complete** — The phase completion gate has been satisfied.
- **Deferred** — Intentionally postponed beyond the current release.

## Phase status

| Phase | Name                                       | Status      |
| ----- | ------------------------------------------ | ----------- |
| 0     | Define version one                         | Complete    |
| 1     | Establish the technical foundation         | Complete    |
| 2     | Design the database                        | Complete    |
| 3     | Implement authentication and authorization | Complete    |
| 4     | Build the application shell and navigation | Not started |
| 5     | Implement the core vertical slice          | Not started |
| 6     | Add media handling                         | Not started |
| 7     | Complete public and administrative UX      | Not started |
| 8     | Security and quality hardening             | Not started |
| 9     | Deploy to DigitalOcean                     | Not started |
| 10    | Stabilize before adding features           | Not started |

## Confirmed project decisions

- This is a clean-sheet application, separate from the legacy PHP project.
- The legacy application and SQL dump are reference material, not a migration
  target.
- A selective legacy import may be considered later, but bulk migration is out
  of scope for version one.
- The legacy Charleston, France, and London destination guides are out of
  scope.
- The application will initially be a modular monolith.
- The primary language will be TypeScript.
- The frontend and server application will use React and Next.js App Router.
- PostgreSQL will be the primary database.
- Drizzle ORM will provide typed database access and versioned migrations.
- Better Auth will provide authentication, sessions, and role-based access
  control.
- The two stored application roles will be `user` and `admin`. A guest is an
  unauthenticated access state, not a stored role.
- Authenticated users can record their visits, write public reviews, and submit
  new places, but cannot publish places.
- Admins manage accounts, taxonomy, moderation, and place publication.
- Version-one accounts are invitation-only and provisioned by an admin; there is
  no public registration.
- Reviews become public immediately and remain subject to admin moderation.
- Visits and visit counts are private to the owning user, including when that user
  is an admin. Public place ratings are aggregated from visible reviews.
- Reviews require a whole-number overall rating from 1–5. Review text and enabled
  category-specific ratings are optional, and each user has at most one review
  per place.
- Each visit records a private whole-number overall rating from 1–5 and may record
  category-enabled dimension ratings, allowing the user to view personal trends
  over time. Visit ratings never enter public review aggregates.
- Admins manually email application-generated, single-use account-setup links;
  version one does not require an integrated invitation email provider.
- Users may propose edits to published places; an admin approves or rejects the
  proposal before canonical public content changes.
- Version-one media will use persistent filesystem storage behind a storage
  interface. An S3-compatible service such as SeaweedFS may be adopted later.
- The production target is Docker Compose on a DigitalOcean Droplet.
- Caddy is the planned production reverse proxy and TLS terminator.
- Node.js 24 LTS is the supported runtime for the initial implementation.
- pnpm 12 is the package manager and is pinned through Corepack metadata.
- Tailwind CSS 4 provides the styling foundation; shared accessible primitives
  will be introduced as application features require them.
- Initial categories are Restaurant, Bar, Hotel, Shop, Arts & Culture, and
  Attraction. Categories remain admin-managed data; Event is deferred until its
  version-one behavior is defined.

## Confirmed design sources

- The Stitch project **TravelTrove Web UI** (`18045474233674104599`) is the
  approved Phase 0 design source for the version-one administration panel.
- Its **Admin / Manage Places** desktop screen
  (`e2eaecfef4734fb6956a08d7a0a73ae4`) is the current admin-panel reference.
- The project's **Home / Explore** visual direction is approved, subject to the
  confirmed revisions in `docs/design/public-ui-audit.md`.
- Design references and outstanding design coverage are tracked in
  [`docs/design/README.md`](design/README.md).

## Version-one scope

- Accessible web interface for large tablets and computers, with a minimum
  supported viewport of 1024 CSS pixels at default browser zoom
- Public city and category navigation
- Public place listing and place detail pages
- Secure sign-in and sign-out
- Protected administration area
- Role- and permission-based authorization
- City management
- Category management
- Place management
- User-submitted places with an administrative publication workflow
- User-proposed changes to published places with administrative approval
- Authenticated visit logging and personal visit history
- Authenticated reviews displayed publicly
- Administrative account and review moderation
- Image upload, display, ordering, and deletion
- PostgreSQL schema and versioned migrations
- Validation, error handling, and structured logging
- Automated unit, integration, and browser tests
- Docker-based local development and production deployment
- Documented backup and restore procedures

## Deferred features

- Bulk migration of legacy records
- Legacy destination guides
- Social and community functionality
- Multi-tenancy and organizations
- Browse-map and advanced interactive-map experiences; outbound map links remain
  in version one
- Wishlists and saved-place lists separate from visit history
- Trip planning and itinerary features
- Phone-optimized web layouts and the separately designed native mobile app
- Dynamic runtime-defined roles
- S3-compatible object storage unless required during implementation
- Other planned enhancements not needed for the basic application foundation

---

## Phase 0 — Define version one

**Status:** Complete

Establish the product contract before creating application code.

### Work

- The version-one place contract is confirmed in
  [`docs/product/place-model.md`](product/place-model.md). Review, rating, and
  visit behavior is confirmed in
  [`docs/product/reviews-visits-ratings.md`](product/reviews-visits-ratings.md).
- The version-one role, permission, moderation, privacy, and account-lifecycle
  rules are confirmed in
  [`docs/product/access-control.md`](product/access-control.md).
- The public, personal, account, administration, and system route inventory is
  confirmed in [`docs/product/routes.md`](product/routes.md).
- Produce and approve minimum-width, desktop, and wide-desktop wireframes for the
  reusable public, account, personal, contribution, moderation, and administration
  templates. The full screen inventory and structural brief is recorded in
  [`docs/design/wireframe-brief.md`](design/wireframe-brief.md); route-level visual
  coverage and approvals are complete.
- Record deferred features explicitly.
- Confirm the application name and initial visual direction. **TravelTrove** and
  the restrained text wordmark are approved.
- Define version-one acceptance criteria.

### Design progress

- The administration panel's initial desktop direction is available in the
  Stitch project **TravelTrove Web UI**.
- The **Admin / Manage Places** screen is the approved admin-panel reference.
- Phase 0 item 1, the initial admin design audit, is complete. Its implementation
  specification, component inventory, responsive proposals, accessibility
  requirements, and open gaps are recorded in
  [`docs/design/admin-ui-spec.md`](design/admin-ui-spec.md).
- Admin overview and stale change-proposal comparison screens at the minimum
  1024 and desktop 1440 frames have passed product-content and visual QA and are
  approved.
- The shared administrative management-list pattern for cities, categories,
  reviews, users, and audit has been generated and visually QA-reviewed at the
  minimum 1024 and desktop 1440 frames; both are approved.
- Companion management-action and system-state boards at the minimum 1024 and
  desktop 1440 frames have been generated and visually QA-reviewed and are
  approved. They cover taxonomy forms, review moderation, user
  provisioning and lifecycle safeguards, setup-link handling, audit detail, and
  reusable asynchronous states.
- The Phase 0 route/state coverage audit is complete in
  [`docs/design/route-coverage-audit.md`](design/route-coverage-audit.md). Every
  normal browser route now has an approved composition or reusable pattern.
- The public-taxonomy and account-profile/security pattern boards have been
  generated and visually QA-reviewed at the minimum 1024 and desktop 1440
  frames. They address the four missing route surfaces identified by the audit
  and are approved.
- The personal-management and lifecycle pattern boards have been generated and
  visually QA-reviewed at the minimum 1024 and desktop 1440 frames and are
  approved. They cover owner-only visit/review lists, place-specific
  visit history/edit/delete, and submission/proposal terminal states.
- The Admin Places & Moderation completion boards have been generated and
  visually QA-reviewed at the minimum 1024 and desktop 1440 frames and are
  approved. They cover responsive place management, direct creation,
  publication transitions, moderation queues, and new-submission comparison.
- The final design consistency review is complete in
  [`docs/design/phase-0-consistency-review.md`](design/phase-0-consistency-review.md).
  **TravelTrove** with the restrained text wordmark is the confirmed version-one
  identity, and Phase 0 is closed.
- The revised **Home / Explore** visual direction, product/privacy corrections,
  and supported-viewport variants are approved. See
  [`docs/design/public-ui-audit.md`](design/public-ui-audit.md).
- Revised Home/Explore and Place Detail screens now exist in Stitch for the
  minimum 1024 and desktop 1440 frames and are visually approved. Exact IDs and
  QA results are recorded in `docs/design/public-ui-audit.md`.
- Closed Place Detail states, guest/admin Home headers, and the WCAG 2.2 AA public
  system-state board are visually approved and form part of the Phase 0 public
  design baseline.
- Sign-in and invitation-based account-setup screens at minimum 1024 and desktop
  1440 frames, plus the account-setup lifecycle-state board, have passed content
  QA and are visually approved.
- My Activity overview, My Submissions, and the new-place draft editor at minimum
  1024 and desktop 1440 frames have passed product-content QA and are visually
  approved.
- Public-review, private-visit, suggest-edit, and owner-facing proposed-edit detail
  screens at minimum 1024 and desktop 1440 frames have passed product-content QA
  and are visually approved.

### Initial entities

- Users
- Cities
- Categories
- Places
- Media
- Visits
- Reviews
- Place submissions and published-place change proposals

### Completion gate

Every version-one screen, route, entity, permission, and major workflow can be
described without relying on the legacy PHP implementation.

---

## Phase 1 — Establish the technical foundation

**Status:** Complete

Create the new application foundation independently of the legacy project.

### Planned stack

- TypeScript
- Next.js and React
- PostgreSQL
- Drizzle ORM and Drizzle Kit
- Better Auth
- Zod validation
- Tailwind CSS with accessible UI primitives
- Vitest
- Playwright
- Docker Compose

### Work

- Initialize the Next.js application with strict TypeScript.
- Select and document the package manager and supported Node.js version.
- Establish formatting, linting, and import conventions.
- Add environment-variable validation.
- Establish the modular project structure.
- Start PostgreSQL through Docker Compose.
- Add versioned database migrations.
- Configure unit, integration, and browser testing.
- Add continuous integration for type-checking, linting, tests, and production
  builds.
- Add health-check and structured-logging foundations.
- Document local setup and common development commands.

### Intended source organization

```text
src/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   └── admin/
├── features/
│   ├── auth/
│   ├── places/
│   ├── cities/
│   ├── categories/
│   └── media/
├── components/
├── db/
├── lib/
└── tests/
```

### Completion gate

A clean checkout can start the application and PostgreSQL through documented
commands, run migrations, and pass the continuous-integration checks.

### Implementation notes

- The repository pins Node.js 24 and pnpm 12 and includes native and Docker
  development paths.
- The initial Next.js shell, strict TypeScript configuration, environment
  validation, structured JSON logger, and health endpoints are in place.
- PostgreSQL 18 runs through Docker Compose. Drizzle migration `0000` adds only
  framework-owned application metadata; version-one domain modeling remains in
  Phase 2.
- Unit, database integration, and desktop Chromium browser test lanes are
  configured, along with CI checks for formatting, linting, types, tests, and a
  production build.
- The dependency lockfile is committed, the documented Compose stack starts the
  application and PostgreSQL successfully, migrations apply, and liveness and
  readiness checks pass.
- Formatting, linting, strict type-checking, unit tests, database integration
  tests, production builds, and the desktop Chromium smoke test pass.

---

## Phase 2 — Design the database

**Status:** Complete

Create a clean schema based on the new product rather than reproducing the
legacy `ey_travel` table.

### Initial model

- Better Auth user, account, session, and verification tables
- `cities`
  - Name
  - Region or state
  - Country
  - Slug
- `categories`
  - Name
  - Slug
  - Description
  - Display order
  - Rating capabilities
- `places`
  - Name and slug
  - City and category relationships
  - Address and contact information
  - Related typed links
  - Short summary, public description, and optional type/cuisine label
  - Optional approved public attribution
  - Draft or published state
  - Submitter, moderation state, and publication metadata
  - Created and updated timestamps
- `media`
  - Place relationship
  - Storage key
  - MIME type and dimensions
  - Caption and alternative text
  - Display order
  - Created timestamp
- `visits`
  - User and place relationships
  - Visit date
  - Required private overall rating
  - Optional category-enabled private rating dimensions
  - Optional notes private to the owning user
  - Created and updated timestamps
- `reviews`
  - User and place relationships
  - Public review text
  - Overall and category-enabled rating dimensions
  - Moderation state
  - Created and updated timestamps
  - Unique user/place pair
  - Place-level rating summaries are derived from eligible public reviews rather
    than maintained as mutable counters on `places`
- `place_change_proposals`
  - Published place, proposing user, and proposed values
  - Pending, approved, rejected, or withdrawn state
  - Submitter notes and admin decision reason
  - Submission and decision timestamps
- Submission provenance remains private to submitters and admins; approved public
  attribution is stored separately on the canonical place.

### Work

- Confirm field names, types, nullability, and limits.
- Add foreign keys and explicit delete behavior.
- Add unique constraints for slugs and natural keys where appropriate.
- Add database and application constraints for category-enabled rating
  dimensions.
- Enforce one review per user/place and integer rating values from 1–5.
- Add ownership, publication, moderation, and privacy indexes required by user
  submissions, visits, and reviews.
- Add indexes required for browsing, filtering, and search.
- Create initial category seed data.
- Create test factories and representative fixtures.
- Document schema decisions and expected query patterns.

### Completion gate

Versioned migrations can create an empty database from scratch, and automated
database tests prove the intended relationships and constraints.

### Implementation notes

- The normalized schema and privacy/delete boundaries are documented in
  [`docs/architecture/database-schema.md`](architecture/database-schema.md).
- Better Auth core and admin-plugin fields, account-setup tokens, audit events,
  taxonomy, places, private provenance, links, media, proposals, reviews, visits,
  and normalized rating dimensions are represented in Drizzle.
- PostgreSQL enforces rating ranges, one review per user/place, publishable place
  requirements, coordinate pairing, URL schemes, setup-token cardinality, and
  category-enabled optional rating dimensions.
- Deterministic seeds create Restaurant, Bar, Hotel, Shop, Arts & Culture, and
  Attraction categories plus Food, Atmosphere, and Service capabilities.
- The full migration chain was verified against a new empty PostgreSQL database;
  ten integration tests prove representative relationships, constraints,
  capability checks, aggregates, and deletion behavior.

---

## Phase 3 — Implement authentication and authorization

**Status:** Complete

Integrate Better Auth before implementing authenticated user or administrative
features.

### Authentication work

- Enable email and password authentication.
- Disable public registration and support admin-provisioned accounts.
- Generate revocable, expiring, single-use account-setup links for admins to copy
  and email manually.
- Use PostgreSQL-backed sessions.
- Configure secure cookies, trusted origins, and rate limiting.
- Add a server-side bootstrap command for the first admin.
- Add sign-in and sign-out flows.
- Add a server-side account-recovery command for version one.
- Pin Better Auth to a supported stable release and monitor security updates.

### Authorization work

- Define stored `user` and `admin` roles; treat guests as unauthenticated.
- Implement the permission and ownership rules in
  [`docs/product/access-control.md`](product/access-control.md).
- Define permissions for places, cities, categories, media, visits, reviews,
  users, and settings.
- Centralize authorization in a server-side data-access layer.
- Require authorization inside every protected query and mutation.
- Protect the last active admin from deletion, suspension, or demotion.
- Treat public visitors as unauthenticated rather than assigning a guest role.

### Required tests

- Anonymous users cannot access administrative data or actions.
- Users cannot publish places, manage other accounts, or access administrative
  moderation actions.
- Users cannot read or mutate another user's private visits, drafts, or reviews.
- Admins can perform the explicitly authorized administrative operations.
- Expired and revoked sessions are rejected.
- UI visibility is not the only authorization boundary.

### Completion gate

The initial admin can sign in and reach an empty protected dashboard, an ordinary
user can reach only user-authorized features, and all unauthorized requests fail
on the server.

### Implementation notes

- Better Auth provides invitation-only email/password authentication with
  PostgreSQL-backed sessions; public registration is disabled.
- Server-side bootstrap, user-provisioning, and account-recovery commands support
  the initial administrator and version-one account lifecycle.
- Account setup links use 256-bit random, expiring, revocable, single-use tokens.
  Only SHA-256 token hashes are stored. The token remains in the no-referrer,
  no-index setup URL until transactional consumption, avoiding unreliable
  redirect-cookie handoffs while preventing third-party referrer disclosure.
- Production enables trusted-origin enforcement, secure cookies, and sign-in rate
  limiting. Development leaves the in-memory rate limiter disabled so repeated
  local browser suites do not share a stale attempt bucket.
- Centralized capability and ownership checks distinguish guests, users, and
  admins without allowing the admin role to bypass private-visit ownership.
- Account suspension revokes sessions, and database-backed administrative
  services protect the final active administrator from suspension, demotion, or
  deletion.
- Ten unit tests cover capability and return-path rules. Fifteen database
  integration tests cover signup rejection, account setup, Better Auth sign-in,
  PostgreSQL sessions, suspension, and last-admin protection alongside schema
  constraints. Five desktop Chromium journeys verify guest redirects, user and
  admin boundaries, the protected dashboard, and single-use account setup.

---

## Phase 4 — Build the application shell and navigation

**Status:** Not started

Establish the modern interface shared by subsequent features.

### Public shell

- Adaptive header and primary navigation for supported web viewports
- City and category navigation
- Labelled compact navigation at the minimum supported viewport
- Accessible focus and keyboard behavior
- Loading, empty, error, and not-found states

### Administration shell

- Dashboard navigation
- Adaptive sidebar or labelled compact minimum-width menu
- Current-user menu and sign-out
- Role-aware navigation
- Breadcrumbs and page titles
- Confirmation-dialog and notification patterns

### Design system foundation

- Typography
- Color tokens
- Spacing tokens
- Buttons and links
- Form controls
- Tables and cards
- Dialogs
- Status badges
- Loading, empty, and error states

### Completion gate

All primary version-one routes exist as adaptive, accessible shells for the
supported web viewports, with consistent navigation and visual language.

---

## Phase 5 — Implement the core vertical slice

**Status:** Not started

Build one complete workflow before expanding horizontally.

### First complete workflow

1. An admin signs in and creates the initial city and category.
2. A user signs in and submits a new place for review.
3. The admin reviews and publishes the place.
4. A guest navigates to the public place page.
5. The user records a visit and adds a review.
6. The guest can read the public review but cannot mutate it.
7. The user can update their own visit and review but not another user's records.
8. The admin can edit or unpublish the place and moderate the review.

### Requirements

- Server-side validation with Zod
- Normalized values and deterministic slug generation
- Friendly validation feedback
- Transactional database writes
- Permission checks on every mutation
- Pagination for administrative lists
- Allowlisted sorting
- Draft and published states
- Pending-review and rejected submission states
- Ownership checks for visits, reviews, and submissions
- Confirmation for destructive operations
- Created and updated timestamps

### Completion gate

The application is a usable database-backed place directory with the confirmed
submission, visit, review, and publication workflow but without image support;
Playwright covers the complete workflow.

---

## Phase 6 — Add media handling

**Status:** Not started

Introduce replaceable storage without prematurely operating a distributed
object-storage system.

### Version-one implementation

- Store uploaded media on a mounted persistent filesystem volume.
- Store media metadata in PostgreSQL.
- Validate actual file contents rather than browser-provided MIME types.
- Restrict accepted formats and maximum file size.
- Generate optimized display and thumbnail variants.
- Strip unnecessary metadata.
- Require alternative text or an explicit decorative designation.
- Support image ordering, replacement, and deletion.
- Prevent orphaned files when database operations fail.

### Storage abstraction

```text
put()
getUrl()
delete()
exists()
```

The abstraction must permit later adoption of SeaweedFS or another
S3-compatible service without rewriting the place or media features.

### Completion gate

An authorized user can upload, reorder, replace, and delete images, and public
pages receive responsive optimized images.

---

## Phase 7 — Complete public and administrative UX

**Status:** Not started

### Public experience

- Browse by city and category.
- Search by place name and descriptive fields.
- Filter and sort through URL parameters.
- Provide an adaptive list or card presentation for supported web viewports.
- Provide permanent place-detail URLs.
- Add contact, website, and map links.
- Add the image gallery.
- Add useful empty and no-results states.
- Display public reviews.
- Add page metadata and social-preview metadata.

### Authenticated user experience

- Personal visit capture and visit history
- Create, edit, and delete one's own reviews
- New-place draft and submission workflow
- Submission status and rejection feedback
- Clear separation between private activity and public contributions

### Administration experience

- Searchable and paginated place list
- City and category management
- Place creation and editing
- Draft preview
- Media management
- User and role management restricted to admins
- Place-submission moderation and publication
- Published-place change-proposal review
- Review moderation
- Unsaved-change handling
- Safe destructive-operation flows

### Completion gate

All version-one workflows are complete and usable at the supported minimum,
desktop, and wide-desktop web viewports and under required accessibility zoom.

---

## Phase 8 — Security and quality hardening

**Status:** Not started

Perform a focused release review before deployment.

### Security work

- Verify authorization on every Server Action and Route Handler.
- Add security headers and an appropriate content security policy.
- Confirm HTTPS-only production cookies.
- Test CSRF and origin protections.
- Test login throttling.
- Test malformed, misleading, and oversized uploads.
- Ensure PostgreSQL and media services are not publicly exposed.
- Scan committed files and container images for secrets.
- Pin production dependencies and enable automated security alerts.
- Review logs for accidental personal or credential data.

### Quality work

- Unit-test business rules.
- Integration-test database operations.
- Browser-test critical public and administrative workflows.
- Run automated accessibility checks.
- Test keyboard-only navigation.
- Test supported minimum-width, desktop, and wide-desktop layouts plus browser
  zoom and text enlargement.
- Test production builds and migration execution.
- Test backup restoration.

### Completion gate

The application passes its release checklist with no known high-severity
security, accessibility, or data-integrity issues.

---

## Phase 9 — Deploy to DigitalOcean

**Status:** Not started

Create a production Docker Compose deployment.

### Planned production services

```text
Caddy
Next.js application
PostgreSQL
Persistent media volume
```

### Deployment work

- Use Caddy for HTTPS and reverse proxying.
- Keep PostgreSQL on a private Docker network.
- Mount explicit persistent paths for PostgreSQL and media.
- Store secrets outside container images and the repository.
- Run migrations as a controlled deployment step.
- Add container health checks.
- Configure restart policies and appropriate resource limits.
- Configure structured log retention.
- Maintain staging and production environment configuration.
- Document provisioning, deployment, rollback, and recovery.

### Backup work

- Nightly PostgreSQL logical dump
- Nightly independent media backup
- DigitalOcean Droplet backups
- Optional volume snapshots
- Scheduled restore verification

### Completion gate

A new Droplet can be provisioned from the documentation, and the application
can be restored using only documented backups and separately stored secrets.

---

## Phase 10 — Stabilize before adding features

**Status:** Not started

Operate and validate the basic application before expanding its scope.

### Work

- Monitor errors, performance, disk growth, and failed sign-ins.
- Fix usability issues found through real use.
- Review production database queries and indexes.
- Confirm backups and restoration continue to work.
- Record enhancements in a prioritized backlog.
- Review whether any deferred feature should enter the next release.
- Consider selective legacy entry only after the new model is stable.

### Completion gate

The basic application has operated reliably, operational procedures have been
tested, and the next set of features has been prioritized from actual needs.

---

## Major milestones

1. **Foundation ready:** Phases 0–2 complete.
2. **Secure application shell:** Phases 3–4 complete.
3. **First usable release:** Phase 5 complete.
4. **Feature-complete version one:** Phases 6–7 complete.
5. **Production release:** Phases 8–9 complete.
6. **Stable foundation for expansion:** Phase 10 complete.

## Open decisions

- Final media size and format limits
- Supported browser policy
- Staging environment topology
- Independent backup destination

## Change log

### 2026-11-07

- Completed Phase 3 after verifying ten unit tests, fifteen integration tests,
  and five desktop Chromium journeys. Invitation-only setup, sign-in, session,
  recovery, suspension, role/ownership authorization, and final-active-admin
  safeguards are operational. Advanced the roadmap to Phase 4.
- Started Phase 3 with Better Auth email/password and PostgreSQL session
  configuration, disabled public signup, trusted-origin and rate-limit controls,
  single-use setup/recovery tokens, bootstrap/provision/recovery commands,
  protected account/admin routes, centralized capabilities and ownership checks,
  account-retention services, and final-active-admin safeguards.
- Completed Phase 2 after applying the full migration chain to an empty
  PostgreSQL database without warnings and passing ten database integration
  tests covering relationships, lifecycle constraints, rating capabilities,
  aggregates, setup tokens, and deletion behavior. Advanced the roadmap to
  Phase 3.
- Started Phase 2 with Better Auth-compatible identity tables, normalized
  taxonomy, place/submission/proposal, media, review, visit, rating-capability,
  account-setup-token, and audit schemas; documented identifiers, privacy and
  retention boundaries, delete behavior, seeds, and query/index strategy.
- Completed Phase 1 after verifying the locked Node.js 24 and pnpm 12 toolchain,
  full Docker Compose startup, PostgreSQL 18 migration path, liveness and
  readiness endpoints, formatting, linting, strict type-checking, unit and
  integration tests, Turbopack production build, and desktop Chromium smoke
  test. Advanced the roadmap to Phase 2.
- Started Phase 1 with the Next.js application shell, strict TypeScript and
  tooling configuration, environment validation, structured logging, liveness
  and readiness endpoints, PostgreSQL Compose service, initial Drizzle migration,
  test lanes, CI workflow, and local-development documentation. The phase remains
  in progress pending lockfile generation and executable verification under the
  pinned Node.js 24 environment.
- Confirmed **TravelTrove** with the restrained text wordmark as the version-one
  application identity.
- Marked Phase 0 complete and advanced the roadmap to Phase 1, ready to start.
- Reconciled `docs/design/DESIGN.md`: the approved machine-readable semantic
  palette is canonical and the narrative now uses the same values.
- Completed the final Phase 0 route, responsive, privacy, state, and design-token
  consistency pass and isolated application identity as the final decision.
- Added `docs/design/phase-0-consistency-review.md` with canonical-token contrast
  checks, route/shell and privacy invariants, scope exclusions, and the Phase 1
  implementation handoff.
- Approved the Admin Places & Moderation completion boards at the minimum 1024
  and desktop 1440 targets.
- Generated and visually QA-reviewed the Admin Places & Moderation completion
  boards at minimum 1024 and desktop 1440 widths.
- Confirmed in the completion boards that the admin list's **My visits** value is
  the signed-in administrator's private count, public ratings derive only from
  visible reviews, duplicate warnings remain advisory, and canonical place forms
  contain no review or visit ratings.
- Approved the Personal Management & Lifecycle pattern boards at the minimum
  1024 and desktop 1440 targets.
- Generated and visually QA-reviewed the Personal Management & Lifecycle pattern
  boards at minimum 1024 and desktop 1440 widths.
- Replaced the initial wide personal-management drafts after QA removed
  unrequested notification/bookmark affordances; the final canonical board has
  no saved, wishlist, or notification feature.
- Approved the Public Taxonomy & Account pattern boards at the minimum 1024 and
  desktop 1440 targets, closing the four missing route surfaces identified by
  the coverage audit.

### 2026-11-06

- Completed the Phase 0 route and state coverage audit and added
  `docs/design/route-coverage-audit.md` with route-by-route evidence, remaining
  gaps, priorities, and the visual completion gate.
- Generated and visually QA-reviewed the Public Taxonomy & Account pattern board
  at minimum 1024 and desktop 1440 widths, covering city browse, category browse,
  profile editing, password change, and owner-only session management.
- Regenerated both Public Taxonomy & Account boards after HTML QA so every
  password input is empty and placeholder-only; the earlier boards with sample
  masked values are superseded.
- Approved the administrative management-action and system-state boards at the
  minimum 1024 and desktop 1440 targets.
- Approved the shared administrative management-list pattern for cities,
  categories, reviews, users, and audit at the minimum 1024 and desktop 1440
  targets.
- Approved the Admin overview and stale change-proposal comparison screens at
  the minimum 1024 and desktop 1440 targets.
- Generated and visually QA-reviewed the shared 1440 administrative
  management-list pattern for cities, categories, reviews, users, and audit.
- Generated and visually QA-reviewed the minimum-width companion for the shared
  administrative management-list pattern, using labelled compact rows without
  horizontal page scrolling.
- Regenerated the canonical 1440 management-list board to correct the Audit actor
  filter label; the earlier draft is superseded.
- Generated and visually QA-reviewed administrative management-action and
  system-state boards at minimum 1024 and desktop 1440 widths.
- Captured taxonomy editing, review hide/restore/remove actions, invitation-only
  user provisioning, one-time setup-link display, account lifecycle safeguards,
  redacted audit detail, and reusable loading/empty/error/validation/session
  states without exposing live secrets or another user's private activity.
- Recorded approval of the public-review, private-visit, suggest-edit, and
  owner-facing proposed-edit detail screens at the minimum 1024 and desktop 1440
  targets.
- Generated and visually QA-reviewed the Admin overview dashboard at minimum
  1024 and desktop 1440 widths.
- Generated and visually QA-reviewed the stale change-proposal comparison at
  minimum 1024 and desktop 1440 widths, including field-paired reflow, private
  provenance, separately governed public attribution, a required decision reason,
  and blocked approval until the canonical comparison is refreshed.
- Regenerated the four admin screens after QA to remove invented footers, fixed
  years, workspace and implementation identifiers, and omitted navigation.
- Recorded the canonical Stitch screen IDs in `docs/design/README.md`; the four
  new admin screens are pending visual approval.

### 2026-11-05

- Generated and QA-reviewed closed Place Detail frames at 1024/1440, guest and
  admin Home headers, and a consolidated public system-state board.
- Corrected the generated system-state board from WCAG 2.1 AA to the project target
  of WCAG 2.2 AA.
- Approved the revised Stitch Home/Explore and Place Detail frames at the 1024
  minimum and 1440 desktop targets.
- Generated and visually inspected revised Stitch Home/Explore and Place Detail
  frames at the 1024 minimum and 1440 desktop targets.
- Refined the Place Detail frames after QA to remove saved/notification features
  and false “Verified Visit” relationships, and to use whole-star private visit
  snapshots while retaining decimal public aggregates.
- Verified the final generated HTML contains none of Wishlist, Manage Places,
  Verified Visit, map-toggle, or notification copy.
- Approved the Stitch **Home / Explore** visual direction with confirmed
  revisions. Wishlist and browse-map features are deferred; outbound map links
  remain in version one.
- Confirmed private per-visit rating snapshots: each visit has an overall 1–5
  rating and may include category-enabled dimensions for personal trend analysis;
  these values never enter public review aggregates.
- Limited the version-one web product to large tablets and computers with a
  minimum 1024 CSS-pixel viewport at default zoom. Phone-specific web design is
  deferred to a separately designed mobile app, while browser-zoom accessibility
  reflow remains required.
- Audited the Stitch **Home / Explore** screenshot and generated interactions
  against the confirmed version-one contracts.
- Added `docs/design/public-ui-audit.md`, recommending the visual direction while
  requiring role-aware navigation, removal of Wishlist and map browsing, strict
  separation of private visit trends from public review aggregates, private-data
  corrections, real place URLs, supported-viewport variants, and accessibility
  remediation.
- Added `docs/design/wireframe-brief.md`, expanding the original five-screen list
  into reusable public, personal, contribution, moderation, and administration
  templates with minimum-width, desktop, and wide-desktop requirements.
- Finalized `docs/product/routes.md`: approved stable ID/slug place URLs, city and
  category landing pages, URL-addressable overlay workflows, `/my/*` and
  `/admin/*` groupings, and a read-only version-one audit page.
- Added `docs/product/routes.md` with proposed public, account, personal, admin,
  system, and error routes plus access boundaries and URL-state rules.
- Finalized the version-one access-control contract: approved 72-hour single-use
  setup links, audited withdrawals, suspension/deletion retention behavior, and
  promotion of activated users as the only UI path to additional admins.
- Documented completion rules for 72-hour account-setup links, withdrawal of
  pending work, suspension/deletion retention, and promotion of activated users
  to admin.
- Finalized `docs/product/place-model.md`: adopted cities, one primary category,
  separate summary/description fields, optional type/cuisine label, optional
  private visit notes, and optional publication images.
- Confirmed that complete recommendation provenance remains private to the
  submitter and admins, while a separately reviewed attribution may be public.
- Replaced the preliminary `locations` terminology with `cities` throughout the
  version-one plan.
- Added `docs/product/place-model.md` with the proposed canonical place fields,
  public/private data boundaries, links, provenance, lifecycle, validation,
  search behavior, and remaining product decisions.
- Confirmed whole-number 1–5 overall stars, required on every review; review text
  remains optional.
- Confirmed one editable review per user/place and optional category-enabled
  ratings for version one.
- Confirmed that hidden reviews are excluded from public review lists and every
  rating aggregate.
- Confirmed that admins manually email application-generated single-use account
  setup links, avoiding an integrated invitation email provider in version one.
- Added `docs/product/reviews-visits-ratings.md` as the product contract for
  review, rating, aggregation, and visit behavior.
- Confirmed invitation-only, admin-provisioned accounts for version one.
- Confirmed that reviews appear immediately, subject to reactive admin moderation,
  and public star ratings aggregate only visible reviews.
- Confirmed that visit histories and counts are private to their owning user;
  admins can see only their own visit activity.
- Added a version-one change-proposal workflow for user suggestions to published
  places, requiring admin approval before public content changes.
- Replaced the proposed `owner`/`editor` roles with stored `user`/`admin` roles;
  guests remain unauthenticated.
- Added user place submissions, visit logging, public reviews, account management,
  and admin publication/moderation to version-one scope.
- Added `docs/product/access-control.md` with the initial permission matrix,
  ownership rules, moderation boundaries, and remaining decisions.
- Adopted capability-based category ratings rather than category-name checks.
- Clarified that visit counts in the approved admin UI are an intentional
  finished-product design element. Visit capture is now in version-one scope;
  aggregate count visibility remains to be decided.

### 2026-11-04

- Completed the Phase 0 item 1 audit of the approved administration design.
- Added `docs/design/admin-ui-spec.md` with screen requirements, component
  inventory, responsive proposals, accessibility requirements, implementation
  implications, acceptance criteria, and unresolved decisions.
- Recorded the design-token palette discrepancy that must be resolved before
  Phase 1 styling begins.
- Recorded **TravelTrove Web UI** as the Phase 0 source of truth for the admin
  panel design.
- Recorded the **Admin / Manage Places** desktop screen as the approved admin
  reference.
- Added the design-reference register at `docs/design/README.md`.
- Kept the project's **Home / Explore** screen unapproved for public UI use
  pending an explicit decision.

### 2026-11-03

- Created the living implementation plan.
- Recorded the clean-sheet scope and exclusion of bulk legacy migration.
- Recorded the TypeScript, Next.js, PostgreSQL, Drizzle, and Better Auth stack.
- Recorded the initial `owner` and `editor` role model.
- Recorded filesystem-first media storage and DigitalOcean deployment targets.
- Marked Phase 0 as in progress and Phases 1–10 as not started.
