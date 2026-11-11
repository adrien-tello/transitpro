// Money is an integer in FCFA on the server: 3800 → "3,800 FCFA"
export const fcfa = (n: number | null | undefined) =>
  n == null ? '—' : `${new Intl.NumberFormat('en-US').format(n)} FCFA`;

const tz = 'Africa/Douala';

// "Mon 2 Nov · 07:12"
export function dateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

// "5 min ago", "2 h ago", or the date
export function ago(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return dateTime(iso);
}

// "677112233" → "677 11 22 33"
export const phone = (p: string | null | undefined) => {
  if (!p) return '—';
  const d = p.replace(/\D/g, '').replace(/^237/, '');
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : p;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
