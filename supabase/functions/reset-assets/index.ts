import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, isProductionEnv, jsonResponse, requireUser } from '../_shared/http.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (isProductionEnv()) {
    return jsonResponse({ error: 'reset-assets is disabled in production.' }, 403);
  }

  const auth = await requireUser(req);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { user, supabaseClient } = auth;

    const { error: unlockError } = await supabaseClient.from('unlocks').delete().eq('user_id', user.id);
    const { error: galleryError } = await supabaseClient.from('gallery').delete().eq('user_id', user.id);
    const { error: statusError } = await supabaseClient.from('asset_status').delete().eq('user_id', user.id);

    if (unlockError || galleryError || statusError) {
      throw unlockError || galleryError || statusError;
    }

    return jsonResponse({ success: true }, 200);
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 400);
  }
});
