# Database Schema

> **Status:** Phase 2 physical design  
> **Database:** PostgreSQL 18  
> **ORM and migrations:** Drizzle ORM and Drizzle Kit

This document records the version-one relational model, privacy boundaries,
delete behavior, and expected query patterns. The TypeScript declarations in
`src/db/schema` and reviewed SQL in `drizzle` remain executable sources of truth.

## Identifier strategy

- Better Auth owns string identifiers for users, sessions, accounts, and
  verifications.
- Application-domain records use random UUID primary keys.
- The UUID in `places.id` is the stable opaque identifier in public URLs. A place
  slug is descriptive and may change; it is indexed but deliberately not unique.
- Category and city slugs are unique because those routes use the slug as their
  lookup key.

## Authentication and account operations

The `user`, `session`, `account`, and `verification` tables follow Better Auth's
core schema. The admin plugin's `role`, `banned`, `ban_reason`, `ban_expires`, and
`impersonated_by` fields are included. TravelTrove constrains accounts to one of
the confirmed `user` or `admin` roles.

`account_setup_tokens` stores only a token hash. A partial unique index permits
one unconsumed and unrevoked token per user. Expiry remains a runtime check
because PostgreSQL index predicates cannot safely depend on the current time.

`audit_events` stores security-relevant actions with deliberately generic target
identifiers and minimal JSON metadata. User foreign keys become null if the
identity is deleted, allowing a non-identifying operational record to remain.

## Taxonomy and rating capabilities

Cities and categories may be deactivated but are protected from deletion while
places reference them. A category's supported optional ratings are rows in
`category_rating_capabilities`; disabling a row prevents new values without
deleting historical review or visit ratings.

Initial dimensions:

| Dimension  | Restaurant | Bar | Hotel |
| ---------- | :--------: | :-: | :---: |
| Food       |    Yes     | No  |  No   |
| Atmosphere |    Yes     | Yes |  No   |
| Service    |    Yes     | Yes |  Yes  |

Initial categories are Restaurant, Bar, Hotel, Shop, Arts & Culture, and
Attraction. They are ordinary admin-managed rows with deterministic seed IDs,
not hard-coded application enums. Event is not initially seeded because
version-one scheduling behavior is undefined.

## Places, submissions, and proposals

`places` represents both incomplete new-place drafts and the canonical record
after publication. Drafts may omit name, city, and category. Every non-draft row
must contain those fields, and published/unpublished/archived rows must also have
a slug.

Private discovery details are isolated in `place_submission_provenance`. Public
queries must never join that table. An approved public attribution is copied to
the separate label and URL fields on `places`.

Published-place edits use `place_change_proposals`. `proposed_values` is a
validated snapshot of allowlisted public fields; it must never contain audit,
moderation, provenance, visit, review, or aggregate fields. Approval applies the
snapshot transactionally and records a separate audit event.

Links and media are ordered child rows. HTTPS is enforced in the database for
public/source URLs, while full URL safety checks—including embedded credentials
and public-host rules—remain application validation.

## Reviews, visits, and aggregates

Reviews and visits have independent required 1–5 overall ratings. Optional
dimension values use `review_ratings` and `visit_ratings`. PostgreSQL triggers
reject a dimension unless it is active and enabled for the place's current
category; application validation must perform the same check before writing.

The `(user_id, place_id)` review uniqueness constraint enforces one review per
user and place. Public aggregate queries include only reviews where:

```sql
moderation_status = 'visible' AND author_deleted_at IS NULL
```

No aggregate or personal visit count is stored on `places`. Overall and
dimension averages always return their contributing counts. Visits cascade when
their owning user is deleted and are indexed first by `user_id` so ownership is
part of every private query.

## Delete and retention behavior

| Relationship                                   | Database behavior | Application responsibility                                  |
| ---------------------------------------------- | ----------------- | ----------------------------------------------------------- |
| User → sessions/accounts/visits/reviews/tokens | Cascade           | Revoke and audit before account deletion                    |
| User → published places/proposals/provenance   | Set null          | Delete drafts; withdraw pending work; strip private details |
| City/category → place                          | Restrict          | Deactivate taxonomy rather than deleting history            |
| Place → links/media/provenance                 | Cascade           | Places are normally archived, not hard-deleted              |
| Place → reviews/visits/proposals               | Restrict          | Preserve activity and history                               |
| Rating dimension → historical values           | Restrict          | Disable capabilities rather than delete dimensions          |

Conditional retention rules—such as deleting only unpublished drafts—must run in
one application transaction and cannot be represented safely by a simple foreign
key action.

## Expected query patterns and indexes

- Public browse begins with `places.status = 'published'`, then filters by city
  and category.
- Public text search uses trigram indexes over place name, summary, description,
  and type label, plus city/category name indexes.
- Personal visits begin with authenticated `user_id` and optionally `place_id`,
  ordered by visit date.
- Personal reviews begin with authenticated `user_id`; public review lists begin
  with `place_id` and visible moderation state.
- Submission and proposal queues begin with lifecycle state and submission time.
- Setup-token lookup uses the unique token hash; the raw token is never stored.

Authorization and privacy remain server responsibilities. An index that makes an
unsafe query fast does not make that query permissible.
