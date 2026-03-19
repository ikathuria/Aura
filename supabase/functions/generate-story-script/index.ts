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
    const HUGGING_FACE_TOKEN = Deno.env.get('HUGGING_FACE_TOKEN')
    if (!HUGGING_FACE_TOKEN) throw new Error('HUGGING_FACE_TOKEN not set')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { landmarkId, personaId } = await req.json()

    // 1. Fetch landmark details
    const { data: landmark } = await supabaseClient
      .from('landmarks')
      .select('*')
      .eq('id', landmarkId)
      .single()

    if (!landmark) throw new Error('Landmark not found')

    // 2. Generate script using Llama 3/Mistral via Hugging Face
    const prompt = `[INST] You are ${personaId}, a specialized tour guide. Tell a short (60-word), fascinating story about ${landmark.name}. Context: ${landmark.description}. [/INST]`

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
      {
        headers: { Authorization: `Bearer ${HUGGING_FACE_TOKEN}`, "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    )

    const hfData = await hfResponse.json()
    const script = hfData[0]?.generated_text?.split('[/INST]')?.[1]?.trim() || hfData[0]?.generated_text || "A fascinating story awaits..."

    // 3. Update assets (using camelCase columns)
    const { error: assetError } = await supabaseClient
      .from('landmark_assets')
      .upsert({
        landmarkId: landmarkId,
        personaId: personaId,
        script: script,
        videoUrl: '/demo-bean.mp4',
        audioUrl: '/demo-bean.mp3',
        status: 'ready'
      })

    if (assetError) throw assetError

    return new Response(JSON.stringify({ success: true, script }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
