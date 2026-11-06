// Shown in Malaysia time, whatever time zone the server runs in (Vercel uses UTC).
const malaysiaTime = new Intl.DateTimeFormat('en-MY', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kuala_Lumpur',
});

export function formatOrderTime(isoTimestamp: string): string {
  return malaysiaTime.format(new Date(isoTimestamp));
}

// A short, readable reference for an order, e.g. "#92F7354A".
export function orderNumber(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
