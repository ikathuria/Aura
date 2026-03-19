import { supabase } from './supabase';
import type { InterestId } from './interests';
import { pickPersonaFromInterests } from './personas';

export async function assignPersona(interests: InterestId[]): Promise<{ personaId: string; personaTitle: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('assign-persona', {
      body: { interests }
    });
    
    if (error) throw error;
    
    if (data?.personaId && data?.personaTitle) {
      return { personaId: data.personaId, personaTitle: data.personaTitle };
    }
  } catch (error) {
    console.warn('Persona function failed, using fallback.', error);
  }

  return pickPersonaFromInterests(interests);
}
