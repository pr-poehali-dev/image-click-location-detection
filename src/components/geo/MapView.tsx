/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { LocationRecord } from './types';

declare global {
  interface Window {
    L: any;
  }
}

interface MapViewProps {
  location: LocationRecord | null;
  loading: boolean;
  activeMap: boolean;
}

export default function MapView({ location, loading, activeMap }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const mapReadyRef = useRef(false);

  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current || !window.L) return;

    const map = window.L.map(mapRef.current, {
      center: [55.7558, 37.6176],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    mapReadyRef.current = true;
  }, []);

  useEffect(() => {
    const checkLeaflet = setInterval(() => {
      if (window.L) {
        clearInterval(checkLeaflet);
        initMap();
      }
    }, 100);
    return () => clearInterval(checkLeaflet);
  }, [initMap]);

  useEffect(() => {
    if (!mapReadyRef.current || !location || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const L = window.L;

    if (markerRef.current) map.removeLayer(markerRef.current);
    if (circleRef.current) map.removeLayer(circleRef.current);

    const icon = L.divIcon({
      className: '',
      html: '<div class="geo-marker"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    markerRef.current = L.marker([location.lat, location.lng], { icon }).addTo(map);
    circleRef.current = L.circle([location.lat, location.lng], {
      radius: location.accuracy,
      color: 'rgba(0, 212, 255, 0.6)',
      fillColor: 'rgba(0, 212, 255, 0.05)',
      fillOpacity: 1,
      weight: 1,
    }).addTo(map);

    map.flyTo([location.lat, location.lng], Math.max(15, map.getZoom()), { duration: 1.2 });
  }, [location]);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-300 ${activeMap ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div ref={mapRef} className="w-full h-full" />

      {!location && !loading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,12,15,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center animate-fade-slide">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ border: '1px solid var(--app-border)', background: 'var(--app-surface)' }}
            >
              <Icon name="MapPin" size={28} style={{ color: 'var(--app-text-muted)' }} />
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--app-text-muted)' }}>Местоположение не определено</p>
            <p className="text-xs" style={{ color: 'var(--app-text-muted)', opacity: 0.5 }}>Нажмите кнопку ниже</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,12,15,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center animate-fade-slide">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 relative overflow-hidden"
              style={{ border: '1px solid rgba(0,212,255,0.3)', background: 'var(--app-surface)' }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, transparent, rgba(0,212,255,0.15), transparent)',
                  animation: 'scanLine 1.5s linear infinite',
                }}
              />
              <Icon name="Satellite" size={24} style={{ color: 'var(--app-accent)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--app-accent)', fontFamily: "'IBM Plex Mono', monospace" }}>
              Поиск сигнала...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
