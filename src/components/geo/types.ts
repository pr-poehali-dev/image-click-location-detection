export interface LocationRecord {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  timestamp: Date;
}

export type TabType = 'map' | 'coords' | 'history';

export const API_URL = 'https://functions.poehali.dev/a66bf5af-8f3c-4db6-86e4-c657b0011f0c';

export function formatCoord(val: number, isLat: boolean): string {
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(3);
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
  return `${deg}°${min}'${sec}"${dir}`;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
