// api/health.js
export default function handler(req, res) {
  res.status(200).json({ ok: true, now: Date.now() });
}
export const config = { runtime: "nodejs" };
