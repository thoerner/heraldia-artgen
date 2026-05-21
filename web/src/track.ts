export function track(event: string, data?: Record<string, string | number>) {
  const url = import.meta.env.VITE_STATS_API_URL as string;
  const key = import.meta.env.VITE_STATS_API_KEY as string;
  if (!url || !key) return;
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ event, data, ts: Date.now() }),
  }).catch(() => {});
}
