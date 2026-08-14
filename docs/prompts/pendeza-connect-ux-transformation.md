# Pendeza Connect UX, UI, API, and Performance Transformation Prompt

## Role

Act as a senior product designer, UX/UI designer, React Native/Expo engineer, Django/DRF engineer, performance engineer, and accessibility specialist.

Transform Pendeza Connect Web and Pendeza Connect Mobile into a modern, professional, trustworthy, fast, and maintainable platform for sponsorship, savings, loans, payments, staff operations, client records, child records, and mobile field workflows.

## Target Projects

- Web/backend: `D:\PERPETUAL PROJECTS\PendezaConnect\pendezaconnect-web`
- Mobile app: `D:\PERPETUAL PROJECTS\PendezaConnect\pendezaconnect-mobile`

## Current Context

Pendeza Connect Mobile is an Expo SDK 54 / React Native / Expo Router app. It uses an API layer under `src/api`, role-aware auth under `src/providers/AuthProvider.tsx`, shared UI components under `src/components`, and feature screens under `src/features`.

Pendeza Connect Web is a Django 4.2 application with server-rendered templates and a DRF mobile API under `api/v1`. It owns authentication, permissions, profiles, children, sponsors, clients, loans, savings, finance, reports, and mobile API security.

Do not treat the mobile app as independent from the backend. Any mobile experience that needs new data, search, pagination, thumbnails, permissions, or upload behavior must be checked against the web/API project first.

## Non-Negotiable Constraints

- Do not rewrite the application architecture.
- Do not replace Expo Router, the current auth provider, the current API client, or the Django/DRF project structure unless there is a proven blocker.
- Do not break username/password login, Google sign-in, JWT refresh, profile updates, child photo upload, or existing role permissions.
- Do not expose unauthorized child, client, sponsor, financial, loan, savings, or profile data.
- Do not fetch whole datasets into the mobile app when server-side pagination/search can be used or added.
- Do not add large new libraries unless they solve a real problem and fit Expo SDK 54 / Django 4.2.
- Keep changes incremental, testable, and reversible.

## First Step: Audit Before Editing

Before implementation, inspect both projects and produce a concise audit with:

1. Current mobile navigation, screens, reusable components, theme, auth, storage, API hooks, loading states, empty states, and error states.
2. Current web/API endpoints, serializers, permissions, pagination, filtering, search, media fields, and image upload paths.
3. Screens or endpoints that already support pagination/search.
4. Screens currently using large non-virtualized lists, nested vertical scrolling, duplicate requests, large image downloads, or weak loading/error states.
5. Features that are unsupported by the backend and require explicit implementation or approval.

Do not begin broad UI changes until this audit is complete.

## Transformation Principles

- Show the most important information first.
- Use summary -> details -> full dataset.
- Keep dashboards concise; never turn a dashboard into a database export.
- Add search only where it has clear value.
- Make search work with pagination and reset stale results when the query changes.
- Use virtualized lists for long mobile datasets.
- Preserve working content when loading more fails.
- Use skeletons, empty states, and retry states instead of blank screens.
- Use thumbnails or appropriately sized images where available.
- Load secondary detail sections only when needed.
- Prefer existing design tokens, components, and API conventions.

## Design Direction

The product should feel like a premium but practical financial/community services platform: clean, trustworthy, calm, mobile-first, professional, accessible, fast, and easy for everyday users.

Avoid excessive gradients, oversized decorative cards, tiny text, random colors, too many icons, heavy shadows, and long walls of content.

## Design System Work

Before redesigning feature pages, consolidate or improve:

- Brand colors and semantic colors
- Page titles, section titles, body text, labels, numbers, and button typography
- Spacing and radius scales
- Buttons, icon buttons, cards, list rows, inputs, search bars, and filter chips
- Loading skeletons, empty states, and error states

Do not invent one-off styles per page.

## Mobile Screen Goals

### Dashboard

Answer "What matters to me right now?" Include role-relevant summaries, important alerts, quick actions, recent activity, and entry points into core modules. Do not load every loan, transaction, photo, sponsorship, or savings record.

### Services

Make services discoverable with clear categories and compact cards. Add search only if the list is large enough to justify it.

### Sponsorship

Make sponsorship personal and visual. Use summary cards, compact sponsorship/child cards, search, filters, and detail screens. Do not expose full details in the main list.

### Loans

Make loans feel like a professional financial interface. Show outstanding balance, next payment, status, and recent items first. Put repayment schedules and transaction history behind details or expandable sections.

### Savings

Make savings feel like banking. Show balance, monthly movement, accounts, and recent transactions. Long transaction history must use search/filter/pagination.

### Child Photos

Improve the existing child photo workflow with better list performance, image handling, upload states, permissions, and empty/error states. Use thumbnails/lazy loading where the backend supports it.

### Client Photos

Treat this as a gated feature, not an automatic first-pass task. First audit the web `Client.picture` model field, serializers, permissions, and API support. If a secure mobile API/gallery does not exist, propose the backend and mobile changes separately before implementing.

### Account

Organize account features into readable sections. Avoid one extremely long settings page. Keep profile, security, support, and sign-out flows clear.

## Web/API Goals

Only change backend/API behavior when it directly enables secure mobile UX or fixes existing web/API issues.

Backend/API improvements may include DRF pagination, search/filter query parameters, efficient serializer fields, permission checks, thumbnail/resized image URLs, and tests for role access, search, pagination, and upload security.

Do not weaken authorization to improve convenience or performance.

## Search Rules

Add search for high-volume screens only: sponsorships, loans, savings transactions, child photos, client photos after backend support is confirmed, and other large datasets found during the audit.

Do not add search to dashboard, account, or small static lists.

Search must debounce requests by about 300-500 ms, reset pagination on query change, clear stale results, show loading/no-results/error states, and work with server-side pagination where available.

## Pagination Rules

Use server-side pagination for long datasets. Mobile should initially load 10-20 records and fetch more as needed.

Avoid rendering hundreds of records in `ScrollView`. Use `FlatList` or `SectionList` for large mobile lists.

## Image Rules

- Prefer thumbnail-sized URLs for grids/lists.
- Avoid downloading full-size images for small thumbnails.
- Show image placeholders and fallbacks.
- Open full-resolution images only in detail/fullscreen views.
- Never expose unauthorized image URLs.

## Accessibility and Responsiveness

Verify contrast, touch targets, accessible button labels, icon meaning, long text handling, small Android screens, large Android screens, iOS layout where feasible, and loading/error/empty states under large font settings where feasible.

## Implementation Order

### Phase 0: Audit and Plan

Inspect both projects, identify high-impact screens and backend support gaps, and produce a short implementation plan. Do not edit broad feature surfaces yet.

### Phase 1: Foundation

Stabilize design tokens and shared components. Improve shared loading, empty, error, skeleton, search, filter, and list primitives.

### Phase 2: Core Mobile Experience

Dashboard, Services, Account structure, and navigation refinement.

### Phase 3: Financial and Sponsorship Workflows

Sponsorship, Loans, Savings, and Payments where relevant.

### Phase 4: Photo Workflows

Child photos, client photos only if backend/API support is designed and authorized, image performance, and viewer behavior.

### Phase 5: Backend/API Enhancements

Pagination, search, filtering, permission tests, serializer performance, and image URL/thumbnail support where feasible.

### Phase 6: QA and Polish

Run TypeScript checks, Django checks/tests, manual mobile smoke tests, auth/Google sign-in tests, role permission checks, loading/error/empty-state checks, and performance checks for large lists.

## Acceptance Criteria

- Existing auth, Google sign-in, token refresh, and API connectivity still work.
- Dashboard is concise and role-aware.
- Long lists use pagination or incremental loading.
- Large mobile lists use virtualized components.
- Search exists only where useful and works with pagination.
- Loading, empty, and error states are polished and actionable.
- Child photo flows remain secure and usable.
- Client photo functionality is not exposed unless authorization and API support are implemented.
- Loans and savings read as financial interfaces, not raw tables.
- Sponsorship reads as a human-centered support workflow.
- UI is visually consistent across screens.
- No sensitive data or image URLs are exposed to unauthorized users.
- TypeScript and relevant Django checks/tests pass, or blockers are clearly documented.

## Final Instruction

Do not simply make screens prettier. Improve the product experience by showing what matters first, making records easy to find, revealing details progressively, loading large datasets only when needed, and keeping every screen clean, fast, secure, and trustworthy.
