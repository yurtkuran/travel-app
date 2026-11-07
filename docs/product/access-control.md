# Version-One Access Control

> **Status:** Version-one access-control contract confirmed  
> **Last reviewed:** 2026-11-05  
> **Phase:** Phase 0 — Define version one

This document defines the version-one access model. Authorization must always be
enforced on the server; hiding a control in the interface is not an authorization
boundary.

## Identity model

The product has three user experiences but only two stored account roles:

- **Guest** — an unauthenticated visitor. Guest is an access state, not a database
  role and not a Better Auth user.
- **User** — an authenticated account with the stored role `user`.
- **Admin** — an authenticated account with the stored role `admin`.

Version one is invitation-only: an admin provisions each account, and provisioned
accounts receive `user` by default. The first administrator is created or promoted
through a server-side bootstrap command. Public clients must never be able to
create an account or assign themselves the `admin` role.

The application generates a single-use account-setup link. The admin emails that
link to the new user manually; version one does not require an integrated outbound
email provider for invitations.

## Permission matrix

| Capability                           | Guest | User | Admin |
| ------------------------------------ | :---: | :--: | :---: |
| Browse published places              |  Yes  | Yes  |  Yes  |
| Read public reviews                  |  Yes  | Yes  |  Yes  |
| Sign in to a provisioned account     |  No   | Yes  |  Yes  |
| Manage own profile and session       |  No   | Yes  |  Yes  |
| Record, edit, and delete own visits  |  No   | Yes  |  Yes  |
| Read own visit history               |  No   | Yes  |  Yes  |
| Write, edit, and delete own reviews  |  No   | Yes  |  Yes  |
| Submit a new place for review        |  No   | Yes  |  Yes  |
| Edit own draft place submission      |  No   | Yes  |  Yes  |
| Propose changes to a published place |  No   | Yes  |  Yes  |
| Publish or unpublish a place         |  No   |  No  |  Yes  |
| Approve or reject place submissions  |  No   |  No  |  Yes  |
| Edit any place                       |  No   |  No  |  Yes  |
| Manage cities and categories         |  No   |  No  |  Yes  |
| Moderate public reviews              |  No   |  No  |  Yes  |
| Manage accounts and roles            |  No   |  No  |  Yes  |
| Access operational administration    |  No   |  No  |  Yes  |

“Own” must be checked using the authenticated user ID on the server. A record ID
provided by the browser is never sufficient proof of ownership.

## Place-submission lifecycle

The recommended version-one lifecycle is:

```text
draft → pending_review → published
                     ↘ rejected
published → unpublished
```

- A user creates and edits their own `draft`.
- Submitting changes the place to `pending_review` and makes it visible to admins,
  but not to guests or other users.
- An admin may correct, approve, reject, publish, unpublish, or archive a place.
- A user cannot directly set a publication or moderation status.
- A rejection should include an admin reason visible to the submitter.
- Published-place edits by users create a pending change proposal rather than
  mutating public content. The currently published place remains visible while
  the proposal awaits admin approval.
- An admin can approve or reject a proposed change. Approval applies the proposal
  to the canonical published place and records who approved it and when.

All status transitions must be allowlisted by current state and actor role.

## Visits

- Visit records belong to an authenticated user and a place.
- Users may manage only their own visit records.
- A displayed visit count is derived only from the signed-in user's own visit
  records, not stored as a manually maintained counter on the place.
- Individual visit history and counts are private to their owner.
- Admins can see only their own visit history and counts. The `admin` role does not
  grant access to another person's visit activity.
- Guests do not see visit counts.
- Each visit includes a private overall rating and may include private
  category-enabled dimension ratings. These snapshots support personal trends and
  never contribute to public aggregates.

## Reviews

- Reviews belong to an authenticated user and a published place.
- Users may create, edit, and delete only their own reviews.
- Guests may read reviews that are public and not hidden by moderation.
- A new review becomes public immediately; it does not wait for admin approval.
- Admins may hide, restore, or remove reviews under a documented moderation rule.
- Rating dimensions are enabled by category capability rather than category name.
- Server validation must reject a rating dimension unsupported by the place's
  category even if a client manually submits it.
- Place-level star-rating summaries are calculated from public, non-hidden
  reviews rather than stored as manually updated counters on the place.
- Every review requires an integer overall star rating from 1 through 5. Review
  text and category-enabled rating dimensions are optional in version one.
- A user may have only one review per place and may edit that review.

The complete validation and aggregation rules are defined in
[`reviews-visits-ratings.md`](reviews-visits-ratings.md).

## Account administration safeguards

- Admins may view accounts, suspend access, and change `user`/`admin` roles.
- The system must prevent removal, suspension, or demotion of the final active
  admin.
- Role changes and account moderation actions require recent authentication and
  an audit event.
- Suspended users cannot create sessions or perform authenticated mutations.
- Account deletion must define retention/anonymization behavior for submitted
  places, reviews, and visits before it is implemented.

## Account lifecycle rules

The following rules are confirmed for version one.

### Account-setup links

- A setup link expires 72 hours after generation.
- Only one active setup link may exist per account. Generating a replacement
  immediately revokes the previous link.
- An admin may explicitly revoke an unused link.
- The application displays the raw link only when it is generated. It stores only
  a cryptographic token hash and cannot show the same link again.
- The token is single-use and is consumed transactionally when the user sets the
  initial password.
- Successful activation, account suspension, and account deletion revoke every
  outstanding setup link for that account.
- Setup tokens must be redacted from application and proxy logs.
- If a link expires, the admin generates a replacement and emails it manually.

### Withdrawing submissions and change proposals

- A user may withdraw their own `pending_review` submission or change proposal
  until an admin decides it.
- Withdrawal is an explicit, audited transition to `withdrawn`; it is not a hard
  delete.
- A withdrawn item cannot later be approved.
- “Edit and resubmit” creates a new draft from the withdrawn values, preserving
  the original review history.
- An admin action and a withdrawal must be serialized so only one terminal
  transition can succeed.

### Suspension

- Suspension is reversible and should be preferred when an account may be needed
  again.
- Suspending an account revokes all active sessions and blocks activation, sign-in,
  and authenticated mutations.
- Published places remain published. Public reviews remain visible unless an admin
  separately moderates them.
- Private visits remain stored and private. Admins still cannot browse them.
- Pending submissions and proposals remain preserved but cannot advance through
  user action while the account is suspended.
- Restoring an account does not automatically restore separately moderated
  reviews or content.

### Account deletion and content retention

- Version-one deletion is an explicit admin action performed in response to the
  user's request; it requires recent re-authentication and a typed confirmation.
- Deletion revokes sessions and setup links and prevents future authentication.
- Private visits and their notes are permanently deleted.
- The user's reviews are removed from public display and rating aggregates.
- Unpublished drafts are deleted. Pending submissions and proposals become
  withdrawn and are stripped of unnecessary personal provenance.
- Published canonical places remain because they are community content, but
  private provenance and personal attribution to the deleted account are removed.
- A minimal pseudonymous tombstone may remain where referential integrity or a
  security audit requires an actor record; it must not contain the user's name,
  email, credentials, or profile data.
- Security audit entries retain only the minimum information required by the
  documented retention policy.

### Creating additional admins

- Admins provision all new accounts as `user`; an invitation cannot directly
  create another admin.
- An activated existing user may be promoted to `admin` by a current admin after
  recent re-authentication.
- Promotion, demotion, suspension, and deletion are audited and revoke the target
  account's existing sessions so new permissions take effect on the next sign-in.
- The first admin is created only through the server-side bootstrap command.
- The final active admin cannot be demoted, suspended, or deleted.

## Authorization implementation rules

- Centralize role, ownership, record-state, and category-capability checks in the
  server-side application layer.
- Apply authorization to reads as well as mutations; unpublished submissions and
  private visits must not leak through list or search endpoints.
- Use deny-by-default checks and explicit permissions.
- Re-fetch authoritative database state during mutations instead of trusting
  role, ownership, category, or status values sent by the client.
- Record security-relevant admin actions in an audit log.
- Test cross-account access using two distinct user accounts.

## Confirmed safeguards

- Setup links expire after 72 hours and follow the single-use, replacement, and
  revocation rules above.
- Users may withdraw pending submissions and proposals through the audited
  workflow above.
- Suspension and deletion follow the confirmed retention rules above.
- Additional admins are created only by promoting an activated user after recent
  admin re-authentication.
