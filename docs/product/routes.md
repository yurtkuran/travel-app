# Version-One Route Inventory

> **Status:** Version-one route contract confirmed  
> **Last reviewed:** 2026-11-05  
> **Phase:** Phase 0 — Define version one

This document inventories the version-one browser and system routes, their access
boundaries, and their primary responsibilities. It defines product URLs, not the
internal component tree or data-access implementation.

## Route principles

- Public content uses stable, shareable URLs.
- Search, filtering, sorting, and pagination use URL query parameters.
- Personal activity uses `/my/*`; account identity and security use `/account/*`.
- Administrative work uses `/admin/*` and is available only to `admin` accounts.
- Guests are unauthenticated. `user` and `admin` are stored roles.
- An admin may use `/my/*` for their own reviews and visits. Admin status never
  exposes another user's private visits.
- Route layout protection improves navigation but is not authorization. Every
  server read and mutation independently verifies session, role, ownership, and
  record state.
- Unauthorized access to another user's private record returns not found where
  revealing its existence would leak information.
- Mutations are Server Actions or narrowly scoped Route Handlers, not state-changing
  GET requests.

## Public routes

| Route                        | Access   | Purpose                                                |
| ---------------------------- | -------- | ------------------------------------------------------ |
| `/`                          | Everyone | Home, discovery entry point, recent or featured places |
| `/places`                    | Everyone | Searchable, filterable, paginated place browse         |
| `/places/[placeId]/[slug]`   | Everyone | Canonical published place detail                       |
| `/cities/[citySlug]`         | Everyone | City landing page and places in that city              |
| `/categories/[categorySlug]` | Everyone | Category landing page and places in that category      |

Only published canonical places appear on public routes. Reviews hidden by
moderation do not appear on place pages or in rating aggregates.

### Stable place URLs

`placeId` is an opaque public identifier and is the stable lookup key. `slug` is
human-readable and may change when the name changes. A request with the correct ID
and a stale slug redirects to the current canonical URL. Database sequence IDs
should not be exposed as the public identifier.

### Browse query parameters

`/places`, city pages, and category pages support an allowlisted subset of:

| Parameter  | Meaning                                                  |
| ---------- | -------------------------------------------------------- |
| `q`        | Public full-text search term                             |
| `city`     | City slug or stable public identifier                    |
| `category` | Category slug or stable public identifier                |
| `type`     | Optional type/cuisine label search/filter when supported |
| `rating`   | Minimum public overall-star aggregate                    |
| `sort`     | Allowlisted order such as `recent`, `name`, or `rating`  |
| `page`     | Positive page number                                     |

Unknown or invalid values fall back safely or produce a validation response; they
never become raw database column or SQL expressions. Canonical metadata should
avoid indexing a large number of near-duplicate filter URLs.

## Authentication and account routes

| Route               | Access                | Purpose                                                         |
| ------------------- | --------------------- | --------------------------------------------------------------- |
| `/sign-in`          | Guest                 | Sign in to a provisioned account                                |
| `/account/setup`    | Holder of valid token | Consume a single-use setup link and choose the initial password |
| `/account`          | Authenticated         | View and edit one's profile                                     |
| `/account/security` | Authenticated         | Change password and review/revoke own sessions                  |

There is no public registration route in version one. Sign-out is an authenticated
mutation initiated from the account menu, not a GET page.

Setup tokens arrive in the URL fragment, which browsers do not send in HTTP
requests. The setup page reads the token into client memory, removes it from the
visible URL and history, and submits it only in the password form body for
transactional server-side consumption. A restrictive referrer policy and
no-index metadata provide defense in depth. Invalid, used, revoked, and expired
links receive the same non-sensitive failure response.

Account recovery remains admin-assisted in version one. It may reuse a separately
scoped single-use reset token and `/account/setup` experience, but a setup token
must not be valid for any other account or purpose.

## Personal user routes

These routes require authentication. An admin accessing them acts as an ordinary
user and sees only their own records.

| Route                            | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `/my`                            | Personal dashboard summarizing visits, reviews, and submissions |
| `/my/visits`                     | Private visit history                                           |
| `/my/reviews`                    | User's public and moderated reviews                             |
| `/my/submissions`                | Draft, pending, rejected, withdrawn, and published submissions  |
| `/my/submissions/new`            | Create a new-place draft                                        |
| `/my/submissions/[submissionId]` | View/edit an owned draft or inspect its moderation status       |
| `/my/proposals`                  | Change proposals for published places                           |
| `/my/proposals/[proposalId]`     | View an owned proposal and its moderation status                |

Place-specific authenticated actions begin in the place context:

| Route                                   | Purpose                                                  |
| --------------------------------------- | -------------------------------------------------------- |
| `/places/[placeId]/[slug]/review`       | Create or edit the signed-in user's single review        |
| `/places/[placeId]/[slug]/visits`       | View and manage the signed-in user's visits to the place |
| `/places/[placeId]/[slug]/suggest-edit` | Create a change proposal from current public data        |

These may render as dialogs or sheets on wide screens, but each has a real URL so
refresh, back/forward navigation, minimum-width layouts, validation recovery, and
accessibility do not depend on ephemeral client state.

## Administration routes

All routes in this section require an authenticated `admin` role. Admin pages must
not include or query other users' private visit history.

| Route                               | Purpose                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `/admin`                            | Moderation and operational dashboard                   |
| `/admin/places`                     | Search, filter, and manage canonical places            |
| `/admin/places/new`                 | Create a place directly as an admin                    |
| `/admin/places/[placeId]`           | Edit, publish, unpublish, or archive a canonical place |
| `/admin/submissions`                | New-place moderation queue                             |
| `/admin/submissions/[submissionId]` | Compare, approve, or reject a submission               |
| `/admin/proposals`                  | Published-place change-proposal queue                  |
| `/admin/proposals/[proposalId]`     | Review a field-level comparison and decide a proposal  |
| `/admin/cities`                     | Create, edit, activate, and deactivate cities          |
| `/admin/categories`                 | Manage categories and rating capabilities              |
| `/admin/reviews`                    | Find, hide, restore, or remove public reviews          |
| `/admin/users`                      | Search and manage provisioned accounts                 |
| `/admin/users/new`                  | Provision a user and generate the initial setup link   |
| `/admin/users/[userId]`             | Suspend, restore, delete, or promote/demote an account |
| `/admin/audit`                      | Review security-relevant administrative actions        |

The approved **Manage Places** desktop design maps to `/admin/places`; its editor
sheet maps to `/admin/places/[placeId]`. Intercepted/parallel routing may preserve
the sheet interaction during in-app navigation while direct navigation renders a
complete standalone page.

## System and integration routes

These routes are not normal application navigation.

| Route                | Access                 | Purpose                                                           |
| -------------------- | ---------------------- | ----------------------------------------------------------------- |
| `/api/auth/[...all]` | Better Auth protocol   | Authentication/session endpoints                                  |
| `/api/media/upload`  | Authorized user/admin  | Validated media upload transport when a Route Handler is required |
| `/health/live`       | Infrastructure         | Process liveness without dependency details                       |
| `/health/ready`      | Infrastructure/private | Readiness for the app and required services                       |

Do not create a broad CRUD API merely to mirror the database. Server-rendered
reads and Server Actions are preferred for the web application; Route Handlers
are added only when a protocol, upload transport, health check, or external client
requires one.

Readiness responses must not reveal credentials, connection strings, versions,
user data, or detailed infrastructure topology.

## Error and boundary behavior

- Unknown public resources render the shared not-found experience.
- Unauthenticated access to a personal or admin page redirects to `/sign-in` with
  a validated same-origin return path.
- An authenticated non-admin requesting `/admin/*` receives a forbidden response;
  it is not silently redirected to an unrelated page.
- Cross-user private resource requests respond as not found.
- Expired sessions preserve safe form drafts when possible and request sign-in
  without submitting the mutation.
- Validation errors remain on the current canonical route and focus an accessible
  error summary.
- Destructive confirmations use dialogs/forms and POST-like mutations; they never
  encode the destructive action in a crawlable URL.

## Navigation model

### Guest navigation

- Explore
- Cities
- Categories
- Sign in

### Authenticated user navigation

- Guest navigation, except Sign in
- My activity
- Add a place
- Account
- Sign out

### Admin navigation

- Public exploration
- Manage places
- Submissions
- Change proposals
- Cities
- Categories
- Reviews
- Users
- Audit
- My activity
- Account
- Sign out

Navigation visibility follows the current role, but server authorization remains
authoritative.

## Suggested App Router organization

Route groups organize layouts without changing URLs:

```text
src/app/
├── (public)/
│   ├── page.tsx
│   ├── places/
│   ├── cities/
│   └── categories/
├── (auth)/
│   ├── sign-in/
│   └── account/setup/
├── (account)/
│   ├── account/
│   └── my/
├── admin/
├── api/
└── health/
```

Feature modules own domain behavior; route files compose features and should not
contain raw database authorization logic.

## Required route tests

- Guests can read published places but cannot read drafts or pending proposals.
- Guests cannot access `/my/*` or `/admin/*`.
- Users can access only their own private records.
- Users receive a forbidden response for administration routes.
- Admins can access admin routes but cannot access another user's visits.
- Return paths cannot redirect off-site.
- Stale place slugs redirect to the canonical ID/slug URL.
- Invalid filter and sort values cannot alter the query structure.
- Setup links cannot be reused and do not leak through logs or referrers.
- State-changing operations reject GET requests.

## Confirmed route decisions

- Published places use stable `/places/[placeId]/[slug]` URLs.
- City and category landing pages complement `/places` filters.
- Review, visits, and suggest-edit experiences have real URLs even when rendered
  as dialogs or sheets during in-app navigation.
- Personal activity uses `/my/*`; administration uses `/admin/*`.
- Version one includes a simple read-only `/admin/audit` page. Advanced audit
  filtering, analytics, and export may be deferred.
