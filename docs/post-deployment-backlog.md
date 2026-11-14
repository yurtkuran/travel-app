# Post-Deployment Backlog

> **Document status:** Living document
> **Started:** 2026-11-14
> **Applies after:** Initial TravelTrove production deployment

This document captures improvements to address after the initial deployment.
Items listed here are follow-up work rather than blockers for the Phase 9
deployment gate. Prioritization should be informed by production use, impact,
risk, and implementation dependencies.

## Administration taxonomy

| ID      | Item                                             | Status   |
| ------- | ------------------------------------------------ | -------- |
| TAX-001 | Add the ability to edit cities                   | Captured |
| TAX-002 | Add the ability to edit categories               | Captured |
| TAX-003 | Apply city and category sort changes immediately | Captured |

### TAX-001 — Edit cities

Allow an administrator to edit an existing city from the city-management
workflow.

Expected outcome:

- Administrators can open and update an existing city.
- Server-side validation continues to enforce the city, region, and country
  uniqueness rules.
- Existing place associations and history remain intact after an edit.
- Changes are recorded in the audit log without exposing private activity.
- The workflow provides accessible success and validation feedback.

Before implementation, define which city fields are editable and how a changed
city slug affects existing public URLs and bookmarks.

### TAX-002 — Edit categories

Allow an administrator to edit an existing category from the
category-management workflow.

Expected outcome:

- Administrators can open and update an existing category.
- Server-side validation continues to enforce category uniqueness and field
  constraints.
- Existing place associations, reviews, visits, and rating history remain
  intact after an edit.
- Changes are recorded in the audit log without exposing private activity.
- The workflow provides accessible success and validation feedback.

Before implementation, define the editable category fields, whether rating
capabilities are part of this workflow, and how a changed category slug affects
existing public URLs and bookmarks.

### TAX-003 — Apply sort changes immediately

On the city and category management lists, update the displayed order as soon
as the administrator changes the sort selection and remove the **Apply** button.

Expected outcome:

- Changing the sort selection immediately updates the URL state and result
  order.
- The current search value is preserved when the sort changes.
- Pagination returns to the first page when the new ordering is applied.
- Search remains operable with the keyboard after the **Apply** button is
  removed.
- Loading, focus, and screen-reader feedback remain clear during the update.

## Backlog governance

- Add newly observed items with a stable ID, concise outcome, and status.
- Record enough context to reproduce the issue or understand the requested
  improvement.
- Do not treat capture order as priority order.
- Move an item into the implementation plan when it becomes committed scope.
- Mark completed or declined items with the decision date and relevant release
  or rationale.
