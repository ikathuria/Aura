import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function prefetchPersonaAssets(payload: {
  uid: string;
  personaId: string;
  personaTitle: string;
}): Promise<void> {
  const useFunctions = process.env.NEXT_PUBLIC_USE_FUNCTIONS === 'true';
  if (!functions || !useFunctions) {
    console.info('[prefetchPersonaAssets] functions disabled; skipping.');
    return;
  }

  try {
    const callable = httpsCallable(functions, 'prefetchPersonaAssets');
    const result = await callable(payload);
    console.info('[prefetchPersonaAssets] result', result.data);
  } catch (error) {
    console.warn('[prefetchPersonaAssets] failed', error);
  }
}
