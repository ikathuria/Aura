# Aura - PR TEST

**Aura** is a mobile-first, gamified city exploration app that unlocks cinematic, personalized micro-stories at important city landmarks. Think Pokemon Go meets a personalized tour guide. It replaces generic tours with AI-generated storytelling that adapts local history to a user's unique interests and assigned persona.

## Product Vision
Create a living, personalized map of landmarks where each landmark becomes a short, cinematic story tailored to who you are and what you care about.

## User Experience Flow
1. **Onboarding**: Select your interests. The app assigns a persona (e.g., "The Techie") and saves your profile to Supabase.
2. **Discovery**: Explore a map featuring landmarks.
3. **Unlocking**: Visit a landmark (within 50m) to unlock its story.
4. **Cinematic Reward**: An AI-generated, immersive story plays instantly, narrated through the lens of your persona.
5. **Gallery**: All unlocked stories are saved to your personal gallery.

# TODO
1. Add a toggle for users to switch between tourist mode and local mode. In local mode, the user can explore current events happening around them
2. Add a day itinerary planner where user can select landmarks they want to visit and the app will create a itinerary for them based on best possible route based on where they are currently located and where all they want to go

## Tech Stack (Modern & Open-Source)
- **Frontend**: Next.js 15 + Tailwind CSS + Framer Motion
- **Maps**: Leaflet + OpenStreetMap (100% Free)
- **Backend & Auth**: Supabase (PostgreSQL + GoTrue)
- **AI Engine**: Hugging Face Inference API (Mistral 7B / Llama 3)
- **Edge Functions**: Supabase Edge Functions (Deno)

## Getting Started

### 1) Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed.
- [Hugging Face Token](https://huggingface.co/settings/tokens) (Free).

### 2) Supabase Setup
Use migration files for reproducible schema changes:
```bash
npx supabase db push
```

Core schema + RLS baseline migration:
- `supabase/migrations/20260325130000_core_schema_and_rls.sql`

RLS audit query (run in SQL editor when validating staging/prod):
- `supabase/audits/rls_audit.sql`

Content ops migration (events + admin backoffice RLS):
- `supabase/migrations/20260325170000_content_ops_admin.sql`

Set required Supabase secrets:
```bash
npx supabase secrets set HUGGING_FACE_TOKEN=your_token_here
npx supabase secrets set APP_ENV=staging
```
For production, set `APP_ENV=production` in the production Supabase project.

Deploy the Edge Functions:
```bash
npx supabase functions deploy assign-persona
npx supabase functions deploy prefetch-persona-assets
npx supabase functions deploy generate-story-script
npx supabase functions deploy reset-assets
```

Run function auth safety check before deploy:
```bash
npm run check:function-auth
```

### 3) Frontend Setup
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_ENV=staging
# Optional (staging/dev only)
# NEXT_PUBLIC_TEST_UNLOCK_IDS=cloud-gate,navy-pier
# NEXT_PUBLIC_TEST_UNLOCK_COUNT=1
```

### 4) Run the App
```bash
# In the root directory
npm install
npm run dev
```

## CI/CD Workflows

- `PR Validation` (`.github/workflows/pr-validation.yml`)
  - Triggers on pull requests to `main` and `staging`.
  - Runs lint, typecheck, function-auth checks, and production build.
- `Staging Deploy` (`.github/workflows/staging-deploy.yml`)
  - Triggers on push to `staging` and optional manual dispatch.
  - Runs validation first, then deploys migrations, edge functions, and frontend.
- `Production Release` (`.github/workflows/production-release.yml`)
  - Manual `workflow_dispatch` only with ref input.
  - Runs validation first, then deploys migrations, edge functions, and frontend.

Required GitHub repository secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF_STAGING`
- `SUPABASE_DB_PASSWORD_STAGING`
- `SUPABASE_PROJECT_REF_PRODUCTION`
- `SUPABASE_DB_PASSWORD_PRODUCTION`
- `NEXT_PUBLIC_SUPABASE_URL_STAGING`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING`
- `NEXT_PUBLIC_SUPABASE_URL_PRODUCTION`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY_PRODUCTION`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_STAGING`
- `VERCEL_PROJECT_ID_PRODUCTION`

## Admin Backoffice

- Route: `/admin`
- Access: authenticated users with `users.isAdmin = true`
- Scope: events/landmarks CRUD, publish/unpublish, soft delete, and action logs

Grant admin access to a user (run in SQL editor):

```sql
update public.users
set "isAdmin" = true
where id = (
  select id
  from auth.users
  where email = 'you@example.com'
  limit 1
);
```

## AI Story Pipeline
1. When a landmark is clicked, the app checks if a personalized story exists in `landmark_assets`.
2. If missing, it triggers the `generate-story-script` Edge Function.
3. The function calls **Hugging Face (Mistral 7B)** to weave a 60-word immersive script based on the landmark's context and user's persona.
4. The result is saved to the database and played in the UI.

## Legacy Note
This project was migrated from a Google/Firebase stack (Vertex AI, Google Maps, Firestore) to its current open-source-first architecture to ensure sustainability and developer freedom.
