# Operational notification queues

The mobile Notifications screen loads `GET /api/v1/notifications/work-queues/`
alongside saved messages and pending loans. This is a read-only, authenticated
endpoint. The backend decides which categories and records each account can see.

| Category | Source | Access |
| --- | --- | --- |
| Activate User Accounts | Unassigned guest profiles, excluding linked clients/sponsors and staff roles | Administrator |
| User Feedback: sponsor feedback | SponsorFeedback with new/unread status | All existing staff review roles, including BOO |
| User Feedback: contact feedback | Contact records with is_valid=False | Administrator, manager, ED, HOF |
| Pending Withdrawals | SavingsTransaction with pending status and withdrawal type | Administrator, HOF, accountant |

These permissions match the corresponding web review decorators and withdrawal
notification context. The old web activation context and contact-feedback context
currently return empty placeholders; the new mobile queues explicitly surface
unassigned guests and unreviewed Contact records for authorized reviewers.
Disabled staff/client/sponsor accounts are not treated as activation requests.

Each category returns a full count, at most five previews, and links to existing
web review pages. Those pages retain their own authentication and action controls;
the mobile API token is never placed in a browser URL. Withdrawals also link to
the existing native savings screen using the client ID (not the savings account ID).

Queues refresh on focus, pull-to-refresh, and foregrounding the Notifications
screen after a web review. In-flight results are invalidated on blur/account or
role changes. Clearing/reading notification messages does not resolve work items.
Loading these queues does not create new push notifications or play arrival sounds.

Deploy `api/v1/notification_queues.py` and the change to
`api/v1/views/notification_viewsets.py` from the separate `.backend-work` repository,
then release the mobile changes. No database migration is required. An older
server displays a clear server-update message while the existing inbox still works.

Checks: `node --test scripts/work-queue-links.test.cjs` and
`python scripts/test_notification_queues.py`. The Python tests mock the ORM and URL
resolver; validate the endpoint with a deployed test database before production.
On a device, verify each staff role, switching accounts, opening review pages,
returning after resolving an item, and retrying a failed refresh.
