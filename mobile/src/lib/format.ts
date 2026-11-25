// Small formatting helpers shared by the staff screens (dates are shown in Douala local time).
const TZ = 'Africa/Douala';

export function timeHM(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

export function weekdayDate(iso: string | Date = new Date()) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
}

export function fcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

export function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }));
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

// "12 min ago" / "in 18 min"
export function fromNow(iso: string) {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (diffMin === 0) return 'now';
  return diffMin > 0 ? `in ${diffMin} min` : `${Math.abs(diffMin)} min ago`;
}
