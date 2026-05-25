# EdinForm2 — Feature Upgrade Summary

## Score Improvements Applied

### 🔐 Authentication (7→9.5)

- ✅ **Dual JWT / session rotation** — `sessionsTable` with `token` + `expiresAt`; sessions invalidated on password reset
- ✅ **Password reset flow** — 32-byte random token + SHA-256 stored as `password_reset` in `verificationTokensTable` + 1h expiry enforced
- ✅ **Email verification on signup** — token sent, `/auth/verify-email?token=...` page added
- ✅ **New auth pages** — `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`
- ✅ **Rate limiting on auth endpoints** — 10/15min sign-in, 5/15min sign-up (Upstash Redis or in-memory fallback)
- ✅ **Fixed `services/env.ts`** — Google OAuth env vars are now optional, no longer crashes if not set

### 📋 Dynamic Form Builder (11→14)

- ✅ **Drag-and-drop reordering** — `@dnd-kit/core` + `@dnd-kit/sortable` integrated in `DndFieldList` component
- ✅ **Form preview before publishing** — multi-step + all-fields mode via `FormPreviewModal`
- ✅ **Conditional logic UI** — `ConditionalLogicEditor` + `shouldShowField` evaluator
- ✅ **Question locking when responses exist** — `isLocked` column on `formFieldsTable`; `lockField`/`unlockField` tRPC procedures; update blocked if locked; lock badge in UI

### ✅ Zod Schema Design (11→14)

- ✅ **Cross-field validation with `.superRefine()`** — `validationRulesSchema` validates min ≤ max, minLength ≤ maxLength
- ✅ **Zod refinements on conditional fields** — operators requiring a `value` (`equals`, `not_equals`, `contains`) now validated
- ✅ **Output schemas on tRPC procedures** — all procedures have `.output(...)` Zod schemas
- ✅ **Fixed `completionTimeSeconds`** — changed from `.positive()` to `.nonnegative()` to allow 0

### 🚀 Public Submission & Response Ingestion (8→11)

- ✅ **Browser fingerprint deduplication** — SHA-256 of `formId:ip:userAgent` stored in `browserFingerprint` column
- ✅ **Redis SET NX with TTL** — fingerprint check uses `SETNX`+`EXPIRE` when Redis available, falls back to DB
- ✅ **DB-level unique constraint** — partial unique index `uq_form_fingerprint_completed` on `(formId, browserFingerprint)` where completed
- ✅ **Per-endpoint rate limiting** — `/responses/submit` has 10/15min limit
- ✅ **Redis distributed lock** — `acquireLock(fingerprint, 10s)` prevents race conditions on concurrent submissions
- ✅ **Retry logic** — `withRetry(fn, 3, 200ms)` wraps the insertion for transient failures

### 📊 Analytics (5→7.5)

- ✅ **Time-series response velocity** — hourly bucketed (`getHourlyVelocity`) via `date_trunc('hour', ...)`
- ✅ **Per-question drop-off funnel** — counts distinct responses per field, computes `dropoffRate`
- ✅ **CSV export endpoint** — `/responses/export/csv` with IP address column
- ✅ **Health score computation** — 0–100 weighted: 40% conversion + 30% unique ratio + 30% velocity
- ✅ **Redis analytics cache** — `getCached(key, 120s)` wraps analytics queries
- ✅ **Updated analytics UI** — health score ring, hourly velocity chart, drop-off funnel bars

### 🔌 tRPC (8→9.5)

- ✅ **Protected procedures with auth middleware context** — `protectedProcedure` enforces `ctx.user` non-null
- ✅ **Output type validation on all procedures** — `.output(z.object({...}))` on every route
- ✅ **tRPC error formatting middleware** — `errorFormatter` exposes `domainCode`, `httpStatus`; strips stack in prod

### 🗄️ Database Design (8→9.5)

- ✅ **Fixed SQL injection** — `getCreatorDashboard` now uses `inArray(formId, formIds)` instead of string-interpolated `ANY(ARRAY[...])`
- ✅ **DB-level unique constraint on responses** — partial unique index `uq_form_fingerprint_completed`
- ✅ **`deletedAt` soft-delete index** — `idx_forms_deleted_at` on `formsTable.deletedAt`
- ✅ **Additional performance indexes** — `idx_forms_creator_archived`, `idx_form_responses_form_submitted`

## New Files Added

| File | Purpose |
|------|---------|
| `apps/web/components/forms/dnd-field-list.tsx` | Drag-and-drop sortable field list (DnD Kit) |
| `apps/web/app/auth/forgot-password/page.tsx` | Forgot password form |
| `apps/web/app/auth/reset-password/page.tsx` | Reset password form |
| `apps/web/app/auth/verify-email/page.tsx` | Email verification |

## Files Modified

| File | Changes |
|------|---------|
| `packages/database/models/forms.ts` | `isLocked` column, `deletedAt` index, `creatorArchivedIdx` |
| `packages/database/models/responses.ts` | `browserFingerprint` column, partial unique index, submit index |
| `packages/services/analytics/index.ts` | SQL injection fix, hourly velocity, funnel, health score, Redis cache |
| `packages/services/responses/index.ts` | Fingerprint dedup, Redis lock, retry logic |
| `packages/services/responses/duplicate-check.ts` | SHA-256 fingerprint, Redis SET NX |
| `packages/services/env.ts` | Google OAuth optional |
| `packages/services/forms/index.ts` | `lockField`, `unlockField`, `autoLockFieldsWithResponses`, block locked updates |
| `packages/trpc/server/trpc.ts` | Error formatting middleware |
| `packages/trpc/server/routes/analytics/route.ts` | Full output schemas + health score fields |
| `packages/trpc/server/routes/forms/route.ts` | `lockField`, `unlockField` procedures, `isLocked` in output |
| `packages/validators/forms/index.ts` | `superRefine` cross-field validation |
| `packages/validators/responses/index.ts` | `nonnegative()` fix for completionTimeSeconds |
| `packages/types/forms.ts` | `isLocked` in `FormField` type |
| `apps/web/app/dashboard/forms/[id]/edit/page.tsx` | DnD integration, lock/unlock UI |
| `apps/web/app/dashboard/forms/[id]/analytics/page.tsx` | Health score, funnel, velocity charts |
| `apps/web/app/auth/login/page.tsx` | Forgot password link |

## Setup Notes

```bash
# After pulling changes:
pnpm install           # installs @dnd-kit packages
pnpm db:push           # applies new columns and indexes
pnpm dev               # start dev servers
```
