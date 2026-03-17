# Windy City Whispers

Windy City Whispers is a mobile-first, gamified city exploration app that unlocks cinematic, personalized micro-stories at Chicago landmarks. It replaces generic tours with AI-generated, "sketch-to-reality" shorts that adapt local history to a user's interests.

**Product Vision**
Create a living, personalized map of Chicago where each landmark becomes a short, cinematic story tailored to who you are and what you care about.

## Vision Overview

**Core Idea**
Spatial RAG merges a user's interests with a landmark's historical context to generate a bespoke cinematic short (8 seconds, sketch-to-watercolor) with AI narration.

**User Experience Flow**
1. **Onboarding**: Pick interests. The app assigns a persona (e.g., "The Techie") and prefetches nearby landmark assets.
2. **Discovery**: Landmarks appear as fogged markers. Entering a geofence unlocks a landmark.
3. **Reward**: A full-screen cinematic plays with personalized narration, then saves to the gallery.
4. **Progression**: Badges unlock, hidden gems reveal after milestones.

## MVP Scope (What Ships First)

- Google Sign-in + interest selection
- Persona assignment and caching
- Chicago map with landmarks
- Geofence-based unlocks
- Cinematic playback + gallery storage
- Asset prefetch for nearby landmarks
- Status indicators per landmark (queued / generating / ready / failed)

## Phased Roadmap

**Phase 0: Prototype**
- Static map + demo markers
- Basic UI and onboarding

**Phase 1: MVP**
- Firebase Auth + Firestore
- Prefetch pipeline with queued jobs
- Status indicators and cinematic playback

**Phase 2: Production Beta**
- Hidden gems + badge progression
- Better map theming + accessibility
- Social sharing

**Phase 3: Scale**
- Multi-city support
- Paid personalization tiers
- Creator partnerships

## Architecture & Stack

- **Frontend**: Next.js 15 + Tailwind CSS + Framer Motion
- **Maps**: Google Maps JavaScript API
- **Auth**: Firebase Auth (Google + Email)
- **Database**: Firestore
- **Storage**: Firebase Storage (cached cinematic video/audio)
- **Functions**: Firebase Cloud Functions v2 (Node.js 24)
- **AI**:
  - Gemini (persona + script)
  - Veo 3.1 (video generation)
  - Google Cloud Text-to-Speech (audio narration)

## Data Model (Firestore)

- `users/{uid}`
- `users/{uid}/unlocks/{landmarkId}`
- `users/{uid}/gallery/{landmarkId}`
- `users/{uid}/assetStatus/{landmarkId}`
- `users/{uid}/logs/{logId}`
- `landmarks/{landmarkId}`
- `landmarks/{landmarkId}/assets/{personaId}`
- `videoJobs/{jobId}`

## AI Asset Pipeline

1. **Onboarding** triggers `assignPersona` callable.
2. **Prefetch** triggers `prefetchPersonaAssets` callable:
   - Creates `videoJobs` for the nearest or preferred landmarks.
3. **Firestore trigger** `processVideoJob`:
   - Generates video (Veo)
   - Generates narration (TTS)
   - Uploads outputs to Firebase Storage
   - Writes `landmarks/{landmarkId}/assets/{personaId}`
   - Updates `users/{uid}/assetStatus/{landmarkId}` to `ready`

Status values used on the map:
- `queued`
- `generating`
- `ready`
- `failed`

## Google Cloud + Firebase Setup

**Required APIs**
- Cloud Functions
- Cloud Build
- Artifact Registry
- Cloud Run
- Eventarc
- Pub/Sub
- Cloud Storage
- Vertex AI
- Cloud Text-to-Speech

**IAM (Service Account)**
The default compute service account is:
`119035514970-compute@developer.gserviceaccount.com`

Recommended roles:
- `roles/aiplatform.user`
- `roles/storage.objectAdmin`
- (Optional) `roles/texttospeech.user` if TTS permission errors appear

## Local Setup

### 1) Frontend environment variables
Create `C:\Users\ikath\OneDrive\GitHub\WinddyCityWhispers\frontend\.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_USE_FUNCTIONS=true
NEXT_PUBLIC_TEST_UNLOCK_IDS=cloud-gate,navy-pier
NEXT_PUBLIC_FUNCTIONS_EMULATOR=localhost:5001
NEXT_PUBLIC_FIRESTORE_LONG_POLLING=true
```

Remove `NEXT_PUBLIC_FUNCTIONS_EMULATOR` when using deployed functions.

### 2) Install dependencies

```
npm install
```

### 3) Run the frontend

```
npm run dev-frontend
```

### 4) Run Functions locally (optional)

```
npm run dev-functions
```

## Functions Runtime Environment

Set these for deployed functions or local emulation:

```
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
VEO_MODEL_ID=veo-3.1-generate-001
VEO_OUTPUT_BUCKET=your-firebase-storage-bucket
VEO_OUTPUT_PREFIX=cinematics
PREFETCH_LIMIT=10
PREFETCH_IDS=cloud-gate,navy-pier
TTS_LANGUAGE_CODE=en-US
TTS_VOICE_NAME=en-US-Neural2-D
TTS_AUDIO_ENCODING=MP3
```

## Deployment (Functions)

```
npm run deploy --prefix functions
```

If Eventarc or Pub/Sub permission errors appear, ensure the project IAM bindings are in place and retry after a few minutes.

## Testing Notes

- Landmark data falls back to a local seed list if Firestore is empty.
- Prefetch runs once per profile unless asset status documents are cleared.
- Chrome extension console errors can be ignored during local dev.

