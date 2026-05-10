export function formatTime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (d > 0) return `${d}d ${h}:${mm}:${ss}`;
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
