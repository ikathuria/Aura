import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, jsonResponse, requireUser } from '../_shared/http.ts';

const personaMap = new Map([
  ['tech', { personaId: 'techie', personaTitle: 'The Techie' }],
  ['art', { personaId: 'artist', personaTitle: 'The Artist' }],
  ['history', { personaId: 'historian', personaTitle: 'The Historian' }],
  ['architecture', { personaId: 'modernist', personaTitle: 'The Modernist' }],
  ['food', { personaId: 'foodie', personaTitle: 'The Foodie' }],
  ['sports', { personaId: 'sportsfan', personaTitle: 'The Sports Fan' }]
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json();
    const interests = Array.isArray(body?.interests) ? body.interests : [];
    const priority = ['tech', 'art', 'history', 'architecture', 'food', 'sports'];
    const matched = priority.find((interest) => interests.includes(interest));
    const fallback = { personaId: 'historian', personaTitle: 'The Historian' };
    const result = personaMap.get(matched || '') || fallback;

    return jsonResponse(result, 200);
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 400);
  }
});
