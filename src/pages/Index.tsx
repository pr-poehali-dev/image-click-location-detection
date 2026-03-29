import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';

interface LocationRecord {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  timestamp: Date;
}

type TabType = 'map' | 'coords' | 'history';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    L: any;
  }
}

const API_URL = 'https://functions.poehali.dev/a66bf5af-8f3c-4db6-86e4-c657b0011f0c';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [location, setLocation] = useState<LocationRecord | null>(null);
  const [history, setHistory] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tracking, setTracking] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

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
    setMapReady(true);
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается браузером');
      return;
    }
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const record: LocationRecord = {
          id: Date.now().toString(),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          altitude: pos.coords.altitude,
          timestamp: new Date(),
        };
        setLocation(record);
        setHistory((prev) => [record, ...prev].slice(0, 20));
        setLoading(false);
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: record.lat, lng: record.lng, accuracy: record.accuracy, altitude: record.altitude }),
        })
          .then((r) => r.json())
          .then((saved) => {
            if (saved.id) {
              setHistory((prev) =>
                prev.map((r) => (r.id === record.id ? { ...r, id: saved.id } : r))
              );
            }
          })
          .catch(() => {});
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case 1: setError('Доступ к геолокации запрещён'); break;
          case 2: setError('Невозможно определить местоположение'); break;
          case 3: setError('Превышено время ожидания'); break;
          default: setError('Неизвестная ошибка');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
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
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    if (tracking) {
      intervalRef.current = setInterval(() => {
        getLocation();
      }, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tracking, getLocation]);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        if (data.locations?.length) {
          const records: LocationRecord[] = data.locations.map((l: {
            id: string; lat: number; lng: number; accuracy: number; altitude: number | null; timestamp: string;
          }) => ({
            id: l.id,
            lat: l.lat,
            lng: l.lng,
            accuracy: l.accuracy,
            altitude: l.altitude,
            timestamp: new Date(l.timestamp),
          }));
          setHistory(records);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapReady || !location || !mapInstanceRef.current) return;
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
  }, [location, mapReady]);

  const formatCoord = (val: number, isLat: boolean) => {
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const minFull = (abs - deg) * 60;
    const min = Math.floor(minFull);
    const sec = ((minFull - min) * 60).toFixed(3);
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    return `${deg}°${min}'${sec}"${dir}`;
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatDate = (d: Date) =>
    d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'map', label: 'Карта', icon: 'Map' },
    { id: 'coords', label: 'Координаты', icon: 'Crosshair' },
    { id: 'history', label: 'История', icon: 'Clock' },
  ];

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--app-bg)', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--app-border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: 'var(--app-accent-dim)', border: '1px solid rgba(0,212,255,0.3)' }}
          >
            <Icon name="Locate" size={14} style={{ color: 'var(--app-accent)' }} />
          </div>
          <span
            className="text-sm font-medium tracking-widest uppercase"
            style={{ color: 'var(--app-accent)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.15em' }}
          >
            GeoPoint
          </span>
        </div>
        <div className="flex items-center gap-3">
          {location && (
            <div className="flex items-center gap-2">
              <div
                className={tracking ? 'w-1.5 h-1.5 rounded-full animate-blink' : 'w-1.5 h-1.5 rounded-full'}
                style={{ background: tracking ? 'var(--app-green)' : 'var(--app-text-muted)' }}
              />
              <span className="text-xs" style={{ color: 'var(--app-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                ±{location.accuracy}м
              </span>
            </div>
          )}
          <button
            onClick={() => setTracking((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all duration-200"
            style={{
              background: tracking ? 'rgba(0,255,136,0.1)' : 'rgba(90,99,112,0.15)',
              border: tracking ? '1px solid rgba(0,255,136,0.3)' : '1px solid var(--app-border)',
              color: tracking ? 'var(--app-green)' : 'var(--app-text-muted)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <Icon name={tracking ? 'Pause' : 'Play'} size={11} />
            {tracking ? '5с' : 'стоп'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--app-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-all duration-200"
            style={{
              color: activeTab === tab.id ? 'var(--app-accent)' : 'var(--app-text-muted)',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '1px solid var(--app-accent)' : '1px solid transparent',
              marginBottom: '-1px',
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.05em',
            }}
          >
            <Icon name={tab.icon} size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">

        {/* MAP TAB */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
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

        {/* COORDS TAB */}
        {activeTab === 'coords' && (
          <div className="h-full overflow-y-auto p-5">
            {location ? (
              <div className="space-y-3 animate-fade-slide">
                {[
                  { label: 'ШИРОТА', value: location.lat.toFixed(8), sub: formatCoord(location.lat, true), icon: 'ArrowUpDown' },
                  { label: 'ДОЛГОТА', value: location.lng.toFixed(8), sub: formatCoord(location.lng, false), icon: 'ArrowLeftRight' },
                  { label: 'ТОЧНОСТЬ', value: `±${location.accuracy} м`, sub: location.accuracy < 10 ? 'Высокая точность GPS' : location.accuracy < 50 ? 'Средняя точность' : 'Низкая точность', icon: 'Target' },
                  ...(location.altitude !== null ? [{ label: 'ВЫСОТА', value: `${Math.round(location.altitude ?? 0)} м`, sub: 'над уровнем моря', icon: 'Mountain' }] : []),
                  { label: 'ВРЕМЯ ФИКСАЦИИ', value: formatTime(location.timestamp), sub: formatDate(location.timestamp), icon: 'Clock' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-4 rounded"
                    style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name={item.icon} size={12} style={{ color: 'var(--app-text-muted)' }} />
                      <span className="text-xs tracking-widest" style={{ color: 'var(--app-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {item.label}
                      </span>
                    </div>
                    <div className="text-xl font-medium mb-0.5" style={{ color: 'var(--app-text)', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {item.value}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{item.sub}</div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const text = `${location.lat.toFixed(8)}, ${location.lng.toFixed(8)}`;
                    navigator.clipboard.writeText(text);
                  }}
                  className="w-full py-3 rounded text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
                  style={{
                    background: 'var(--app-accent-dim)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    color: 'var(--app-accent)',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  <Icon name="Copy" size={14} />
                  Скопировать координаты
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center animate-fade-slide">
                <Icon name="Crosshair" size={40} style={{ color: 'var(--app-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
                <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>Нет данных</p>
                <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)', opacity: 0.5 }}>Определите местоположение</p>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="h-full overflow-y-auto p-5">
            {history.length > 0 ? (
              <div className="space-y-2 animate-fade-slide">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--app-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    Записей: {history.length}
                  </span>
                  <button
                    onClick={() => {
                      fetch(API_URL, { method: 'DELETE' }).catch(() => {});
                      setHistory([]);
                      setLocation(null);
                    }}
                    className="text-xs transition-colors duration-200"
                    style={{ color: 'var(--app-text-muted)' }}
                  >
                    Очистить
                  </button>
                </div>
                {history.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => { setLocation(rec); setActiveTab('map'); }}
                    className="w-full p-4 rounded text-left transition-all duration-200 hover:scale-[1.01]"
                    style={{
                      background: rec.id === location?.id ? 'var(--app-accent-dim)' : 'var(--app-surface)',
                      border: rec.id === location?.id ? '1px solid rgba(0,212,255,0.4)' : '1px solid var(--app-border)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: rec.id === location?.id ? 'var(--app-accent)' : 'var(--app-text-muted)',
                        }}
                      >
                        {formatTime(rec.timestamp)} · {formatDate(rec.timestamp)}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: rec.accuracy < 10 ? 'rgba(0,255,136,0.1)' : 'rgba(90,99,112,0.2)',
                          color: rec.accuracy < 10 ? 'var(--app-green)' : 'var(--app-text-muted)',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        ±{rec.accuracy}м
                      </span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--app-text)', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {rec.lat.toFixed(6)}, {rec.lng.toFixed(6)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center animate-fade-slide">
                <Icon name="Clock" size={40} style={{ color: 'var(--app-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
                <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>История пуста</p>
                <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)', opacity: 0.5 }}>Записи появятся после определения</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error bar */}
      {error && (
        <div
          className="mx-4 mb-3 px-4 py-3 rounded flex items-center gap-3 animate-fade-slide"
          style={{ background: 'rgba(255,68,85,0.1)', border: '1px solid rgba(255,68,85,0.3)' }}
        >
          <Icon name="AlertCircle" size={14} style={{ color: 'var(--app-red)', flexShrink: 0 }} />
          <span className="text-xs" style={{ color: 'var(--app-red)' }}>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto" style={{ color: 'var(--app-red)', opacity: 0.6 }}>
            <Icon name="X" size={12} />
          </button>
        </div>
      )}

      {/* Main CTA button */}
      <div className="px-4 pb-5 shrink-0">
        <button
          onClick={getLocation}
          disabled={loading}
          className="w-full py-4 rounded flex items-center justify-center gap-3 text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading ? 'var(--app-surface-2)' : 'var(--app-accent)',
            color: loading ? 'var(--app-text-muted)' : '#000',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.05em',
          }}
        >
          {loading ? (
            <>
              <Icon name="Loader" size={16} className="animate-spin" />
              Определяю...
            </>
          ) : (
            <>
              <Icon name="Locate" size={16} />
              {location ? 'Обновить координаты' : 'Определить местоположение'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
