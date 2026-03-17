import type { InterestId } from './interests';

export const PERSONA_TEMPLATES = [
  { id: 'techie', title: 'The Techie' },
  { id: 'artist', title: 'The Artist' },
  { id: 'historian', title: 'The Historian' },
  { id: 'modernist', title: 'The Modernist' },
  { id: 'foodie', title: 'The Foodie' },
  { id: 'sportsfan', title: 'The Sports Fan' }
] as const;

export type PersonaId = typeof PERSONA_TEMPLATES[number]['id'];

export function pickPersonaFromInterests(interests: InterestId[]): { personaId: PersonaId; personaTitle: string } {
  const priority: InterestId[] = ['tech', 'art', 'history', 'architecture', 'food', 'sports'];
  const selected = priority.find((id) => interests.includes(id)) || 'history';
  switch (selected) {
    case 'tech':
      return { personaId: 'techie', personaTitle: 'The Techie' };
    case 'art':
      return { personaId: 'artist', personaTitle: 'The Artist' };
    case 'architecture':
      return { personaId: 'modernist', personaTitle: 'The Modernist' };
    case 'food':
      return { personaId: 'foodie', personaTitle: 'The Foodie' };
    case 'sports':
      return { personaId: 'sportsfan', personaTitle: 'The Sports Fan' };
    case 'history':
    default:
      return { personaId: 'historian', personaTitle: 'The Historian' };
  }
}
