# Aura

**Aura** is a mobile-first, gamified city exploration app that unlocks cinematic, personalized micro-stories at Chicago landmarks. It replaces generic tours with AI-generated storytelling that adapts local history to a user's unique interests and assigned persona.

## Product Vision
Create a living, personalized map of Chicago where each landmark becomes a short, cinematic story tailored to who you are and what you care about.

## User Experience Flow
1. **Onboarding**: Select your interests. The app assigns a persona (e.g., "The Techie") and saves your profile to Supabase.
2. **Discovery**: Explore a map featuring Chicago landmarks.
3. **Unlocking**: Visit a landmark (within 50m) to unlock its story.
4. **Cinematic Reward**: An AI-generated, immersive story plays instantly, narrated through the lens of your persona.
5. **Gallery**: All unlocked stories are saved to your personal gallery.

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
Initialize your database by running the schema in the Supabase SQL Editor:
```sql
-- See supabase_schema.sql in the artifacts for the full script.
```

Set your Hugging Face Token in Supabase Secrets:
```bash
npx supabase secrets set HUGGING_FACE_TOKEN=your_token_here
```

Deploy the Edge Functions:
```bash
npx supabase functions deploy prefetch-persona-assets --no-verify-jwt
npx supabase functions deploy generate-story-script --no-verify-jwt
```

### 3) Frontend Setup
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_TEST_UNLOCK_IDS=cloud-gate,navy-pier
```

### 4) Run the App
```bash
# In the root directory
npm install
npm run dev
```

## AI Story Pipeline
1. When a landmark is clicked, the app checks if a personalized story exists in `landmark_assets`.
2. If missing, it triggers the `generate-story-script` Edge Function.
3. The function calls **Hugging Face (Mistral 7B)** to weave a 60-word immersive script based on the landmark's context and user's persona.
4. The result is saved to the database and played in the UI.

## Legacy Note
This project was migrated from a Google/Firebase stack (Vertex AI, Google Maps, Firestore) to its current open-source-first architecture to ensure sustainability and developer freedom.
