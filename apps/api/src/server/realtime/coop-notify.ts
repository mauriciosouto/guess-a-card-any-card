/**
 * After HTTP mutations, nudge the optional coop realtime server to push fresh snapshots.
 * No-op when `COOP_REALTIME_NOTIFY_URL` is unset (e.g. Vercel without a companion WS process).
 */
export function notifyCoopRoom(roomId: string): void {
  const base = process.env.COOP_REALTIME_NOTIFY_URL?.trim();
  if (!base || !roomId) return;

  const url = `${base.replace(/\/$/, "")}/notify`;
  const secret = process.env.COOP_REALTIME_SECRET?.trim();

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ roomId }),
  }).catch(() => {
    /* best-effort; HTTP polling still works */
  });
}
