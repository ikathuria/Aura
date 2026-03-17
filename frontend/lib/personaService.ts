import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { InterestId } from './interests';
import { pickPersonaFromInterests } from './personas';

export async function assignPersona(interests: InterestId[]): Promise<{ personaId: string; personaTitle: string }> {
  const useFunctions = process.env.NEXT_PUBLIC_USE_FUNCTIONS === 'true';
  if (!functions || !useFunctions) {
    return pickPersonaFromInterests(interests);
  }

  try {
    const callable = httpsCallable(functions, 'assignPersona');
    const result = await callable({ interests });
    const data = result.data as { personaId?: string; personaTitle?: string };
    if (data?.personaId && data?.personaTitle) {
      return { personaId: data.personaId, personaTitle: data.personaTitle };
    }
  } catch (error) {
    console.warn('Persona function failed, using fallback.', error);
  }

  return pickPersonaFromInterests(interests);
}
