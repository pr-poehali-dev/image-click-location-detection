import Icon from '@/components/ui/icon';
import { LocationRecord, formatCoord, formatTime, formatDate } from './types';

interface CoordsTabProps {
  location: LocationRecord | null;
  locMethod: 'ip' | 'gps';
}

export default function CoordsTab({ location, locMethod }: CoordsTabProps) {
  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center animate-fade-slide">
        <Icon name="Crosshair" size={40} style={{ color: 'var(--app-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
        <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>Нет данных</p>
        <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)', opacity: 0.5 }}>Определите местоположение</p>
      </div>
    );
  }

  const items = [
    { label: 'ШИРОТА', value: location.lat.toFixed(8), sub: formatCoord(location.lat, true), icon: 'ArrowUpDown' },
    { label: 'ДОЛГОТА', value: location.lng.toFixed(8), sub: formatCoord(location.lng, false), icon: 'ArrowLeftRight' },
    {
      label: 'ТОЧНОСТЬ',
      value: locMethod === 'ip' ? '~5 км' : `±${location.accuracy} м`,
      sub: locMethod === 'ip' ? 'По IP-адресу · уровень города' : location.accuracy < 10 ? 'Высокая точность GPS' : location.accuracy < 50 ? 'Средняя точность GPS' : 'Низкая точность GPS',
      icon: 'Target',
    },
    ...(location.altitude !== null
      ? [{ label: 'ВЫСОТА', value: `${Math.round(location.altitude ?? 0)} м`, sub: 'над уровнем моря', icon: 'Mountain' }]
      : []),
    { label: 'ВРЕМЯ ФИКСАЦИИ', value: formatTime(location.timestamp), sub: formatDate(location.timestamp), icon: 'Clock' },
  ];

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="space-y-3 animate-fade-slide">
        {items.map((item, i) => (
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
    </div>
  );
}
