# Version-One Route and State Coverage Audit

> **Status:** Complete and approved  
> **Last reviewed:** 2026-11-07  
> **Phase:** Phase 0 — Define version one

This audit compares the confirmed route contract in
[`../product/routes.md`](../product/routes.md) with the approved Stitch screens,
reference boards, and reusable templates recorded in this directory. Its purpose
is to identify where a genuinely new design is required and where an approved
pattern needs only a documented route-specific variant.

## Executive summary

The visual architecture is substantially defined. Public discovery, place
detail, authentication and setup, personal overview and contribution tasks,
submission authoring, the admin dashboard, change-proposal review, and the shared
administrative list/action/state systems all have approved 1024/1440 coverage.

At the time of the audit, four user-facing route surfaces lacked an approved
visual template:

- Public city browse
- Public category browse
- Account profile
- Account security and own-session management

Their 1024/1440 pattern boards have since been generated, QA-reviewed, and
approved.

The following route-specific variants were identified during the audit and have
since been generated, QA-reviewed, and approved:

- Dedicated personal visit and review management lists
- Personal proposal-list and submission-status variants
- Existing-visit edit/delete behavior on a place
- Admin Places at the minimum 1024 width, including direct create and standalone
  editor behavior
- New-place submission and change-proposal moderation queues
- New-place submission comparison, where the current-public-value side is empty

No normal browser route remains without an approved composition or reusable
pattern. System and integration routes do not require application screens. Their response
contracts, authorization, secrecy, and operational behavior remain implementation
and test concerns.

## Coverage definitions

- **Covered:** An approved screen or reference board directly defines the route.
- **Pattern covered:** An approved reusable screen defines the route structure;
  a route-specific content/state variant must be documented or visually checked.
- **Partial:** A major interaction is approved, but a required responsive frame,
  list, state, or direct-navigation form is still absent.
- **Missing:** No approved visual template currently represents the route.
- **Non-visual:** Protocol or infrastructure route; no normal application UI is
  expected.

## Public routes

| Route                        | Coverage | Approved evidence                                                                       | Remaining work                                                             |
| ---------------------------- | -------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `/`                          | Covered  | Home / Explore at 1024/1440; guest, user, and admin header variants                     | None beyond implementation fidelity                                        |
| `/places`                    | Covered  | Home / Explore browse, filters, result cards, pagination, and public system-state board | Preserve query state in the URL                                            |
| `/places/[placeId]/[slug]`   | Covered  | Place Detail active and closed frames at 1024/1440                                      | Implement guest/authenticated action differences and approved empty states |
| `/cities/[citySlug]`         | Covered  | City landing/browse pattern approved at 1024/1440                                       | None beyond implementation fidelity                                        |
| `/categories/[categorySlug]` | Covered  | Category landing/browse pattern approved at 1024/1440                                   | None beyond implementation fidelity                                        |

City and category pages should reuse the `/places` result/filter system rather
than create a second discovery product. Their new design work is limited to the
landing header, contextual description, canonical filter treatment, and empty or
missing taxonomy states.

## Authentication and account routes

| Route               | Coverage | Approved evidence                                                                    | Remaining work                              |
| ------------------- | -------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| `/sign-in`          | Covered  | Sign-in at 1024/1440 and approved authentication states                              | None beyond implementation fidelity         |
| `/account/setup`    | Covered  | Valid setup at 1024/1440 plus expired, revoked, used, validation, and success states | Preserve token secrecy and safe URL cleanup |
| `/account`          | Covered  | Profile form, validation, success, and unsaved-change behavior approved at 1024/1440 | None beyond implementation fidelity         |
| `/account/security` | Covered  | Password and owner-only session management approved at 1024/1440                     | None beyond implementation fidelity         |

The account-security screen must expose only the signed-in user's sessions. It
must not reuse admin user-management language or suggest that an administrator
can inspect another user's private session details.

## Personal routes

| Route                            | Coverage | Approved evidence                                                                        | Remaining work                                                                                |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/my`                            | Covered  | My Activity dashboard at 1024/1440                                                       | None beyond implementation fidelity                                                           |
| `/my/visits`                     | Covered  | Owner-only history/list variant approved at 1024/1440                                    | None beyond implementation fidelity                                                           |
| `/my/reviews`                    | Covered  | Owner review-list variant with public and hidden moderation states approved at 1024/1440 | None beyond implementation fidelity                                                           |
| `/my/submissions`                | Covered  | My Submissions at 1024/1440                                                              | Add confirmed query/filter states during implementation                                       |
| `/my/submissions/new`            | Covered  | New Place Draft Editor at 1024/1440                                                      | None beyond implementation fidelity                                                           |
| `/my/submissions/[submissionId]` | Covered  | Draft, Pending review, Rejected, Withdrawn, and Published variants approved              | None beyond implementation fidelity                                                           |
| `/my/proposals`                  | Covered  | Proposal-specific list rows and terminal states approved                                 | None beyond implementation fidelity                                                           |
| `/my/proposals/[proposalId]`     | Covered  | Proposed Edit Detail at 1024/1440                                                        | Add rejected/withdrawn terminal-state variants if not covered by the shared submission states |
| `*/review`                       | Covered  | Write a Public Review at 1024/1440                                                       | Implement create/edit as one owned review per place                                           |
| `*/visits`                       | Covered  | Existing-visit history, edit, personal trend, and delete behavior approved at 1024/1440  | None beyond implementation fidelity                                                           |
| `*/suggest-edit`                 | Covered  | Suggest an Edit at 1024/1440                                                             | None beyond implementation fidelity                                                           |

The remaining personal variants must preserve owner-only visit privacy. Admin
status does not change the data source or visibility of these routes.

## Administration routes

| Route                               | Coverage | Approved evidence                                                                      | Remaining work                                                                      |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/admin`                            | Covered  | Admin Overview at 1024/1440                                                            | None beyond implementation fidelity                                                 |
| `/admin/places`                     | Covered  | Minimum-1024 labelled-row reflow approved with explicit owner-only My visits column    | None beyond implementation fidelity                                                 |
| `/admin/places/new`                 | Covered  | Admin-direct-create, publication validation, attribution, and governance form approved | None beyond implementation fidelity                                                 |
| `/admin/places/[placeId]`           | Covered  | Standalone editor and publish/unpublish/archive confirmations approved                 | None beyond implementation fidelity                                                 |
| `/admin/submissions`                | Covered  | New-place moderation queue columns, filters, states, and actions approved              | None beyond implementation fidelity                                                 |
| `/admin/submissions/[submissionId]` | Covered  | New-submission comparison with blank current values and duplicate advisory approved    | None beyond implementation fidelity                                                 |
| `/admin/proposals`                  | Covered  | Change-proposal queue with stale/current/withdrawn indicators approved                 | None beyond implementation fidelity                                                 |
| `/admin/proposals/[proposalId]`     | Covered  | Change Proposal Comparison at 1024/1440, including stale-canonical handling            | None beyond implementation fidelity                                                 |
| `/admin/cities`                     | Covered  | Management list and action/state boards at 1024/1440                                   | None beyond implementation fidelity                                                 |
| `/admin/categories`                 | Covered  | Management list and action/state boards at 1024/1440                                   | Preserve capability and historical-rating rules                                     |
| `/admin/reviews`                    | Covered  | Management list and action/state boards at 1024/1440                                   | Preserve immediate-publication and aggregate-removal rules                          |
| `/admin/users`                      | Covered  | Management list and action/state boards at 1024/1440                                   | Preserve final-admin and recent-auth safeguards                                     |
| `/admin/users/new`                  | Covered  | Provision User and Setup Link Lifecycle specimens                                      | Raw link appears once only in the live transaction and never in logs or screenshots |
| `/admin/users/[userId]`             | Covered  | User Lifecycle Safeguards specimens                                                    | Implement restore and recent-auth confirmation consistently                         |
| `/admin/audit`                      | Covered  | Read-only list, redacted detail, and state patterns at 1024/1440                       | No edit, delete, export, or advanced analytics in version one                       |

The management reference boards are implementation specifications for route
families, not production pages that stack several admin tools together. Each
production route renders only its own list, action, and state configuration.

## System, integration, and boundary routes

| Route or behavior               | Coverage        | Requirement                                                                                        |
| ------------------------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| `/api/auth/[...all]`            | Non-visual      | Better Auth protocol route; no application page                                                    |
| `/api/media/upload`             | Non-visual      | Authorized upload transport with validation and safe error responses                               |
| `/health/live`                  | Non-visual      | Minimal liveness response without dependency details                                               |
| `/health/ready`                 | Non-visual      | Private/minimal readiness response without credentials or topology                                 |
| Public not found                | Pattern covered | Public system-state board and closed place-detail state; confirm shared copy during implementation |
| Unauthenticated protected route | Covered         | Sign-in and expired-session patterns with validated same-origin return path                        |
| Authenticated forbidden route   | Covered         | Administrative system-state board includes forbidden/access-restricted state                       |
| Cross-user private record       | Pattern covered | Render not found without confirming record existence                                               |
| Validation recovery             | Covered         | Public, authentication, and administrative validation states                                       |
| Destructive confirmation        | Covered         | Administrative action board plus owner task patterns                                               |

## Cross-state coverage

| State                     |                   Public |           Authentication |                     Personal/contribution |          Administration |
| ------------------------- | -----------------------: | -----------------------: | ----------------------------------------: | ----------------------: |
| Loading                   |                 Approved |          Pattern covered |                           Pattern covered |                Approved |
| Empty                     |                 Approved | Not generally applicable |                                  Approved |                Approved |
| No results                |                 Approved | Not generally applicable |                           Pattern covered |                Approved |
| Recoverable error         |                 Approved |                 Approved |                           Pattern covered |                Approved |
| Inline validation         |                 Approved |                 Approved |                       Approved task forms |                Approved |
| Success feedback          |                 Approved |                 Approved |                       Approved task forms |                Approved |
| Pending/disabled mutation |          Pattern covered |                 Approved |                           Pattern covered |                Approved |
| Expired session           |                 Approved |                 Approved |                           Pattern covered |                Approved |
| Forbidden                 |          Pattern covered |           Not applicable | Not-found boundary for cross-owner access |                Approved |
| Destructive confirmation  | Not generally applicable | Not generally applicable |                                  Approved |                Approved |
| Unsaved changes           |          Pattern covered |          Pattern covered |                                  Approved | Approved/reference note |

## Remaining visual-design packages

Complete these in order, reusing approved shells and controls:

1. **Public taxonomy and account package — approved**
   - City landing/browse at 1024/1440
   - Category landing/browse at 1024/1440
   - Account profile at 1024/1440
   - Account security and own-session management at 1024/1440
2. **Personal management variants — approved**
   - My Visits and My Reviews lists
   - Existing-place visit history/edit/delete
   - Submission/proposal list and terminal-state variants
3. **Admin places and moderation completion — approved**
   - Admin Places minimum-width list and standalone editor
   - Admin direct-create/publication states
   - Submission and proposal queues
   - New-place submission comparison
4. **Final consistency pass — complete**
   - The `DESIGN.md` palette is reconciled; machine-readable semantic tokens are
     canonical and the narrative uses the same values.
   - **TravelTrove** with the restrained text wordmark is the confirmed
     version-one identity.
   - Approved screens have been checked against navigation, privacy, WCAG 2.2 AA
     requirements, reduced-motion/focus-return specifications, and the
     1024-pixel support boundary.

## Phase 0 visual completion gate — satisfied

All completion conditions are satisfied:

- The four missing route surfaces have approved 1024/1440 designs.
- Each partial or pattern-covered route above has either an approved visual
  variant or an explicit implementation note showing that no new composition is
  needed.
- Admin Places and moderation have minimum-width and direct-navigation behavior.
- Destructive personal visit actions and account-security actions are visually
  specified.
- The final design-system palette and **TravelTrove** application identity are
  confirmed.
- The design index and implementation plan contain only current canonical Stitch
  IDs, and every listed screen is approved.
