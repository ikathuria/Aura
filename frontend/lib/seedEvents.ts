import type { LocalEvent } from '../types';

export const SEED_EVENTS: LocalEvent[] = [
  {
    id: 'chicago-jazz-fest',
    name: 'Chicago Jazz Festival',
    lat: 41.8826,
    lng: -87.6226,
    description: 'A multi-day celebration of jazz in Millennium Park.',
    type: 'festival',
    startTime: '2026-08-27T18:00:00Z'
  },
  {
    id: 'daley-center-market',
    name: 'Daley Center Farmers Market',
    lat: 41.8841,
    lng: -87.6302,
    description: 'Fresh produce and local goods in the heart of the Loop.',
    type: 'market',
    startTime: '2026-03-20T07:00:00Z'
  },
  {
    id: 'riverwalk-concert',
    name: 'Riverwalk Summer Music Series',
    lat: 41.8894,
    lng: -87.6257,
    description: 'Live music performances along the Chicago River.',
    type: 'concert',
    startTime: '2026-06-15T17:30:00Z'
  },
  {
    id: 'soldiers-field-match',
    name: 'Chicago Fire FC Match',
    lat: 41.8623,
    lng: -87.6167,
    description: 'Exciting MLS action at Soldier Field.',
    type: 'sports',
    startTime: '2026-03-22T19:00:00Z'
  },
  {
    id: 'art-institute-after-dark',
    name: 'Art Institute After Dark',
    lat: 41.8796,
    lng: -87.6237,
    description: 'Late-night gallery access with cocktails and music.',
    type: 'festival',
    startTime: '2026-04-10T20:00:00Z'
  }
];
