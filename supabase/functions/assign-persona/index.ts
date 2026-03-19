import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const personaMap = new Map([
  ['tech', { personaId: 'techie', personaTitle: 'The Techie' }],
  ['art', { personaId: 'artist', personaTitle: 'The Artist' }],
  ['history', { personaId: 'historian', personaTitle: 'The Historian' }],
  ['architecture', { personaId: 'modernist', personaTitle: 'The Modernist' }],
  ['food', { personaId: 'foodie', personaTitle: 'The Foodie' }],
  ['sports', { personaId: 'sportsfan', personaTitle: 'The Sports Fan' }]
]);

serve(async (req) => {
  // Add CORS preflight support
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { interests } = await req.json()
    const priority = ['tech', 'art', 'history', 'architecture', 'food', 'sports']
    const matched = priority.find((interest) => interests.includes(interest))
    const fallback = { personaId: 'historian', personaTitle: 'The Historian' }
    
    const result = personaMap.get(matched || '') || fallback

    return new Response(JSON.stringify(result), {
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
