# Version-One Place Contract

> **Status:** Version-one product contract confirmed  
> **Last reviewed:** 2026-11-05  
> **Phase:** Phase 0 — Define version one

This document defines what a place is in version one, which information is
public, which information is private, and how user submissions become published
content. It is a product-level contract; exact PostgreSQL types and indexes will
be finalized in Phase 2.

The legacy form is a field inventory only. It does not determine the new schema
or UI.

## Modeling principles

- Keep the canonical place separate from user reviews, personal visits,
  submission notes, and private administration notes.
- Store cities, categories, links, media, reviews, and visits relationally rather
  than repeating text in one large place record.
- Require only information needed to identify and classify a place. Allow useful
  contact and descriptive fields to be added incrementally.
- Preserve who submitted, approved, and changed public information.
- Never store derived review averages or personal visit counts as manually
  maintained place fields.
- Validate the same contract on the server regardless of which interface submits
  it.

## Product terminology

### City

Version one uses **city** in the product and schema because browsing is explicitly
organized by city. A city may also store a region/state and country so display
names such as “London, UK” and “Portland, Oregon, USA” are unambiguous.

Use `cities`, not the more abstract `locations`, unless the version-one product is
expanded to include non-city destinations. A place belongs to exactly one city.

### Category

A place belongs to one primary category in version one. Categories are managed by
admins and define which optional rating dimensions apply. Category names are
presentation data; business rules use category capabilities, not string
comparisons.

### Place

A place is the canonical, publishable destination or recommendation. Restaurants,
bars, hotels, shops, cultural attractions, and similar destinations share this
model. Time-bounded event scheduling is not defined by this contract and should
not be inferred merely because “Event” is a possible category label.

## Canonical place fields

### Identity and classification

| Field | Required to submit | Required to publish | Visibility | Rule |
|---|:---:|:---:|---|---|
| Name | Yes | Yes | Public | Trimmed, 1–160 characters |
| City | Yes | Yes | Public | Valid city reference |
| Primary category | Yes | Yes | Public | Valid active category reference |
| Slug | Generated | Yes | Public | Stable URL value; not entered by users |
| Short summary | No | No | Public | Plain text, up to 500 characters |
| Description | No | No | Public | Plain text, up to 5,000 characters |
| Type/cuisine label | No | No | Public | Free-form descriptor, up to 120 characters |

The slug should not be the sole permanent identifier. Public URLs should remain
resolvable if a name or slug changes. Phase 1 should choose an opaque ID/slug URL
strategy before routes are finalized.

The optional type/cuisine label supports concise descriptors such as “Italian,”
“Cocktail bar,” or “Independent bookstore.” It is searchable but is not a formal
taxonomy or filter in version one. A later tags/subcategories feature may replace
or supplement it without changing the primary category.

### Address and coordinates

| Field | Required | Visibility | Rule |
|---|:---:|---|---|
| Street address | No | Public | Up to 200 characters |
| Address line 2 | No | Public | Suite, floor, unit, or neighborhood; up to 120 characters |
| Postal code | No | Public | Text, not numeric; up to 32 characters |
| Latitude | No | Public through maps | Valid decimal latitude when supplied |
| Longitude | No | Public through maps | Valid decimal longitude when supplied |

City, region/state, and country come from the city record and are not duplicated
on the place. Coordinates must be supplied as a valid pair. A “show map” Boolean
from the legacy application is unnecessary: the interface can show a map link
when coordinates or a suitable map URL exist.

### Contact

| Field | Required | Visibility | Rule |
|---|:---:|---|---|
| Phone number | No | Public | Preserve international display form; up to 50 characters |

Email is not included initially because neither the approved screen nor legacy
field inventory establishes it as a place requirement. It can be added later
without changing the surrounding model.

### Links

Links are separate ordered records rather than fixed nullable columns on
`places`.

Initial link types are:

- Official website
- Google Maps or equivalent map listing
- Instagram
- Reservation
- Directory/review listing
- Other

Each link contains a type, HTTPS URL, optional short label, and display order.
Multiple links of the same type are allowed only when a clear label distinguishes
them. URLs are limited to 2,048 characters and must use an allowlisted public
scheme; `javascript:`, local-file, and embedded credential URLs are invalid.

This structure supports the approved form while avoiding a schema migration for
every future link service.

## Information that is not a canonical place field

The following data belongs to a related entity:

| Information | Owner entity | Visibility |
|---|---|---|
| User's overall and category ratings | Review | Public when review is visible |
| User's review text | Review | Public when review is visible |
| User's visit dates, rating snapshots, and notes | Visit | Owning user only |
| “My visits” count | Derived from visits | Owning user only |
| Public star averages | Derived from visible reviews | Public |
| Submission explanation | Place submission/change proposal | Submitter and admins |
| Admin rejection/approval notes | Moderation decision | Submitter and admins |
| Internal operational notes | Admin metadata | Admin only |
| Images and captions | Media | Public when attached to a published place |

This separation prevents a user's private activity or personal review from being
mistaken for objective place information.

## Recommendation provenance

The approved editor includes recommended-by, recommendation date, source type,
source URL, and recommendation notes. These describe how a submission was
discovered, not the place itself.

Version one attaches complete provenance to the original place submission:

- Source type: friend, Instagram, travel publication/blog, website, guidebook,
  other
- Source name or “recommended by”
- Source URL
- Date recommended
- Optional submission notes

Full provenance is visible only to the submitter and admins. This avoids
accidentally publishing a private person's name, private link, conversation, or
the submitter's internal context.

The submitter may separately propose a public attribution containing a display
label and public URL. An admin explicitly approves, edits, or omits that
attribution during publication. Examples include “Recommended by a friend,”
“Discovered via @example,” or “Source: Monocle Travel Guide.” The approved public
attribution belongs to the canonical place; the complete provenance remains on
the submission.

## Media

- A place may have zero or more ordered images.
- Images are optional for submission and publication in version one.
- Each image has an owning place, storage key, MIME type, dimensions, display
  order, optional caption, and alternative-text/decorative decision.
- The first image by display order is the default cover image.
- A user may attach images to their own draft or change proposal; they do not
  become public until the place or proposal is approved.
- Media limits and accepted formats are finalized in Phase 6, not inferred from
  the generated UI's example text.

## Lifecycle and audit fields

A canonical place records:

- current publication state;
- original submitting user when applicable;
- creating and last-updating actor;
- approving/publishing admin;
- created, updated, published, and optionally archived timestamps.

Users work through drafts, submissions, and change proposals. They never directly
set canonical publication or moderation fields.

### New place

```text
user draft → pending review → admin approval → canonical published place
                            ↘ rejection
```

### Published-place change

```text
published place + user proposal → pending review → apply approved changes
                                               ↘ reject; place remains unchanged
```

Change proposals should capture a validated proposed snapshot plus a field-level
comparison for reviewers. They must not allow a user to propose changes to audit,
moderation, aggregate-rating, or another user's private fields.

## Draft, submission, and publication validation

- A draft may be saved before required fields are complete.
- Submission requires name, city, and category.
- Publication requires the same three fields and successful server validation.
- Contact information, address, links, summary, description, and images remain
  optional.
- An admin may reject sparse or unverifiable content as an editorial decision
  even when it passes structural validation.
- A duplicate warning should compare normalized name and city, but admins retain
  authority to publish legitimate similarly named places.
- Inactive cities or categories cannot be selected for a new submission.
- Existing published places retain their historical city/category reference if a
  taxonomy item becomes inactive.

## Suggested logical relationships

```text
city ──< place >── category ──< category_rating_capability
          │
          ├──< place_link
          ├──< media
          ├──< review >── user
          ├──< visit >── user
          └──< place_change_proposal >── user

place_submission >── user
```

The Phase 2 schema may unify new-place submissions and change proposals if it can
retain clear state transitions, ownership, validation, diffs, and audit history.

## Search and display contract

Version-one public search includes:

- place name;
- public summary and description;
- city, region/state, and country;
- category name.

Private provenance, admin notes, visit notes, unpublished proposals, and hidden
reviews must never enter the public search index or result snippets.

Public place cards should be able to display name, city, category, cover image,
short summary, overall star average, and contributing review count. Absence of an
image or rating requires a deliberate empty presentation, not a fake placeholder
value.

## Required tests

- Submission and publication enforce name, city, and category.
- Drafts can be incomplete without becoming publicly readable.
- Guests can read only published canonical places.
- A user cannot publish or change canonical place data directly.
- A user can read and edit only their own drafts and proposals.
- Approval applies only validated proposed fields and records the admin actor.
- Rejection leaves a published place unchanged.
- Private provenance and operational notes never appear in public responses or
  search.
- Invalid coordinate pairs and unsafe URLs are rejected.
- Duplicate warnings do not become an unintended uniqueness constraint.

## Confirmed version-one decisions

- Use **city**/`cities`, not the broader location terminology.
- A place has one primary category.
- Short summary and description are separate optional public fields.
- Complete recommendation provenance is private to the submitter and admins;
  separately approved attribution may be public.
- A searchable, free-form type/cuisine label is optional.
- Each visit may include optional notes private to its owner.
- Images are optional for submission and publication.

