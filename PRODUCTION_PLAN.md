# Aura Production Plan

- Last Updated: March 25, 2026
- Owner: Aura Engineering + Ops
- Status: Draft
- Audience: Engineering + Ops

## Project Constraints

- Strict $0 budget target (free tiers only; no automatic paid upgrades).
- Chicago-first launch scope for MVP through Public Beta.
- Mobile web PWA is the first and only client surface in this phase.

## A. Product and Scope Baseline

### Product Vision

Aura is a personalized city exploration app where users unlock cinematic, persona-driven micro-stories at real landmarks. The experience combines geolocation, AI-assisted storytelling, and lightweight progression loops to increase repeat exploration behavior.

### User Journey Summary

1. User signs in with email/password or Google.
2. User completes onboarding by choosing interests.
3. System assigns a persona and stores profile in Supabase.
4. User explores the map and moves near landmarks.
5. Landmark unlocks within proximity threshold and opens a cinematic story modal.
6. User saves unlocked stories to gallery and optionally adds landmarks to itinerary.
7. User toggles to local mode to view curated events.
8. User may share unlocked story links/cards.

### MVP -> Public Beta Scope Boundaries

In Scope:

- Auth and onboarding with persona assignment.
- Tourist mode landmark discovery and proximity-based unlock.
- Story generation pipeline (text-first, optional image).
- Gallery save and retrieval.
- Local mode with curated Chicago events.
- Persisted itinerary planning and simple route optimization.
- Light progression (streaks, milestones, badges).
- Basic sharing (no social graph/feed).
- PWA installability and basic offline fallback.
- Admin backoffice for content curation.

Out of Scope:

- Multi-city generalized rollout.
- Native iOS/Android applications.
- Social feed, friends, and messaging.
- Full gamification system (quests, XP economy, leaderboard network effects).
- Video-first generation pipeline at scale.
- Monetization/payments before Public Beta.

### Non-Negotiables

- Free-first architecture and operational discipline.
- Security minimums for production APIs/functions (authn/authz, least privilege, no public destructive endpoints).
- No production demo backdoors (test unlock overrides, global reset exposure).
- Reproducible deployments and rollback-capable change management.

## B. Detailed Feature Plan

### Approved Decisions (Locked)

- Chicago-first geographic scope.
- Seeded/manual local events for MVP through Public Beta.
- Light progression (streaks, milestones, badges) before full gamification.
- Basic sharing only; no friends/feed in this phase.
- Story text + optional image as the cinematic output target.
- Monetization deferred until post-beta.

### Phase 1 - Core Experience Hardening (Launch Candidate)

Objective:

- Stabilize existing core flow for production reliability.

Deliverables:

- Auth flow hardening and session reliability.
- Onboarding/persona assignment error handling.
- Landmark unlock stability for geolocation edge cases.
- Cinematic modal resilience when asset generation is unavailable.
- Production removal/gating of test unlock and reset UI paths.

Dependencies:

- Supabase auth configuration (redirects/providers).
- Reliable landmark seed or curated baseline content.
- Edge function auth hardening.

Acceptance Criteria:

- New user can sign up/login, onboard, and unlock at least one landmark.
- Story modal renders with valid fallback behavior when generation fails.
- No production path allows global reset or forced test unlock behavior.

Deferred Items:

- Advanced onboarding personalization variants.
- Rich media automation pipeline (audio/video as default).

### Phase 2 - Local Mode + Content Operations

Objective:

- Ship editorially curated local mode and make content operations manageable.

Deliverables:

- Curated Chicago events shown in local mode map.
- Event details modal with timestamp and type metadata.
- Admin backoffice for landmarks/events CRUD, publish/unpublish, and soft delete.
- Role-gated admin access with audit-friendly action logs.

Dependencies:

- Content model/table support for publish state.
- Admin authentication and authorization model.

Acceptance Criteria:

- Non-admin users can only view published content.
- Admin can create/update/publish/unpublish without DB manual SQL steps.
- Local mode renders curated events accurately in staging and production.

Deferred Items:

- User-submitted event/landmark moderation workflow.
- External API-driven event ingestion.

### Phase 3 - Itinerary Planning

Objective:

- Convert itinerary into durable planning functionality for repeat usage.

Deliverables:

- Persisted itineraries per user (create, update, reorder, clear).
- Route optimization retained as nearest-neighbor heuristic.
- Itinerary summary surface (landmark count, distance estimate, simple duration estimate).
- Start-itinerary mode with clear next-stop focus.

Dependencies:

- New itinerary tables and RLS.
- Stable geolocation updates on mobile web.

Acceptance Criteria:

- Itinerary survives refresh/session changes.
- Reorder/remove operations are reflected immediately and persistently.
- Route visualization displays for 2+ itinerary points.

Deferred Items:

- Advanced routing APIs and traffic-aware optimization.

### Phase 4 - Engagement + Sharing

Objective:

- Increase retention with lightweight progression and low-cost sharing loops.

Deliverables:

- Streak tracking and milestone counters.
- Badge/achievement issuance at predefined thresholds.
- Basic story share links/cards for unlocked content.
- Profile progress panel updates from live user data.

Dependencies:

- Progress data model (`user_progress`, achievements tables).
- Share token model and public read endpoint policy.

Acceptance Criteria:

- Progress counters update after unlock activity.
- Badge logic is deterministic and idempotent.
- Share links open valid public snapshots without exposing private user data.

Deferred Items:

- Friends graph, feeds, reactions, comments, direct messaging.

### Phase 5 - PWA and Public Beta Readiness

Objective:

- Prepare app for controlled public usage and operational support.

Deliverables:

- Installable PWA metadata and icons.
- Offline fallback for cached landmarks/gallery/story text.
- Accessibility and performance pass for common mobile devices.
- Beta metrics instrumentation (activation, retention, error rates).

Dependencies:

- Stable release pipeline and observability baseline.
- Controlled test cohort and go-live checklist signoff.

Acceptance Criteria:

- PWA install prompt works on supported browsers.
- Key screens render in poor connectivity mode with graceful fallback.
- Public Beta entry criteria and SLO thresholds are met.

Deferred Items:

- Monetization stack (subscriptions, entitlements, billing portals) until post-beta.

## C. Detailed Production Deployment Plan

### Environment Topology

- `staging` environment:
- Vercel project/domain for pre-production validation.
- Supabase project dedicated to staging data/services.
- `production` environment:
- Vercel project/domain for live users.
- Supabase project dedicated to production data/services.

### Hosting and Backend

- Frontend hosting: Vercel (Hobby tier).
- Backend platform: Supabase (Auth, Postgres, Edge Functions) with separate free-tier projects for staging and production.
- AI path: Hugging Face inference integration configured for best-effort generation; fallback to deterministic copy on failure.

### CI/CD Strategy

- PR CI pipeline:
- Install dependencies.
- Lint, typecheck, build.
- Block merges on failed checks.
- Staging deploy:
- Trigger on `staging` branch push.
- Apply migrations, deploy edge functions, deploy frontend.
- Production deploy:
- Manual `workflow_dispatch` after green CI.
- Deploy migrations/functions/frontend in controlled sequence.

### Security Hardening Requirements

- Production edge functions must enforce JWT verification and caller identity checks.
- `reset-assets` must not be publicly callable in production.
- Test unlock env-based behaviors must be removed or hard-disabled in production builds.
- Service role keys never exposed to frontend.
- RLS policies must enforce user-level access for profile/unlock/gallery/itinerary data.

### Observability

- Sentry (free Developer plan) for frontend/server runtime errors.
- Supabase logs for database and edge function diagnostics.
- Release tagging for deploy correlation.
- Alert policy via email for critical failure classes (auth failures, function 5xx spikes).

### Rollback Runbooks

Frontend Rollback:

1. Identify previous known-good Vercel deployment.
2. Promote/redeploy prior build.
3. Run smoke suite against rolled-back deployment.

Backend Function Rollback:

1. Re-deploy prior function version artifact/commit.
2. Verify auth and response schema compatibility.
3. Confirm error rates return to baseline.

Migration Rollback Pattern:

1. Use forward-fix migrations by default.
2. For severe data-impact incidents, apply pre-reviewed rollback migration script.
3. Validate row counts/integrity before reopening traffic.

## D. Ops Checklists

### Pre-Deploy Checklist

- [ ] All CI checks pass (lint/typecheck/build).
- [ ] Migration reviewed and reversible strategy documented.
- [ ] Edge function changes reviewed for auth and rate safety.
- [ ] Production config diff reviewed (env vars, flags, secrets).
- [ ] Changelog and rollback owner assigned.
- Go/No-Go Criterion: NO-GO if any item above is unchecked.

### Staging Signoff Checklist

- [ ] Auth login/signup (email + OAuth) verified.
- [ ] Onboarding/persona assignment verified.
- [ ] Landmark unlock + story display + gallery save verified.
- [ ] Local mode events render and open details.
- [ ] Itinerary CRUD + route rendering verified.
- [ ] No public reset/test unlock behavior visible in production config simulation.
- Go/No-Go Criterion: NO-GO if any critical user flow fails.

### Production Go-Live Checklist

- [ ] Manual release approval recorded.
- [ ] Deployment artifacts correspond to approved commit/tag.
- [ ] DB migrations applied successfully.
- [ ] Edge functions deployed and health-checked.
- [ ] Frontend deployment healthy and routed.
- [ ] Sentry and Supabase logging ingest confirmed.
- Go/No-Go Criterion: NO-GO if deploy telemetry or health checks are not green.

### Post-Deploy Smoke Checklist

- [ ] Public landing and authenticated entry load successfully.
- [ ] New user onboarding flow completes.
- [ ] Existing user profile and gallery data load correctly.
- [ ] Story generation path returns valid result or graceful fallback.
- [ ] Admin content operations restricted to authorized users only.
- [ ] Error rates and latency remain within expected baseline after 30 minutes.
- Go/No-Go Criterion: Immediate rollback if core auth/data path is broken or critical error rate persists.

## E. Cost Guardrails (Strict $0)

### Free-Tier-Safe Usage Policies

- Use only free tiers for Vercel, Supabase, Sentry, and GitHub Actions.
- No automatic paid plan upgrades or auto-enrollment in overage billing.
- Keep telemetry volume minimal and high-signal.
- Use cached/canned fallback for AI story generation when quota or provider reliability is constrained.
- Avoid heavy scheduled jobs and unnecessary background compute.

### Quota Monitoring Cadence

- Weekly: review platform dashboards for usage trends.
- Pre-release: confirm projected usage stays under free-tier thresholds.
- Post-release (first 72 hours): daily checks for spikes.

### Escalation Triggers

- Trigger A: sustained usage >80% of known free-tier quota.
- Trigger B: repeated throttling/rate-limit errors in user-critical flows.
- Trigger C: CI minute exhaustion impacting release cadence.

### Degradation Policy

- Fallback-first behavior required before considering paid upgrades.
- If AI generation fails or is throttled, return deterministic story fallback and continue user flow.
- If event freshness cannot be maintained from external sources, default to curated published set.
- Paid plan changes require explicit product and engineering approval decision, never automatic.

## F. Risk Register

| Risk | Impact | Likelihood | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Free-tier quota exhaustion (compute/storage/build minutes) | High | Medium | Weekly quota checks, conservative telemetry, fallback-first design, release throttling | Ops Lead |
| Geolocation permission denial/drop-off | Medium | High | Clear permission UX, map preview fallback, non-blocking guidance copy | Product + Frontend Lead |
| AI generation instability or provider throttling | Medium | Medium | Deterministic fallback script path, retry/backoff limits, cached assets | Backend Lead |
| Content freshness decay in local mode | Medium | Medium | Editorial curation cadence, publish workflow, stale-content review cycle | Content Ops Lead |
| Misconfigured function auth exposing privileged behavior | High | Medium | JWT enforcement tests, code review checklist, staging security smoke tests | Security Champion |
| Migration-related data regressions | High | Low | Reproducible migrations, forward-fix standard, rollback script readiness | Backend Lead |
| Production demo path accidentally enabled | High | Medium | Build-time env validation, CI assertion checks, pre-go-live config audit | Release Manager |

## G. Execution Sequence

### Ordered Implementation Steps

1. Stabilize core auth/onboarding/unlock/story/gallery flows and remove demo backdoors.
2. Introduce reproducible DB migrations, RLS audits, and production-safe function auth checks.
3. Add CI workflows for PR validation, staging deploys, and manual production release.
4. Implement curated local mode content model plus admin backoffice CRUD/publish.
5. Persist itinerary and deliver route + start-itinerary usability updates.
6. Implement light progression and basic share-link feature.
7. Complete PWA readiness, observability hardening, and beta gate validation.

### Cross-Team Dependencies and Critical Path

- Critical Path:
- Migration/RLS hardening -> function auth hardening -> CI/CD reliability -> go-live readiness.
- Feature teams depend on:
- Content schema availability for local mode and admin operations.
- Stable auth/session contracts for onboarding, sharing, and progress tracking.
- Ops team depends on:
- Instrumentation hooks and release metadata for monitoring and rollback execution.

### Definition of Done Milestones

MVP Done:

- Core exploration journey works end-to-end in production-safe configuration.
- Staging and production pipelines are reproducible and rollback-tested.
- Security non-negotiables satisfied (no public destructive/demo paths).

Public Beta Done:

- All MVP criteria plus local events, persisted itinerary, light progression, sharing, and PWA readiness.
- Operational checklists pass for at least one full release cycle.
- No unresolved P0/P1 defects in auth, data integrity, or core exploration path.

## H. Appendices

### Appendix H1 - Environment Variable Matrix

| Variable | Staging Frontend | Production Frontend | Staging Backend (Supabase Secrets) | Production Backend (Supabase Secrets) | Notes |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Required | N/A | N/A | Public URL for environment-specific Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Required | N/A | N/A | Public anon key only |
| `NEXT_PUBLIC_APP_ENV` | `staging` | `production` | N/A | N/A | Build/runtime environment label |
| `NEXT_PUBLIC_TEST_UNLOCK_IDS` | Optional (staging only) | Disabled | N/A | N/A | Must be absent/disabled in production |
| `NEXT_PUBLIC_TEST_UNLOCK_COUNT` | Optional (staging only) | Disabled | N/A | N/A | Must be absent/disabled in production |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Optional | N/A | N/A | Client-side Sentry ingest |
| `SENTRY_DSN` | Optional | Optional | N/A | N/A | Server-side Sentry ingest for Next.js runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | N/A | N/A | Required | Required | Backend-only secret; never client-exposed |
| `HUGGING_FACE_TOKEN` | N/A | N/A | Required | Required | Required for runtime generation path |

### Appendix H2 - Edge Function Inventory and Production Policy

| Function | Purpose | Production Policy | Auth Requirement | Notes |
| --- | --- | --- | --- | --- |
| `assign-persona` | Maps interests to persona | Enabled | JWT required | Validate request schema and user context |
| `prefetch-persona-assets` | Queues/sets initial asset status | Enabled | JWT required | Must not trust client `uid` blindly |
| `generate-story-script` | Generates story text (and optional media refs) | Enabled | JWT required | Fallback behavior required on provider failure |
| `reset-assets` | Demo reset of unlock/gallery/assets | Disabled in production | N/A (staging/admin only) | Never publicly exposed in production |

### Appendix H3 - Test Scenario Matrix

| Category | Scenario | Expected Result | Gate Level |
| --- | --- | --- | --- |
| Functional | New user onboarding from signup to first unlock | Completes without manual intervention | Release Blocking |
| Functional | Existing user loads profile, gallery, and itinerary | Correct data and no auth errors | Release Blocking |
| Functional | Local mode event display and detail modal | Published events render correctly | Release Blocking |
| Security | Unauthenticated call to production function | Rejected with auth error | Release Blocking |
| Security | Attempt to access reset path in production | Inaccessible/not deployed | Release Blocking |
| Security | Cross-user data access attempt | Blocked by RLS | Release Blocking |
| Reliability | Story generation provider timeout | Graceful fallback text returned | High Priority |
| Reliability | Temporary Supabase latency spike | UI remains usable with retries/fallback copy | High Priority |
| Rollback | Frontend rollback to prior deployment | Service restored and smoke checks pass | Release Blocking |
| Rollback | Function rollback after regression | Error rate returns to baseline | Release Blocking |
