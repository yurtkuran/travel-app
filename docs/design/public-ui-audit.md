# Public Home and Explore UI Audit

> **Status:** Public visual direction approved; required revisions confirmed  
> **Last reviewed:** 2026-11-05  
> **Phase:** Phase 0 — Define version one

This document evaluates the Stitch **Home / Explore** screen against the confirmed
version-one product, access-control, route, and design contracts.

## Source

- **Stitch project:** **TravelTrove Web UI** (`18045474233674104599`)
- **Screen:** **Home / Explore** (`86db744d54f24ac59607cb67a8e93878`)
- **Device:** Desktop
- **Rendered size:** 1280 × 1990 CSS pixels
- **Artifacts reviewed:** Screenshot and generated HTML/interaction code

The screenshot and generated HTML are design references, not production
implementation. The generated markup does not establish semantic, accessibility,
security, privacy, routing, or state-management decisions.

## Decision

The screen is approved as the **public visual-direction foundation**, subject to
the product and accessibility revisions in this document. The current screen is
not approved unchanged as the version-one functional specification.

The art direction strongly matches “Serene Editorial Travel”: restrained neutral
surfaces, sage accents, generous spacing, strong imagery, clear typographic
hierarchy, and an appealing combination of horizontal discovery cards and larger
editorial place cards. The design feels like a curated personal archive rather
than a generic review directory.

The current screen also mixes public, personal, administrative, and deferred
features. Those concerns must be separated before implementation.

## What should be retained

- Fixed, quiet header with compact pill navigation.
- Large editorial hero image with minimal archival captioning.
- Strong “Discover places worth remembering” introduction.
- Prominent, low-friction search and filter area.
- Horizontal **Recently Added** discovery rail.
- Larger three-column editorial place-card grid on desktop.
- Image-first cards with city, category/type, name, summary, rating, and review
  count.
- Warm neutral canvas, deep-sage interaction color, hairlines, and subtle surface
  changes.
- Spacious footer and overall unhurried composition.

These elements can define the public design direction across Home, Explore, city,
category, and place-detail screens.

## Required product corrections

### 1. Separate role-specific navigation

The artifact shows **Explore**, **Manage Places**, and an account icon together.
This represents an authenticated admin view, not a universal public header.

- Guests see Explore, Cities, Categories, and Sign in.
- Users see public navigation plus My activity, Add a place, Account, and Sign
  out.
- Admins additionally see Manage places or an Admin entry point.
- **Manage Places** must never appear to a guest or ordinary user.
- The account icon needs a visible or programmatic label and a complete keyboard
  menu.

The public screen needs guest, user, and admin header variants.

### 2. Remove Wishlist from version one

Several cards display **Wishlist**. Wishlist is not in the confirmed version-one
scope or data model. Remove the badge rather than creating a hidden requirement.
It may return in a later version through a separate product decision.

### 3. Treat visit badges as private personalization

**Visited** and **Visited (n)** mean the signed-in viewer's own visit history.

- Guests see no visit badge.
- Users and admins see only their own visit state/count.
- Copy should make ownership clear, for example **Visited by you · 2** or **Your
  visits · 2**.
- Visit state must not look like a community-wide popularity metric.

The grid should preserve alignment when personalization badges are absent.

### 4. Keep visit ratings separate from public reviews

The generated **Log Visit** dialog correctly anticipates per-visit ratings, but it
must represent them as private historical snapshots:

- A visit contains a date, required overall 1–5 rating, optional private notes,
  and optional enabled category-dimension ratings.
- Multiple visit ratings allow the user to see Food, Service, Atmosphere, and
  overall trends over time.
- A review remains the user's single current public assessment and is aggregated
  separately.

The visit form should retain Experience Rating and add only the dimensions enabled
for the category. Saving a visit must not silently create or modify the public
review; it may offer a separate **Update your review** action afterward.

### 5. Keep visit history private and visually distinct

The generated place-detail overlay displays **Logged Journal Entries** and full
private visit notes. That content is valid only for the signed-in owner.

- Guests never receive the data in the page payload.
- Signed-in viewers see only their own visits.
- Admins receive no exceptional access to another user's visits.
- The section must be labelled **Your private visits** and include a privacy cue.
- Personal rating trends may appear in this section and use only the viewer's own
  visit snapshots.
- Private visit notes must not appear in public metadata, screenshots, search,
  server-rendered guest markup, or share previews.

### 6. Replace recommendation quote with approved attribution or reviews

The overlay shows a named recommendation and quote as though it were public. Full
recommendation provenance is private to the submitter and admins.

Public place detail may show:

- a separately approved public attribution, such as “Source: Monocle Travel
  Guide”; and
- visible user reviews, including author display conventions and star ratings.

It must not automatically publish the source name, source URL, or private
submission notes. The current quote should become either an approved attribution
or a real public review; those are different entities.

### 7. Make rating breakdowns aggregates

The Food, Service, and Atmosphere breakdown visually fits the product, but values
must be aggregates of eligible visible reviews:

- display an average and contributing count for each dimension;
- omit dimensions unsupported by the category;
- show an unrated state rather than zero;
- exclude hidden and deleted reviews;
- never mix private visit ratings into public review aggregates.

### 8. Correct search scope and language

The placeholder currently says **Search places, cities, categories, notes…**.
“Notes” risks implying that private visit notes, provenance, or admin notes are
searchable.

Use copy such as **Search places, cities, categories, and descriptions…**. Public
search is limited to the confirmed public fields.

Other copy corrections:

- Replace **Showing 6 locations** with **Showing 6 places**.
- Replace **Synced across 14 cities** with a clearer repository count such as
  **Explore 14 cities**, or omit it.
- Consider **View place** instead of **Inspect** for clearer public language.

### 9. Route place details properly

The generated interaction opens place details only as a modal. The confirmed
canonical route is `/places/[placeId]/[slug]`.

- In-app navigation may render a sheet/dialog while updating the URL.
- Direct navigation must render a complete standalone place page.
- Refresh, sharing, back/forward navigation, and direct navigation at every
  supported viewport must work without relying on transient modal state.

### 10. Defer the browse map

The screen contains a Grid/Map switch and a stylized map view. Advanced
interactive maps are deferred and no version-one map behavior is defined.

For the confirmed v1 contract:

- remove the Map toggle from the approved baseline;
- retain outbound **Open in Maps** links on place detail;
- revisit a browse map only after defining provider, privacy, accessibility,
  clustering, coordinate quality, supported web viewports, and the future mobile
  application.

## Screen structure after revision

### Home

- Role-aware header.
- Editorial hero.
- Introduction and repository/city count.
- Search entry point.
- Recently added rail without Wishlist.
- Curated place grid or a focused link into Explore.

### Explore

- Search, city, category, optional type/cuisine, minimum rating, and sort.
- URL-backed filter state.
- Result summary and clear-all filters.
- Editorial card grid with public rating summary.
- Signed-in-only “Your visits” personalization.
- Pagination with query-state preservation.

Home and Explore may share components, but `/` and `/places` should not become one
unbounded page with unclear navigation state.

## Component inventory

| Area | Components |
|---|---|
| Shell | `PublicHeader`, `RoleNavigation`, `AccountMenu`, `PublicFooter` |
| Hero | `EditorialHero`, `ArchiveCaption`, `RepositorySummary` |
| Search | `PlaceSearch`, `ExploreFilters`, `ActiveFilterChips`, `SortMenu` |
| Discovery | `RecentPlacesRail`, `CarouselControls`, `PlaceCard` |
| Results | `PlaceGrid`, `ResultsSummary`, `Pagination`, `NoResultsState` |
| Place detail | `PlaceGallery`, `PlaceIdentity`, `PublicLinks`, `PublicAttribution`, `RatingSummary`, `ReviewList` |
| Personalization | `MyVisitBadge`, `PrivateVisitList`, `PersonalRatingTrend`, `VisitForm`, `ReviewForm` |
| Overlays | `ResponsiveSheet`, `Dialog`, `Toast`, `ConfirmationDialog` |

Public and personalized components may share a card, but private data fetching
must remain explicitly separated from public place queries.

## Supported web viewport

The web application targets large tablets and computers, not phones. Physical
screen size cannot be detected reliably, so the implementation contract uses a
minimum supported viewport of **1024 CSS pixels at default browser zoom**.

- Design and approve 1024-pixel minimum, 1440-pixel desktop, and wide-desktop
  frames.
- At the minimum viewport, navigation may compact, filters may wrap, and place
  cards may use two columns.
- Place detail may use a wide sheet or standalone page.
- A native mobile application is a separate, future design effort.
- The web app must still reflow under browser zoom and text enlargement to meet
  accessibility requirements. This constrained reflow is not a phone product
  layout and does not require mobile-specific navigation or feature design.

## Accessibility corrections

The generated HTML is not an accessible implementation reference. Required
corrections include:

- Add persistent visible labels or accessible names to search and filters.
- Restore strong visible focus; many generated controls remove outlines.
- Use semantic links for navigation and place cards rather than `href="#"` or
  click handlers on generic containers.
- Give icon-only carousel, account, edit, close, share, and navigation controls
  accessible names.
- Increase practical pointer targets from generated 32-pixel controls to at least
  44 × 44 pixels where possible.
- Implement place-detail and visit overlays with correct dialog semantics, focus
  trapping/restoration, Escape behavior, and inert backgrounds.
- Make the horizontal rail operable by touch, pointer, keyboard, and assistive
  technology without hiding content.
- Ensure hero text and badges meet contrast requirements over all image crops.
- Do not rely on sage dots, star icons, or badge color alone to convey state.
- Announce filtered result counts and save results without unexpected focus
  movement.
- Respect reduced motion for rails, sheets, dialogs, and view transitions.

## Required design states

- Guest, user, and admin navigation.
- Loading, empty repository, no results, error, and pagination boundaries.
- No image, no reviews, and unrated place cards.
- Signed-in cards with and without personal visits.
- Place detail with and without approved attribution.
- Place detail with no public reviews and with hidden own review.
- Visit-rating form and public review form as separate tasks.
- Expired session during a private action.
- Minimum-width, browser-zoom, and text-enlargement states.

## Visual completion gate

The visual direction is approved. Revised frames are complete when:

- Wishlist and the map toggle are removed;
- private visit trends and public review aggregates are clearly separated;
- private history/provenance rules are reflected in the layouts;
- guest, user, and admin variants are represented;
- minimum-width and desktop Home/Explore and Place Detail frames are approved;
- required accessibility and system states are covered.

## Revised Stitch frames

The following revised screens were generated from this audit on 2026-11-05:

| Screen | Stitch screen ID | Review status |
|---|---|---|
| Home / Explore — Minimum 1024 | `901de6a2dac54ccb91af0e447620d676` | Approved 2026-11-05 |
| Home / Explore — Desktop 1440 (Refined) | `75609dfb04d44c3fa4fe6ecdbccef114` | Approved 2026-11-05 |
| Place Detail — Minimum 1024 (Refined) | `5709722c08f64fe19b67a269d9d63e87` | Approved 2026-11-05 |
| Place Detail — Desktop 1440 (Refined) | `a591f51a1aae455bb58b855679d24686` | Approved 2026-11-05 |

Generated-content QA confirmed that none of the four final frames contains
Wishlist, Manage Places, Verified Visit, browse-grid/map toggle, or notification
copy. Both Home frames include private **Your visits** labels and Clear filters.
Both Place Detail frames include separate public reviews, **Your private visits**,
and Log a Visit sections.

The Place Detail frames intentionally show the Log a Visit sheet open so the
private whole-star visit-rating model can be reviewed. The main compositions and
the follow-up closed, role-navigation, and system-state frames are approved.

### Follow-up coverage set

| Screen | Stitch screen ID | Review status |
|---|---|---|
| Place Detail — Minimum 1024 — Closed | `ed75407b15414b12a3da89c4b4893c49` | Approved |
| Place Detail — Desktop 1440 — Closed | `1631e7e314044ac2927f14857613098d` | Approved |
| Home / Explore — Guest Header 1440 | `5208af76e9564e338d0f82f93ff28fa1` | Approved |
| Home / Explore — Admin Header 1440 | `2663a65bb6434262ae0f580ad1ed8ff8` | Approved |
| Public UI System States — 1440 (WCAG 2.2 AA) | `b092fe6136244b00a9bcf0bd9d54326f` | Approved |

Generated-content QA confirmed that the closed states retain private whole-star
visit snapshots and public decimal aggregates without the active sheet or empty
drawer gap. The guest frame contains Sign in and no personal visit markers. The
admin frame contains a labelled management entry while retaining only the
admin's own **Your visits** markers. The final system-state board covers loading,
empty repository, no results, recoverable error, missing card data, private visit
validation, public review validation, success feedback, and expired-session draft
preservation, with the project target corrected to WCAG 2.2 AA.

