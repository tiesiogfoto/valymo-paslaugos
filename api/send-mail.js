// /api/send-mail.js
export default async function handler(req, res) {
  const allowOrigin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method Not Allowed" });

  // 🧪 DIAGNOSTIKOS TESTAS
  return res.status(200).json({
    ok: true,
    seen: true,
    resendKeyExists: !!process.env.RESEND_API_KEY,
    resendKey: process.env.RESEND_API_KEY ? "YRA (nerodau viso dėl saugumo)" : "NERA",
    fromEmail: process.env.FROM_EMAIL || null,
    toEmail: process.env.TO_EMAIL || null
  });
}

export const config = { runtime: "nodejs" };

