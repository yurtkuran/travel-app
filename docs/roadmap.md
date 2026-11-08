# TravelTrove Product Roadmap

> **Document status:** Living document
> **Last updated:** 2026-11-08

This document captures ideas that may improve TravelTrove after the current
version-one phase work. An item appearing here is not committed scope or a target
release. Before implementation, each item must be prioritized, designed, and
moved into the relevant phase of the implementation plan.

## Presentation and editorial enhancements

| ID     | Candidate enhancement                    | Status  |
| ------ | ---------------------------------------- | ------- |
| UI-001 | Rotating sign-in travel imagery          | Backlog |
| UI-002 | Home-page background or hero imagery     | Backlog |
| UI-003 | Rotating travel-related editorial quotes | Backlog |

### UI-001 — Rotating sign-in travel imagery

Add a curated rotation of travel photography to the contextual side of the
sign-in and account-setup shell.

Before implementation:

- define image ownership, licensing, attribution, storage, and editorial
  selection;
- preserve form contrast and avoid distracting motion while credentials are
  entered;
- use responsive image sizing and formats that do not delay authentication;
- respect reduced-motion and reduced-data preferences;
- provide a stable fallback when images are unavailable.

### UI-002 — Home-page background or hero imagery

Introduce travel imagery behind or alongside the home-page hero while preserving
the approved editorial hierarchy and readable typography.

Before implementation:

- choose whether the image is decorative, contextual, or linked to featured
  content;
- define art direction for the 1024px and 1440px layouts;
- protect text contrast across every selected image;
- avoid layout shift and excessive initial-page weight;
- provide meaningful alternative text only when the image conveys content.

### UI-003 — Rotating travel-related editorial quotes

Replace the static **Travel slowly. Remember well.** archive note with a rotating
collection of travel-related quotations or original editorial observations.

Before implementation:

- establish quotation sources, accuracy checks, attribution, and usage rights;
- decide whether content is curated in code or managed as application data;
- provide manual controls if rotation is automatic;
- pause rotation on interaction and respect reduced-motion preferences;
- keep one quotation available when scripting is disabled.

## Roadmap governance

- New ideas should include the user value, affected routes, dependencies, and
  privacy or accessibility considerations.
- Backlog order does not indicate priority.
- An item moves out of this document only after it becomes committed scope in the
  implementation plan or is explicitly declined.
