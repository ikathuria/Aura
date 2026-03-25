import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });
}

export function parseBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

export function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function requireUser(req: Request) {
  const token = parseBearerToken(req);
  if (!token) {
    return { error: jsonResponse({ error: 'Missing bearer token.' }, 401) };
  }
  const supabaseClient = createServiceClient();
  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: jsonResponse({ error: 'Unauthorized request.' }, 401) };
  }
  return { user: data.user, supabaseClient };
}

export function isProductionEnv() {
  const appEnv = (Deno.env.get('APP_ENV') || Deno.env.get('NEXT_PUBLIC_APP_ENV') || '').toLowerCase();
  return appEnv === 'production' || appEnv === 'prod';
}
