import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import MapView from '@/components/geo/MapView';
import CoordsTab from '@/components/geo/CoordsTab';
import HistoryTab from '@/components/geo/HistoryTab';
import { LocationRecord, TabType, API_URL } from '@/components/geo/types';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [location, setLocation] = useState<LocationRecord | null>(null);
  const [history, setHistory] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(true);
  const [locMethod, setLocMethod] = useState<'ip' | 'gps'>('ip');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveRecord = useCallback((record: LocationRecord) => {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: record.lat, lng: record.lng, accuracy: record.accuracy, altitude: record.altitude }),
    })
      .then((r) => r.json())
      .then((saved) => {
        if (saved.id) {
          setHistory((prev) => prev.map((r) => (r.id === record.id ? { ...r, id: saved.id } : r)));
        }
      })
      .catch(() => {});
  }, []);

  const getLocationByIp = useCallback(() => {
    setLoading(true);
    setError(null);
    setLocMethod('ip');

    fetch(`${API_URL}/ip`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.lat) throw new Error('IP lookup failed');
        const record: LocationRecord = {
          id: Date.now().toString(),
          lat: data.lat,
          lng: data.lon,
          accuracy: 5000,
          altitude: null,
          timestamp: new Date(),
        };
        setLocation(record);
        setHistory((prev) => [record, ...prev].slice(0, 20));
        setLoading(false);
        saveRecord(record);
      })
      .catch(() => {
        setLoading(false);
        setError('Не удалось определить по IP');
      });
  }, [saveRecord]);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается браузером');
      return;
    }
    setLoading(true);
    setError(null);
    setLocMethod('gps');

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
        saveRecord(record);
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
  }, [saveRecord]);

  useEffect(() => {
    getLocationByIp();
  }, [getLocationByIp]);

  useEffect(() => {
    if (tracking) {
      intervalRef.current = setInterval(() => {
        getLocationByIp();
      }, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tracking, getLocationByIp]);

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
                {locMethod === 'ip' ? '~город' : `±${location.accuracy}м`}
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
        <MapView location={location} loading={loading} activeMap={activeTab === 'map'} />

        {activeTab === 'coords' && (
          <CoordsTab location={location} locMethod={locMethod} />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            history={history}
            location={location}
            onSelect={(rec) => { setLocation(rec); setActiveTab('map'); }}
            onClear={() => { setHistory([]); setLocation(null); }}
          />
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

      {/* Buttons */}
      <div className="px-4 pb-5 shrink-0 flex flex-col gap-2">
        {location && (
          <div className="flex items-center justify-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                background: locMethod === 'ip' ? 'rgba(90,99,112,0.2)' : 'rgba(0,212,255,0.1)',
                color: locMethod === 'ip' ? 'var(--app-text-muted)' : 'var(--app-accent)',
                fontFamily: "'IBM Plex Mono', monospace",
                border: locMethod === 'ip' ? '1px solid var(--app-border)' : '1px solid rgba(0,212,255,0.3)',
              }}
            >
              {locMethod === 'ip' ? '📡 IP · ~город' : '🛰 GPS · высокая точность'}
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={getLocationByIp}
            disabled={loading}
            className="flex-1 py-3.5 rounded flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50"
            style={{
              background: 'var(--app-surface-2)',
              border: '1px solid var(--app-border)',
              color: 'var(--app-text-muted)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {loading && locMethod === 'ip' ? (
              <Icon name="Loader" size={15} className="animate-spin" />
            ) : (
              <Icon name="Globe" size={15} />
            )}
            По IP
          </button>
          <button
            onClick={getLocation}
            disabled={loading}
            className="flex-1 py-3.5 rounded flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50"
            style={{
              background: loading && locMethod === 'gps' ? 'var(--app-surface-2)' : 'var(--app-accent)',
              color: loading && locMethod === 'gps' ? 'var(--app-text-muted)' : '#000',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {loading && locMethod === 'gps' ? (
              <Icon name="Loader" size={15} className="animate-spin" />
            ) : (
              <Icon name="Locate" size={15} />
            )}
            GPS
          </button>
        </div>
      </div>
    </div>
  );
}