import { supabase } from './supabase';

export async function prefetchPersonaAssets(payload: {
  uid: string;
  personaId: string;
  personaTitle: string;
}): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('prefetch-persona-assets', {
      body: payload
    });
    
    if (error) throw error;
    console.info('[prefetchPersonaAssets] result', data);
  } catch (error) {
    console.warn('[prefetchPersonaAssets] failed', error);
  }
}

export async function generateStoryScript(landmarkId: string, personaId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-story-script', {
      body: { landmarkId, personaId }
    });
    
    if (error) throw error;
    return data.script;
  } catch (error) {
    console.warn('[generateStoryScript] failed', error);
    return null;
  }
}
