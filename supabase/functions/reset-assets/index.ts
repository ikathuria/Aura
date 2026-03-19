import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Clear user-specific data for a full reset (demo purpose)
    // In a real app, you'd filter by user_id if calling from a specific user
    const { error: error1 } = await supabaseClient.from('unlocks').delete().neq('landmarkId', '')
    const { error: error2 } = await supabaseClient.from('landmark_assets').delete().neq('landmarkId', '')
    const { error: error3 } = await supabaseClient.from('gallery').delete().neq('landmarkId', '')
    const { error: error4 } = await supabaseClient.from('asset_status').delete().neq('landmarkId', '')

    if (error1 || error2 || error3 || error4) {
      throw error1 || error2 || error3 || error4
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
