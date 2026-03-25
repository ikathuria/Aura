'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AssetStatus, Landmark, LocalEvent, AppMode } from '../types';

// Fix for default marker icons in Leaflet with Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png'
  });
}

interface MapViewProps {
  mode: AppMode;
  landmarks: Landmark[];
  events: LocalEvent[];
  unlockedIds: string[];
  userLocation: { lat: number; lng: number } | null;
  centerOverride?: { lat: number; lng: number } | null;
  assetStatuses: Record<string, AssetStatus>;
  itineraryRoute: [number, number][] | null;
  onLandmarkClick: (landmark: Landmark, isUnlocked: boolean) => void;
  onEventClick: (event: LocalEvent) => void;
  showMapError: (message: string | null) => void;
}

// Custom hook to handle map centering and bounds
const MapController: React.FC<{ center: [number, number]; landmarks: Landmark[]; centerOverride?: any }> = ({ center, landmarks, centerOverride }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (centerOverride) {
      map.setView(center, 13);
    }
  }, [center, centerOverride, map]);

  React.useEffect(() => {
    if (landmarks.length > 0 && !centerOverride) {
      const bounds = L.latLngBounds(landmarks.map(l => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [landmarks, centerOverride, map]);

  return null;
};

const createCustomIcon = (color: string, scale: number, opacity: number = 1, stroke: string = '#ffffff') => {
  const size = scale * 2;
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 20 20" style="display: block;">
        <circle cx="10" cy="10" r="8" fill="${color}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="2" />
      </svg>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

export const MapView: React.FC<MapViewProps> = ({
  mode,
  landmarks,
  events,
  unlockedIds,
  userLocation,
  centerOverride,
  assetStatuses,
  itineraryRoute,
  onLandmarkClick,
  onEventClick,
  showMapError
}) => {
  if (typeof window === 'undefined') return null;

  const center: [number, number] = centerOverride 
    ? [centerOverride.lat, centerOverride.lng]
    : userLocation 
    ? [userLocation.lat, userLocation.lng]
    : [41.882, -87.629];

  const userIcon = useMemo(() => createCustomIcon('#d4af37', 10), []);
  const queuedIcon = useMemo(() => createCustomIcon('#38bdf8', 8, 0.4, '#38bdf8'), []);
  const generatingIcon = useMemo(() => createCustomIcon('#f59e0b', 9, 0.7, '#fbbf24'), []);
  const readyIcon = useMemo(() => createCustomIcon('#d4af37', 12), []);
  const failedIcon = useMemo(() => createCustomIcon('#ef4444', 9), []);
  const lockedIcon = useMemo(() => createCustomIcon('#1f1f23', 8, 1, '#444444'), []);
  const eventIcon = useMemo(() => createCustomIcon('#a855f7', 10, 1, '#ffffff'), []);

  const mapKey = useMemo(() => `aura-map-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <div className="h-full w-full bg-[#0e0e10]">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapController center={center} landmarks={landmarks} centerOverride={centerOverride} />

        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
            <Circle 
              center={[userLocation.lat, userLocation.lng]} 
              radius={120}
              pathOptions={{
                color: '#d4af37',
                weight: 1,
                opacity: 0.4,
                fillColor: '#d4af37',
                fillOpacity: 0.08
              }}
            />
          </>
        )}

        {itineraryRoute && itineraryRoute.length > 1 && (
          <Polyline
            positions={itineraryRoute}
            pathOptions={{
              color: '#d4af37',
              weight: 4,
              opacity: 0.6,
              dashArray: '10, 10',
              lineCap: 'round'
            }}
          />
        )}

        {mode === 'tourist' && landmarks.map((landmark) => {
          const isUnlocked = unlockedIds.includes(landmark.id);
          const status = assetStatuses[landmark.id]?.status;
          const icon =
            status === 'ready'
              ? readyIcon
              : status === 'generating'
              ? generatingIcon
              : status === 'queued'
              ? queuedIcon
              : status === 'failed'
              ? failedIcon
              : isUnlocked
              ? readyIcon
              : lockedIcon;

          return (
            <React.Fragment key={landmark.id}>
              {(status === 'ready' || isUnlocked) && (
                <Circle
                  center={[landmark.lat, landmark.lng]}
                  radius={55}
                  pathOptions={{
                    color: '#d4af37',
                    weight: 1,
                    opacity: 0.5,
                    fillColor: '#d4af37',
                    fillOpacity: 0.12
                  }}
                />
              )}
              {status === 'generating' && (
                <Circle
                  center={[landmark.lat, landmark.lng]}
                  radius={75}
                  pathOptions={{
                    color: '#f59e0b',
                    weight: 1,
                    opacity: 0.6,
                    fillColor: '#f59e0b',
                    fillOpacity: 0.08
                  }}
                />
              )}
              <Marker
                position={[landmark.lat, landmark.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onLandmarkClick(landmark, isUnlocked)
                }}
              >
                <Popup>
                  <div className="space-y-0.5 p-1 min-w-[100px]">
                    <div className="text-xs font-semibold text-zinc-900">{landmark.name}</div>
                    <div className="text-[10px] text-zinc-700">
                      Status: {status || (isUnlocked ? 'ready' : 'locked')}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {mode === 'local' && events.map((event) => {
          return (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={eventIcon}
              eventHandlers={{
                click: () => onEventClick(event)
              }}
            >
              <Popup>
                <div className="space-y-0.5 p-1 min-w-[100px]">
                  <div className="text-xs font-semibold text-zinc-900">{event.name}</div>
                  <div className="text-[10px] text-zinc-700">
                    {new Date(event.startTime).toLocaleDateString()} - {event.type}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

