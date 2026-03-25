import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, jsonResponse, requireUser } from '../_shared/http.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { user, supabaseClient } = auth;
    const body = await req.json();
    const landmarkId = typeof body?.landmarkId === 'string' ? body.landmarkId : '';
    const personaId = typeof body?.personaId === 'string' ? body.personaId : '';
    if (!landmarkId || !personaId) {
      return jsonResponse({ error: 'landmarkId and personaId are required.' }, 400);
    }

    const now = Date.now();
    await supabaseClient.from('asset_status').upsert({
      user_id: user.id,
      landmarkId,
      personaId,
      status: 'generating',
      updatedAt: now
    }, {
      onConflict: 'user_id,landmarkId'
    });

    const { data: landmark } = await supabaseClient
      .from('landmarks')
      .select('*')
      .eq('id', landmarkId)
      .single();

    if (!landmark) throw new Error('Landmark not found');

    const fallbackScript = `You arrive at ${landmark.name} as ${personaId}. ${landmark.description || 'The city keeps this story alive in every corner.'}`;
    const HUGGING_FACE_TOKEN = Deno.env.get('HUGGING_FACE_TOKEN');
    let script = fallbackScript;

    if (HUGGING_FACE_TOKEN) {
      try {
        const prompt = `[INST] You are ${personaId}, a specialized tour guide. Tell a short (60-word), fascinating story about ${landmark.name}. Context: ${landmark.description || 'No additional context available.'}. [/INST]`;
        const hfResponse = await fetch(
          'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
          {
            headers: {
              Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({ inputs: prompt })
          }
        );
        if (hfResponse.ok) {
          const hfData = await hfResponse.json();
          const candidate =
            hfData?.[0]?.generated_text?.split?.('[/INST]')?.[1]?.trim?.() ||
            hfData?.[0]?.generated_text;
          if (typeof candidate === 'string' && candidate.trim()) {
            script = candidate.trim();
          }
        }
      } catch (_error) {
        // Keep deterministic fallback script.
      }
    }

    const { error: assetError } = await supabaseClient
      .from('landmark_assets')
      .upsert({
        landmarkId,
        personaId,
        script,
        videoUrl: null,
        audioUrl: null,
        imageUrl: null,
        status: 'ready'
      }, {
        onConflict: 'landmarkId,personaId'
      });

    if (assetError) throw assetError;

    await supabaseClient.from('asset_status').upsert({
      user_id: user.id,
      landmarkId,
      personaId,
      status: 'ready',
      updatedAt: Date.now()
    }, {
      onConflict: 'user_id,landmarkId'
    });

    return jsonResponse({ success: true, script }, 200);
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 400);
  }
});
