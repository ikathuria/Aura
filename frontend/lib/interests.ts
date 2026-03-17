export const INTERESTS = [
  { id: 'history', label: 'History', description: 'Deep dives into the past' },
  { id: 'art', label: 'Art', description: 'Galleries, murals, and sculpture' },
  { id: 'tech', label: 'Technology', description: 'Innovation and engineering' },
  { id: 'architecture', label: 'Architecture', description: 'Skyscrapers and design' },
  { id: 'food', label: 'Foodie', description: 'Culinary stories and places' },
  { id: 'sports', label: 'Sports', description: 'Teams, arenas, and legends' }
] as const;

export type InterestId = typeof INTERESTS[number]['id'];

export const DEFAULT_INTERESTS: InterestId[] = [];
