import Icon from '@/components/ui/icon';
import { LocationRecord, API_URL, formatTime, formatDate } from './types';

interface HistoryTabProps {
  history: LocationRecord[];
  location: LocationRecord | null;
  onSelect: (rec: LocationRecord) => void;
  onClear: () => void;
}

export default function HistoryTab({ history, location, onSelect, onClear }: HistoryTabProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center animate-fade-slide">
        <Icon name="Clock" size={40} style={{ color: 'var(--app-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
        <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>История пуста</p>
        <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)', opacity: 0.5 }}>Записи появятся после определения</p>
      </div>
    );
  }

  const handleClear = () => {
    fetch(API_URL, { method: 'DELETE' }).catch(() => {});
    onClear();
  };

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="space-y-2 animate-fade-slide">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--app-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
            Записей: {history.length}
          </span>
          <button
            onClick={handleClear}
            className="text-xs transition-colors duration-200"
            style={{ color: 'var(--app-text-muted)' }}
          >
            Очистить
          </button>
        </div>

        {history.map((rec) => (
          <button
            key={rec.id}
            onClick={() => onSelect(rec)}
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
    </div>
  );
}
