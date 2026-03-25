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
    const requestedUid = body?.uid;
    const personaId = typeof body?.personaId === 'string' ? body.personaId : '';
    if (requestedUid && requestedUid !== user.id) {
      return jsonResponse({ error: 'Forbidden: caller UID mismatch.' }, 403);
    }
    if (!personaId) {
      return jsonResponse({ error: 'personaId is required.' }, 400);
    }

    const now = Date.now();
    const { error: statusError } = await supabaseClient
      .from('asset_status')
      .upsert({
        user_id: user.id,
        landmarkId: 'cloud-gate',
        personaId,
        status: 'queued',
        updatedAt: now
      }, {
        onConflict: 'user_id,landmarkId'
      });

    if (statusError) throw statusError;

    return jsonResponse({ success: true, queued: 1 }, 200);
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 400);
  }
});
