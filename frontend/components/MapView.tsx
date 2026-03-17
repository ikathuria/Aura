'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, CircleF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';
import type { AssetStatus, Landmark } from '../types';

interface MapViewProps {
  landmarks: Landmark[];
  unlockedIds: string[];
  userLocation: { lat: number; lng: number } | null;
  centerOverride?: { lat: number; lng: number } | null;
  assetStatuses: Record<string, AssetStatus>;
  onLandmarkClick: (landmark: Landmark, isUnlocked: boolean) => void;
  showMapError: (message: string | null) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0e0e10' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0e10' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a7e66' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3b3b3b' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9a8c6a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1b1b1f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c1c20' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7e7260' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111319' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6b6b70' }] }
];

export const MapView: React.FC<MapViewProps> = ({
  landmarks,
  unlockedIds,
  userLocation,
  centerOverride,
  assetStatuses,
  onLandmarkClick,
  showMapError
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      showMapError('Missing Google Maps API key.');
    }
  }, [apiKey, showMapError]);

  useEffect(() => {
    if (loadError) {
      showMapError('Failed to load Google Maps.');
    }
  }, [loadError, showMapError]);

  useEffect(() => {
    if (apiKey && !loadError && isLoaded) {
      showMapError(null);
    }
  }, [apiKey, isLoaded, loadError, showMapError]);

  const center = centerOverride || userLocation || { lat: 41.882, lng: -87.629 };

  const userIcon = useMemo(() => {
    if (!isLoaded || !(window as any).google?.maps) return undefined;
    return {
      path: (window as any).google.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor: '#d4af37',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2
    };
  }, [isLoaded]);

  const queuedIcon = useMemo(() => {
    if (!isLoaded || !(window as any).google?.maps) return undefined;
    return {
      path: (window as any).google.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor: '#38bdf8',
      fillOpacity: 0.2,
      strokeColor: '#38bdf8',
      strokeWeight: 2
    };
  }, [isLoaded]);

  const generatingIcon = useMemo(() => {
    if (!isLoaded || !(window as any).google?.maps) return undefined;
    return {
      path: (window as any).google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: '#f59e0b',
      fillOpacity: 0.7,
      strokeColor: '#fbbf24',
      strokeWeight: 2
    };
  }, [isLoaded]);

  const readyIcon = useMemo(() => {
    if (!isLoaded || !(window as any).google?.maps) return undefined;
    return {
      path: (window as any).google.maps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: '#d4af37',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2
    };
  }, [isLoaded]);

  const failedIcon = useMemo(() => {
    if (!isLoaded || !(window as any).google?.maps) return undefined;
    return {
      path: (window as any).google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: '#ef4444',
      fillOpacity: 0.9,
      strokeColor: '#ffffff',
      strokeWeight: 1
    };
  }, [isLoaded]);

  const lockedIcon = useMemo(() => {
    if (!isLoaded || !(window as any).google?.maps) return undefined;
    return {
      path: (window as any).google.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor: '#1f1f23',
      fillOpacity: 1,
      strokeColor: '#444444',
      strokeWeight: 1
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || landmarks.length === 0 || centerOverride) return;
    const bounds = new google.maps.LatLngBounds();
    landmarks.forEach((landmark) => bounds.extend({ lat: landmark.lat, lng: landmark.lng }));
    mapRef.current.fitBounds(bounds, 80);
  }, [isLoaded, landmarks, centerOverride]);

  return (
    <div className="h-full w-full">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
          options={{
            disableDefaultUI: true,
            styles: mapStyles,
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          }}
          onLoad={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
        >
          {userLocation && (
            <>
              <MarkerF position={userLocation} icon={userIcon} />
              <CircleF
                center={userLocation}
                radius={120}
                options={{
                  strokeColor: '#d4af37',
                  strokeOpacity: 0.4,
                  strokeWeight: 1,
                  fillColor: '#d4af37',
                  fillOpacity: 0.08
                }}
              />
            </>
          )}

          {landmarks.map((landmark) => {
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
                  <CircleF
                    center={{ lat: landmark.lat, lng: landmark.lng }}
                    radius={55}
                    options={{
                      strokeColor: '#d4af37',
                      strokeOpacity: 0.5,
                      strokeWeight: 1,
                      fillColor: '#d4af37',
                      fillOpacity: 0.12
                    }}
                  />
                )}
                {status === 'generating' && (
                  <CircleF
                    center={{ lat: landmark.lat, lng: landmark.lng }}
                    radius={75}
                    options={{
                      strokeColor: '#f59e0b',
                      strokeOpacity: 0.6,
                      strokeWeight: 1,
                      fillColor: '#f59e0b',
                      fillOpacity: 0.08
                    }}
                  />
                )}
                <MarkerF
                  position={{ lat: landmark.lat, lng: landmark.lng }}
                  icon={icon}
                  onClick={() => onLandmarkClick(landmark, isUnlocked)}
                  onMouseOver={() => setHoveredId(landmark.id)}
                  onMouseOut={() => setHoveredId((current) => (current === landmark.id ? null : current))}
                />
                {hoveredId === landmark.id && (
                  <InfoWindowF
                    position={{ lat: landmark.lat, lng: landmark.lng }}
                    options={{ pixelOffset: new google.maps.Size(0, -18) }}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-zinc-900">{landmark.name}</div>
                      <div className="text-[10px] text-zinc-700">
                        Status: {status || (isUnlocked ? 'ready' : 'locked')}
                      </div>
                    </div>
                  </InfoWindowF>
                )}
              </React.Fragment>
            );
          })}
        </GoogleMap>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-zinc-400">
          Loading map...
        </div>
      )}
    </div>
  );
};
