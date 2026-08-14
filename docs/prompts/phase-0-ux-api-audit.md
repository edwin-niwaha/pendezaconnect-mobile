# Pendeza Connect Phase 0 UX/API Audit

Date: 2026-08-14

## Scope

This audit covers:

- Mobile app: `D:\PERPETUAL PROJECTS\PendezaConnect\pendezaconnect-mobile`
- Web/API: `D:\PERPETUAL PROJECTS\PendezaConnect\pendezaconnect-web`

The goal is to identify the safest first implementation path for the Pendeza Connect UX, UI, API, and performance transformation.

## Current Mobile Architecture

The mobile app is an Expo SDK 54 / React Native app using Expo Router.

Key structure:

- Routes live under `app`.
- Feature screens live under `src/features`.
- API modules live under `src/api`.
- Shared UI lives under `src/components`.
- Theme tokens live in `src/constants/theme.ts`.
- Auth state lives in `src/providers/AuthProvider.tsx`.

Authentication is already centralized and supports:

- Username/password login.
- Google sign-in using native Google Sign-In on Android/iOS development builds.
- JWT persistence.
- Token refresh through the Axios interceptor.
- Profile refresh and logout.

## Current Mobile UX Findings

### Strengths

- The app already has a role-aware dashboard and services screen.
- Shared components exist for screens, cards, search, badges, section headers, loading, empty, and error states.
- Google sign-in and profile/account flows are already integrated.
- Child photo capture/upload already exists in the mobile app.
- Search is already wired for sponsors, clients, children, and loans.

### Risks

- `Screen` is ScrollView-based, so long datasets render all rows at once.
- Sponsor, client, loan, and child screens map arrays directly instead of using `FlatList` or `SectionList`.
- `useSearchableResource` returns arrays only and drops pagination metadata.
- Search debounce is 250 ms, below the requested 300-500 ms range.
- Search does not manage paging, stale-page reset, or load-more errors.
- Savings operational mode derives accounts by loading clients, which is not a true savings endpoint.
- Child photos load `current_picture_url` directly for list avatars; no thumbnail contract exists yet.
- Some UI text contains encoding artifacts such as `Â·`, which should be replaced with normal separators.
- Account is functional but very long in one scroll; it should become more sectioned/progressive.

## Current Web/API Architecture

The web project is a Django 4.2 application with a DRF mobile API under `api/v1`.

Registered mobile API viewsets:

- `auth`
- `children`
- `dashboard`
- `sponsors`
- `clients`
- `staff`
- `loans`
- `payments`

JWT and session authentication are enabled. Default permission is authenticated access.

## Current Web/API Findings

### Strengths

- Role-aware selectors exist in `api/v1/selectors.py`.
- Core querysets are scoped by internal user, linked client, or linked sponsor.
- DRF search and ordering are enabled for children, clients, sponsors, loans, and payments.
- Child photo upload endpoint exists at `/children/{id}/photos/`.
- Client savings detail endpoint exists at `/clients/{id}/savings/`.
- Sponsor payment detail endpoint exists at `/sponsors/{id}/payments/`.
- Recent payments endpoint exists at `/payments/recent/`.

### Risks

- No global DRF pagination is configured in `REST_FRAMEWORK`.
- List endpoints may return full datasets to mobile.
- Detail actions manually slice some related data to 25 or 30 records but do not expose proper pagination.
- Child photo URLs are returned as `str(picture.picture)`, which may be a storage path rather than a request-safe absolute URL.
- No thumbnail URL field is exposed for child photos.
- Client serializers do not expose `picture`, and there is no mobile client photo upload/gallery endpoint.
- Loan approval queue returns all matching loans for internal users.
- Some expensive loan serializer fields call `report_balances()` per row, which could become slow on large lists.

## Search and Pagination Audit

Current search support:

- Sponsors: backend search by first name, last name, email.
- Clients: backend search by full name, registration number, email.
- Children: backend search by full name, preferred name, district, residence.
- Loans: backend search by borrower name, registration number, status.
- Payments: backend search by sponsor name and program name.

Current pagination support:

- No global DRF pagination found.
- Mobile accepts paginated responses through `listOf`, but immediately discards pagination metadata.
- Mobile long-list screens render full arrays.

## Photo Workflow Audit

Child photos:

- Supported by backend.
- Supported by mobile.
- Needs better image URL handling, thumbnail support, list virtualization, upload feedback, and permission-specific testing.

Client photos:

- The backend model appears to have client picture support outside the current mobile serializer/API surface.
- The mobile API does not currently expose a secure client photo gallery or upload endpoint.
- This should remain gated until a backend design is approved.

## Recommended Implementation Plan

### Phase 1: Shared Mobile Foundation

1. Add a `Paginated<T>` API helper that keeps `count`, `next`, `previous`, and `results`.
2. Add a reusable paginated resource hook with 300-500 ms debounced search.
3. Add reusable list states for initial loading, refreshing, loading more, empty, no-results, and load-more error.
4. Add shared list/card primitives that work well inside `FlatList`.
5. Fix encoding artifacts in visible mobile text.

### Phase 2: Backend Pagination and URL Hygiene

1. Configure DRF page-number pagination with a safe default page size.
2. Preserve existing search/order behavior.
3. Return absolute media URLs for avatar and child photo fields where mobile consumes them.
4. Add thumbnail fields only if the storage/image pipeline can support them cleanly.
5. Add tests for authenticated access, role-scoped lists, search, pagination, and photo upload permissions.

### Phase 3: High-Impact Mobile Screens

1. Convert Children, Sponsors, Clients, and Loans from array maps inside `ScrollView` to virtualized paginated lists.
2. Keep Dashboard summary-focused and avoid loading large datasets there.
3. Improve Savings by adding/using a real paginated transactions endpoint instead of deriving operational savings from clients.
4. Split Account into clearer profile, security, recovery, and session sections.

### Phase 4: Photo Workflows

1. Improve child photo list performance and image loading.
2. Add clearer upload progress and retry states.
3. Add fullscreen/detail view only after list thumbnails are reliable.
4. Design client photo backend/API support separately before implementation.

### Phase 5: QA

1. Run mobile TypeScript checks.
2. Run Django checks and targeted API tests.
3. Smoke test username/password login, Google sign-in, token refresh, child photo upload, and role-scoped data access.

## First Implementation Recommendation

Start with pagination and virtualized list foundations before visual redesign. The current visual layer is workable, but long dataset handling is the largest UX and performance risk. The best first code pass is:

1. Backend: add DRF pagination defaults.
2. Mobile: preserve pagination metadata in API helpers.
3. Mobile: add a reusable paginated list hook.
4. Mobile: convert Children first because it combines search, images, uploads, and field workflow.
5. Mobile: convert Sponsors, Clients, and Loans next.

