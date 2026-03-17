import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { GoogleAuth } from 'google-auth-library';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

initializeApp();
const db = getFirestore();
const storage = getStorage();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || process.env.VEO_LOCATION || 'us-central1';
const VEO_MODEL_ID = process.env.VEO_MODEL_ID || 'veo-3.1-generate-001';
const firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : null;
const ADMIN_DEFAULT_BUCKET = storage.bucket().name || '';
const DEFAULT_BUCKET = firebaseConfig?.storageBucket || ADMIN_DEFAULT_BUCKET || '';
let OUTPUT_BUCKET = (process.env.VEO_OUTPUT_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET || '').replace('gs://', '');

if (!OUTPUT_BUCKET && PROJECT_ID) {
  OUTPUT_BUCKET = `${PROJECT_ID}.appspot.com`;
}

const OUTPUT_PREFIX = process.env.VEO_OUTPUT_PREFIX || 'cinematics';
const PREFETCH_LIMIT = Number(process.env.PREFETCH_LIMIT || 10);
const PREFETCH_IDS = ['cloud-gate'];
const TTS_LANGUAGE_CODE = process.env.TTS_LANGUAGE_CODE || 'en-US';
const TTS_VOICE_NAME = process.env.TTS_VOICE_NAME || 'en-US-Neural2-D';
const TTS_AUDIO_ENCODING = process.env.TTS_AUDIO_ENCODING || 'MP3';

const personaMap = new Map([
  ['tech', { personaId: 'techie', personaTitle: 'The Techie' }],
  ['art', { personaId: 'artist', personaTitle: 'The Artist' }],
  ['history', { personaId: 'historian', personaTitle: 'The Historian' }],
  ['architecture', { personaId: 'modernist', personaTitle: 'The Modernist' }],
  ['food', { personaId: 'foodie', personaTitle: 'The Foodie' }],
  ['sports', { personaId: 'sportsfan', personaTitle: 'The Sports Fan' }]
]);

const personaStyleMap = {
  techie: {
    visual: 'Cyberpunk, futuristic, neon-drenched Chicago. Volumetric neon lights, high contrast, raindrops on lens.',
    camera: 'Fast tracking shot, drone-style flyby, smooth continuous motion.',
    lighting: 'Vibrant neon pink and cyan, atmospheric fog.',
    narration: 'The heartbeat of the city pulses in binary. {landmark} is more than steel and stone—it\'s the junction where data meets destiny.'
  },
  artist: {
    visual: 'Sketch-to-watercolor transition, impressionist style. Soft flowing textures, vibrant digital canvas.',
    camera: 'Slow dreamy pan, soft focus transitions, gentle drift.',
    lighting: 'Dappled sunlight, soft natural morning glow.',
    narration: 'A brushstroke in time. {landmark} dissolves into a symphony of color, where the city itself becomes the masterpiece.'
  },
  historian: {
    visual: 'Vintage 35mm film, grainy texture, slight sepia tint. Historical authenticity, timeless feel.',
    camera: 'Steady tripod feel, slow dramatic zoom-in, cinematic static framing.',
    lighting: 'Warm tungsten, long dramatic shadows, afternoon sun.',
    narration: 'The echoes of the past remain. {landmark} stands as a silent witness to a century of Chicago’s soul.'
  },
  modernist: {
    visual: 'Minimalist architectural photography, clean geometric lines, sharp focus. Industrial elegance.',
    camera: 'Low angle wide shot, symmetrical framing, rigid perspective.',
    lighting: 'Bright even daylight, sharp defined black shadows.',
    narration: 'Purity in form, power in function. {landmark} redefines the skyline with the unwavering rhythm of modern design.'
  },
  foodie: {
    visual: 'Macro culinary detail, rich saturated colors, steaming textures. Close-up on craftsmanship.',
    camera: 'Slow orbiting macro shot, shallow depth of field, creamy bokeh.',
    lighting: 'Warm inviting indoor glow, soft-box culinary lighting.',
    narration: 'A feast for the senses. Behind the architecture of {landmark} lies the true flavor of the Windy City.'
  },
  sportsfan: {
    visual: 'High energy, dynamic athletic motion, dust particles in light. Gritty, competitive atmosphere.',
    camera: 'Shaky hand-held style, fast whip pans, rapid focus pulls.',
    lighting: 'Stadium floodlights, strong backlighting, lens flare.',
    narration: 'The crowd roars. At {landmark}, the spirit of the game lives in every brick and every cheer.'
  }
};

const FALLBACK_LANDMARKS = [
  { id: 'cloud-gate', name: 'Cloud Gate (The Bean)', lat: 41.8827, lng: -87.6233, type: 'architecture' },
  { id: 'navy-pier', name: 'Navy Pier', lat: 41.8917, lng: -87.6073, type: 'entertainment' },
  { id: 'art-institute', name: 'Art Institute of Chicago', lat: 41.8796, lng: -87.6237, type: 'museum' },
  { id: 'willis-tower', name: 'Willis Tower', lat: 41.8789, lng: -87.6359, type: 'architecture' }
];

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const genai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: LOCATION
});

function assertConfig() {
  if (!PROJECT_ID) {
    throw new HttpsError('failed-precondition', 'GOOGLE_CLOUD_PROJECT is required.');
  }
  if (!OUTPUT_BUCKET) {
    throw new HttpsError('failed-precondition', 'VEO_OUTPUT_BUCKET (or FIREBASE_STORAGE_BUCKET) is required.');
  }
}

async function writeSynthesisLog(uid, message, meta = {}) {
  const logRef = db.collection('users').doc(uid).collection('logs').doc();
  await logRef.set({
    message,
    meta,
    createdAt: Date.now()
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGcsUri(uri) {
  if (!uri || !uri.startsWith('gs://')) return null;
  const parts = uri.replace('gs://', '').split('/');
  const bucket = parts.shift();
  const path = parts.join('/');
  return { bucket, path };
}

function buildFirebaseDownloadUrl(bucket, path, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function addDownloadToken(bucketName, path, contentType) {
  const token = crypto.randomUUID();
  const file = storage.bucket(bucketName).file(path);
  await file.setMetadata({
    contentType,
    metadata: {
      firebaseStorageDownloadTokens: token
    }
  });
  return buildFirebaseDownloadUrl(bucketName, path, token);
}

async function waitForFile(bucketName, path, attempts = 10) {
  const file = storage.bucket(bucketName).file(path);
  for (let i = 0; i < attempts; i += 1) {
    const [exists] = await file.exists();
    if (exists) return true;
    await sleep(3000);
  }
  return false;
}

async function synthesizeSpeech({ text, bucketName, path }) {
  const accessToken = await auth.getAccessToken();
  const token = typeof accessToken === 'string' ? accessToken : accessToken.token;
  if (!token) {
    throw new Error('Unable to acquire access token for TTS');
  }
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: TTS_LANGUAGE_CODE, name: TTS_VOICE_NAME },
      audioConfig: { audioEncoding: TTS_AUDIO_ENCODING }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (!data.audioContent) {
    throw new Error('TTS response missing audioContent');
  }

  const buffer = Buffer.from(data.audioContent, 'base64');
  const file = storage.bucket(bucketName).file(path);
  await file.save(buffer, {
    contentType: 'audio/mpeg'
  });

  return addDownloadToken(bucketName, path, 'audio/mpeg');
}

async function generateVideo({ prompt, outputUri }) {
  console.log('[generateVideo] start', {
    model: VEO_MODEL_ID,
    outputUri,
    location: LOCATION,
    project: PROJECT_ID
  });

  let operation = await genai.models.generateVideos({
    model: VEO_MODEL_ID,
    prompt,
    config: {
      aspectRatio: '9:16',
      outputGcsUri: outputUri
    }
  });

  while (!operation.done) {
    await sleep(15000);
    operation = await genai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    console.error('[generateVideo] operation error', operation.error);
    throw new Error(`Veo error: ${JSON.stringify(operation.error)}`);
  }

  const response = operation.response || {};
  console.log('[generateVideo] response summary', {
    responseKeys: Object.keys(response),
    generatedVideos: response.generatedVideos?.length || 0,
    outputUri: response.outputUri || response.videoUri || null
  });
  const candidate = response.generatedVideos?.[0];
  const uri =
    candidate?.video?.uri ||
    candidate?.video?.gcsUri ||
    candidate?.video?.fileUri ||
    candidate?.uri ||
    response.videoUri ||
    response.outputUri;

  if (uri) {
    console.log('[generateVideo] resolved uri', { uri });
    return uri;
  }

  // Fallback: list files under the output prefix if the API response omits the URI.
  const parsed = parseGcsUri(outputUri);
  if (parsed) {
    const prefix = parsed.path.endsWith('/') ? parsed.path : `${parsed.path}/`;
    const [files] = await storage.bucket(parsed.bucket).getFiles({ prefix });
    const videoFile = files.find((file) => file.name.endsWith('.mp4')) || files[0];
    console.log('[generateVideo] fallback list files', {
      bucket: parsed.bucket,
      prefix,
      count: files.length,
      sample: files.slice(0, 5).map((file) => file.name)
    });
    if (videoFile) {
      return `gs://${parsed.bucket}/${videoFile.name}`;
    }
  }

  throw new Error(`Veo did not return a video uri (response keys: ${Object.keys(response).join(', ')})`);
}

async function generateDetailedPrompt(landmarkName, personaId) {
  const style = personaStyleMap[personaId] || personaStyleMap.artist;
  
  const systemPrompt = `You are an expert cinematic prompt engineer for Veo, a high-end AI video generator. 
Your goal is to create a single, highly descriptive prompt (under 400 characters) for a 6-second vertical video of ${landmarkName} in Chicago.

REQUIRED FORMULA: 
Subject: ${landmarkName} in Chicago
Action: Describe a subtle, cinematic motion (e.g., "slow drift", "emerging from fog", "reflecting the sunset")
Scene: Detail the environment based on the persona's style.
Camera: Use professional camera movements (e.g., "dolly-in", "tracking shot", "low-angle pan")
Lighting: Specify mood and lighting.
Style: ${style.visual}

PERSONA STYLE CONTEXT:
- Visual Vibe: ${style.visual}
- Preferred Camera: ${style.camera}
- Preferred Lighting: ${style.lighting}

Generate ONLY the final prompt text. No quotes, no intro, no conversational filler.`;

  // @google/genai 1.18.0 uses genai.models.generateContent directly
  // Using gemini-2.5-flash as the latest stable model for us-central1
  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
  });

  const prompt = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Cinematic video of ' + landmarkName;
  console.log(`[generateDetailedPrompt] Generated for ${landmarkName} (${personaId}):`, prompt);
  return prompt;
}

export const resetAssets = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || request.data?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to reset assets.');
  }

  console.log('[resetAssets] starting reset for uid:', uid);
  const batch = db.batch();

  // 1. Delete assetStatus documents
  const statusSnap = await db.collection(`users/${uid}/assetStatus`).get();
  statusSnap.forEach((doc) => batch.delete(doc.ref));

  // 2. Delete relevant videoJobs
  const jobSnap = await db.collection('videoJobs').where('uid', '==', uid).get();
  jobSnap.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
  console.log('[resetAssets] reset complete for uid:', uid);
  return { success: true };
});

export const assignPersona = onCall({ cors: true }, async (request) => {
  const interests = Array.isArray(request.data?.interests) ? request.data.interests : [];
  const priority = ['tech', 'art', 'history', 'architecture', 'food', 'sports'];
  const matched = priority.find((interest) => interests.includes(interest));
  const fallback = { personaId: 'historian', personaTitle: 'The Historian' };
  console.log('[assignPersona] interests:', interests, 'matched:', matched);
  return personaMap.get(matched || '') || fallback;
});

export const getCinematicAsset = onCall({ cors: true }, async (request) => {
  const landmarkId = request.data?.landmarkId;
  const personaId = request.data?.personaId;
  if (!landmarkId || !personaId) {
    throw new HttpsError('invalid-argument', 'landmarkId and personaId are required');
  }

  const docRef = db.doc(`landmarks/${landmarkId}/assets/${personaId}`);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return { landmarkId, personaId, videoUrl: null, audioUrl: null, imageUrl: null, script: null, status: 'queued' };
  }

  return { landmarkId, personaId, ...snapshot.data() };
});

export const prefetchPersonaAssets = onCall({ cors: true }, async (request) => {
  assertConfig();
  const uid = request.auth?.uid || request.data?.uid;
  const personaId = request.data?.personaId;
  const personaTitle = request.data?.personaTitle || 'Explorer';
  if (!uid || !personaId) {
    throw new HttpsError('invalid-argument', 'uid and personaId are required');
  }

  console.log('[prefetchPersonaAssets] start', { uid, personaId });
  await writeSynthesisLog(uid, 'Starting cinematic prefetch', { personaId });

  const landmarkSnap = await db.collection('landmarks').get();
  const allLandmarks = landmarkSnap.empty
    ? FALLBACK_LANDMARKS
    : landmarkSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const landmarkById = new Map(allLandmarks.map((landmark) => [landmark.id, landmark]));
  const landmarks = PREFETCH_IDS.map((id) => landmarkById.get(id)).filter(Boolean);


  const batch = db.batch();
  const now = Date.now();
  landmarks.forEach((landmark) => {
    const statusRef = db.doc(`users/${uid}/assetStatus/${landmark.id}`);
    batch.set(
      statusRef,
      {
        personaId,
        status: 'queued',
        updatedAt: now
      },
      { merge: true }
    );

    const assetRef = db.doc(`landmarks/${landmark.id}/assets/${personaId}`);
    batch.set(
      assetRef,
      {
        personaId,
        status: 'queued',
        updatedAt: now
      },
      { merge: true }
    );

    const jobRef = db.doc(`videoJobs/${personaId}_${landmark.id}`);
    batch.set(
      jobRef,
      {
        uid,
        personaId,
        personaTitle,
        landmarkId: landmark.id,
        landmarkName: landmark.name || landmark.id,
        status: 'queued',
        createdAt: now
      },
      { merge: true }
    );
  });

  await batch.commit();
  await writeSynthesisLog(uid, 'Cinematic jobs queued', { count: landmarks.length, personaId });
  console.log('[prefetchPersonaAssets] queued', { count: landmarks.length });

  return { queued: landmarks.length };
});

export const processVideoJob = onDocumentCreated('videoJobs/{jobId}', async (event) => {
  assertConfig();
  const job = event.data?.data();
  if (!job) return;
  const { uid, personaId, personaTitle, landmarkId, landmarkName } = job;
  if (!uid || !personaId || !landmarkId) return;

  const jobRef = event.data.ref;
  const statusRef = db.doc(`users/${uid}/assetStatus/${landmarkId}`);
  const assetRef = db.doc(`landmarks/${landmarkId}/assets/${personaId}`);

  await jobRef.set({ status: 'generating', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await statusRef.set({ status: 'generating', updatedAt: Date.now(), personaId }, { merge: true });
  await assetRef.set({ status: 'generating', updatedAt: Date.now(), personaId }, { merge: true });
  await writeSynthesisLog(uid, 'Generating cinematic', { landmarkId, personaId });
  console.log('[processVideoJob] using bucket:', OUTPUT_BUCKET);

  try {
    const prompt = await generateDetailedPrompt(landmarkName, personaId);
    const style = personaStyleMap[personaId] || personaStyleMap.artist;
    
    const outputUri = `gs://${OUTPUT_BUCKET}/${OUTPUT_PREFIX}/${personaId}/${landmarkId}/${event.params.jobId}/`;
    console.log('[processVideoJob] veo request with AI prompt', { landmarkId, personaId, outputUri, prompt });
    
    const videoGcsUri = await generateVideo({ prompt, outputUri });
    console.log('[processVideoJob] veo output', { landmarkId, personaId, videoGcsUri });

    const parsed = parseGcsUri(videoGcsUri);
    if (!parsed) {
      throw new Error(`Unexpected video uri: ${videoGcsUri}`);
    }

    const exists = await waitForFile(parsed.bucket, parsed.path);
    if (!exists) {
      throw new Error(`Video file not found: ${videoGcsUri}`);
    }
    const videoUrl = await addDownloadToken(parsed.bucket, parsed.path, 'video/mp4');

    const script = style.narration.replace('{landmark}', landmarkName);
    const audioPath = `${OUTPUT_PREFIX}/${personaId}/${landmarkId}/${event.params.jobId}/narration.mp3`;
    const audioUrl = await synthesizeSpeech({ text: script, bucketName: OUTPUT_BUCKET, path: audioPath });

    await assetRef.set(
      {
        personaId,
        videoUrl,
        audioUrl,
        imageUrl: null,
        script,
        status: 'ready',
        updatedAt: Date.now()
      },
      { merge: true }
    );

    await statusRef.set({ status: 'ready', updatedAt: Date.now(), personaId }, { merge: true });
    await jobRef.set({ status: 'ready', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeSynthesisLog(uid, 'Cinematic ready', { landmarkId, personaId });
  } catch (error) {
    console.error('[processVideoJob] failed', error);
    await statusRef.set({ status: 'failed', updatedAt: Date.now(), personaId }, { merge: true });
    await assetRef.set({ status: 'failed', updatedAt: Date.now(), personaId }, { merge: true });
    await jobRef.set({ status: 'failed', error: String(error), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeSynthesisLog(uid, 'Cinematic failed', { landmarkId, personaId, error: String(error) });
  }
});
