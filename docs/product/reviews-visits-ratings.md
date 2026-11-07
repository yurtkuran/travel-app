# Reviews, Visits, and Ratings Contract

> **Status:** Version-one behavior confirmed  
> **Last reviewed:** 2026-11-05  
> **Phase:** Phase 0 — Define version one

This document defines the version-one product rules for reviews, public star
aggregates, category-specific rating capabilities, and private visit-rating
history. It describes behavior and validation; the physical PostgreSQL schema
will be finalized in Phase 2.

## Review ownership and cardinality

- A review belongs to one authenticated user and one published place.
- A user may have at most one review per place.
- The user may edit or delete that review.
- Recording multiple visits does not create multiple reviews. Visits are separate
  private records.
- A new review appears publicly immediately and remains subject to reactive admin
  moderation.

The database must enforce the one-review-per-user/place rule with a unique
constraint, not only application validation.

## Overall star rating

- Every review requires an overall star rating.
- The value is a whole integer from 1 through 5 inclusive.
- Zero, fractions, and values outside the range are invalid.
- Review text is optional in version one.
- The UI may encourage useful written context but must not represent it as
  required.

The optional-text decision should remain easy to change through validation and UI
copy without changing review ownership or rating storage.

## Category-specific ratings

Category-specific dimensions are controlled by capabilities assigned to the
place's category, never by comparing category names in application code.

Initial dimensions are:

- **Food** — available for restaurant categories.
- **Atmosphere** — available for restaurant and bar categories.
- **Service** — available for restaurant, bar, and hotel categories.

Version-one rules:

- Enabled category-specific ratings are optional within a review.
- When supplied, each value is a whole integer from 1 through 5 inclusive.
- A client must not display unsupported dimensions.
- The server must reject unsupported dimensions even if a client submits them
  manually.
- Changing a category's capabilities must not silently delete historical rating
  data. The Phase 2 schema must define how historical values remain auditable
  while no longer accepting new values for a disabled capability.

The initial schema should support adding a rating dimension or assigning an
existing dimension to another category without changing place or review code.

## Public rating aggregates

- Place-level star summaries are calculated from eligible reviews.
- Only public, non-hidden reviews participate in any aggregate.
- Deleted or admin-hidden reviews are excluded.
- The overall summary includes only the required overall rating.
- A category-dimension summary includes only eligible reviews that supplied that
  optional dimension.
- The response must include both average and contributing review count so the UI
  never presents a low-sample average without context.
- With no eligible ratings, the UI displays an unrated state rather than `0`.

The database remains the source of truth. Aggregates may be cached later for
performance, but cached values must be reproducible from eligible reviews.

The display precision for averages is still a UI decision. Storage and
calculation must retain sufficient precision and must not round individual
ratings before aggregation.

## Review moderation

- A review becomes public immediately after a successful save.
- Admins may hide, restore, or remove a review.
- Hiding takes effect in public review lists and rating aggregates together.
- Moderation records who acted, when, and an optional reason.
- Admins cannot edit a user's review text or rating as though they were the
  author.
- A user may edit their own visible review; the revised review remains public
  immediately unless it is currently hidden.
- The UI must clearly distinguish author deletion from admin moderation.

## Visit records and counts

- A visit belongs to one authenticated user and one place.
- A user may record multiple visits to the same place.
- Each visit requires a visit date and may include optional notes private to its
  owner.
- Each visit records a required whole-number overall rating from 1 through 5.
- A visit may also record optional whole-number 1–5 ratings for dimensions enabled
  by the place's category, such as Food, Service, or Atmosphere.
- Visit ratings are immutable historical snapshots in meaning. Editing a visit
  corrects that visit; it does not update another visit or the user's public
  review.
- Users may read, create, edit, and delete only their own visits.
- Admins have exactly the same ownership boundary and cannot access another
  user's visit records.
- A displayed visit count is the signed-in user's count for that place.
- Guests do not see visit history or counts.
- Visit ratings and private notes never participate in public star aggregates.
- Personal trend views derive from the signed-in user's own visit snapshots and
  may show overall and supported dimension changes over time.

Visit counts are derived from visit records. They are not manually maintained on
the place record.

## Relationship between reviews and visits

Reviews and visits deliberately answer different questions:

- A **review** is the user's single current public assessment of a place. Its
  required overall rating contributes to the public aggregate.
- A **visit rating** is a private assessment at a particular date. A user may have
  many, allowing personal trends to show improvement or decline over time.

Saving or editing a visit must not silently create or change the public review.
The interface may offer a separate **Update your review** action after a visit is
saved.

## Logical data relationships

The Phase 2 schema should represent these logical constraints:

```text
category ──< category_rating_capability >── rating_dimension
   │
   └──< place ──< review >── user
                   │
                   └──< review_rating >── rating_dimension

place ──< visit >── user
            │
            └──< visit_rating >── rating_dimension
```

An equivalent schema is acceptable if it preserves capability-based validation,
one review per user/place, optional dimension ratings, privacy, and auditable
moderation.

## Required tests

- Overall stars accept only integers 1–5 and are required.
- Review text may be empty.
- A second review by the same user for the same place is rejected or becomes an
  explicit update, never a duplicate.
- Enabled optional dimensions accept only integers 1–5.
- Unsupported dimensions are rejected on the server.
- Hidden reviews disappear from public lists and all aggregates atomically.
- Restoring a review returns it to both the list and aggregates.
- A user cannot read or mutate another user's visits.
- An admin cannot read or mutate another user's visits merely because of role.
- “My visits” counts only the authenticated user's records.
- Visit overall ratings accept only integers 1–5 and are required.
- Visit dimension ratings accept only integers 1–5 and only for enabled category
  capabilities.
- Visit trends use only the authenticated user's records and never alter public
  review aggregates.
- Unauthenticated requests cannot create reviews, ratings, or visits.

## Deliberately revisitable decisions

- Review text is optional; the product may require it in a later version.
- Enabled category-specific ratings are optional; the product may require some or
  all enabled dimensions later.
- Average display precision and minimum-count presentation remain UI decisions.
