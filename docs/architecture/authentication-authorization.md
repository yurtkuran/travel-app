# Authentication and Authorization

> **Status:** Phase 8 audited implementation
> **Provider:** Better Auth 1.7 with PostgreSQL-backed sessions

## Identity and session model

TravelTrove has two stored roles: `user` and `admin`. Guest is an
unauthenticated state. Better Auth owns credential verification, signed session
cookies, and session persistence; TravelTrove owns invitation setup tokens,
domain permissions, and account-retention workflows.

- Public email/password signup is disabled.
- Passwords must contain 12–128 characters and use Better Auth's password hash.
- Sessions expire after seven days, refresh after one day, and are considered
  fresh for sensitive administration for 15 minutes.
- Role changes, suspension, recovery, and deletion revoke active sessions.
- Better Auth origin/CSRF validation remains enabled. Only the configured
  application URL is trusted.
- Production authentication rate limiting is enabled with a stricter email
  sign-in rule. Development keeps the in-memory limiter disabled so local and
  browser-test workflows remain deterministic. Version one uses in-process
  rate-limit storage because deployment is a single application instance;
  multi-instance deployment requires shared storage.

## Browser response policy

Every application response receives an enforced content security policy plus
frame, MIME-sniffing, referrer, permissions, and cross-origin isolation headers.
The policy limits resources and form submissions to TravelTrove, disables object
and frame embedding, and permits only the inline script/style behavior currently
required by the Next.js runtime. Script evaluation is allowed only by the local
development server. Production additionally emits one-year HTTP Strict Transport
Security; TLS termination must therefore preserve these application headers.

## Invitation and recovery links

Admins provision every ordinary account as `user`. A cryptographically random
setup token expires after 72 hours. Only its SHA-256 hash is stored. Generating a
replacement revokes the previous active token.

The raw token enters `/account/setup` once, is checked, moved into a short-lived
HTTP-only, same-site cookie, and removed from the visible URL through a redirect.
The clean completion page sets the password transactionally, marks the account
verified, consumes the token, and revokes existing sessions. Invalid, expired,
used, revoked, and suspended-account links share one public error response.

Recovery uses the same UI with a separately recorded `admin_recovery` purpose.
Generating a recovery link immediately revokes sessions. Raw links are returned
only by the command that creates them and must never be pasted into tickets,
chat, logs, or analytics.

## Permission model

`src/features/auth/permissions.ts` is the deny-by-default policy vocabulary.
Server reads and mutations call its checks; UI visibility is only a convenience.

- Users can manage their own account, visits, reviews, drafts, and proposals.
- Admins gain publication, moderation, taxonomy, account, and operational
  capabilities.
- Private ownership checks are separate from role checks. An admin cannot read or
  mutate another user's visits merely because they are an admin.
- Admin moderation may inspect submissions and proposals through explicit
  moderation capabilities, not through a blanket ownership bypass.

Protected pages fetch the authoritative database session. Guests are redirected
to sign-in with a same-origin return path. Authenticated non-admins receive an
HTTP 403 boundary for administration pages.

## Server boundary audit

The Phase 8 Server Action and Route Handler audit uses these explicit boundary
classes:

- Personal account, visit, review, submission, and proposal actions call
  `requireCurrentSession`; their services additionally enforce the relevant
  capability and record ownership.
- Administrative taxonomy, place, media, moderation, and account actions call
  `requireAdminSession` or `requireFreshAdminSession`; their services repeat
  capability checks. Account provisioning and destructive account management
  require a fresh session.
- Account setup is the intentional sessionless mutation. Its single-use,
  hashed, expiring setup token is the authorization credential, and successful
  consumption invalidates it.
- `/api/auth/*` delegates authentication and session authorization to Better
  Auth with origin/CSRF checks explicitly enabled.
- Liveness and readiness handlers are intentionally public and disclose only
  bounded status values.
- `/media/*` is intentionally public only for media whose row and owning place
  are both published. Draft, unpublished, missing, malformed, and unrecognized
  keys return the same 404 response before storage is read.

UI visibility is never treated as authorization. New Server Actions and Route
Handlers must be assigned to one of these classes and enforce the corresponding
guard before reading private data or mutating state.

## Account-administration safeguards

Account administration is transactional and audited. The service:

- prevents an admin from suspending or deleting their own account;
- locks the target row and prevents demotion, suspension, or deletion of the
  final active administrator;
- promotes only activated, unsuspended accounts;
- revokes sessions after role or suspension changes;
- deletes private visits and reviews through account cascades;
- deletes unpublished drafts, withdraws pending work, strips private provenance,
  and preserves published community places;
- retains only pseudonymous audit references after identity deletion.

Browser account mutations must call `requireFreshAdminSession` before invoking
these services. Server-side bootstrap/recovery commands are the explicit
non-browser exception.

## Server commands

All commands load `.env.local` and must run from a trusted terminal. Bootstrap is
allowed only while no active administrator exists.

```bash
read -s TRAVELTROVE_BOOTSTRAP_PASSWORD
export TRAVELTROVE_BOOTSTRAP_PASSWORD
pnpm auth:bootstrap-admin -- --email admin@example.com --name "Admin Name"
unset TRAVELTROVE_BOOTSTRAP_PASSWORD

pnpm auth:provision-user -- \
  --admin-email admin@example.com \
  --email user@example.com \
  --name "User Name"

pnpm auth:recover-account -- \
  --admin-email admin@example.com \
  --email user@example.com
```

Provision and recovery commands print the one-time link. The administrator must
copy it immediately and send it through an appropriate private channel.
