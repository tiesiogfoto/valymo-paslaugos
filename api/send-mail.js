// /api/send-mail.js
import { Resend } from "resend";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const allowOrigin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method Not Allowed" });

  try {
    // Užtikrinam JSON body
    const ct = String(req.headers["content-type"] || "").toLowerCase();
    if (!ct.includes("application/json")) {
      return res.status(415).json({ ok:false, error:"Unsupported Content-Type" });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    // Laukai (norvegiški pavadinimai)
    const name    = (body.navn ?? "").toString().trim();
    const phone   = (body.telefon ?? body.tlf ?? "").toString().trim();
    const email   = (body.epost ?? body["e-post"] ?? "").toString().trim();
    const service = (body.tjeneste ?? "-").toString().trim();
    const address = (body.adresse ?? "-").toString().trim();
    const date    = (body.dato ?? "-").toString().trim();
    const message = (body.melding ?? "-").toString();

    if (body.hp) return res.status(200).json({ ok:true }); // honeypot
    if (!name || !phone) return res.status(400).json({ ok:false, error:"Missing name or phone" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok:false, error:"Invalid email" });
    }

    const API_KEY    = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || "post@btaas.no";
    const TO_EMAILS  = (process.env.TO_EMAIL || FROM_EMAIL)
      .split(",").map(s => s.trim()).filter(Boolean);

    if (!API_KEY)    return res.status(500).json({ ok:false, error:"Missing RESEND_API_KEY" });
    if (!FROM_EMAIL) return res.status(500).json({ ok:false, error:"Missing FROM_EMAIL" });
    if (!TO_EMAILS.length) return res.status(500).json({ ok:false, error:"Missing TO_EMAIL" });

    const resend = new Resend(API_KEY);

    const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const html = `
      <h2>Ny forespørsel fra btaas.no</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><td><b>Navn</b></td><td>${esc(name)}</td></tr>
        <tr><td><b>Telefon</b></td><td>${esc(phone)}</td></tr>
        <tr><td><b>E-post</b></td><td>${esc(email || "-")}</td></tr>
        <tr><td><b>Tjeneste</b></td><td>${esc(service)}</td></tr>
        <tr><td><b>Adresse</b></td><td>${esc(address)}</td></tr>
        <tr><td><b>Dato</b></td><td>${esc(date)}</td></tr>
        <tr><td><b>Melding</b></td><td>${esc(message).replace(/\n/g,"<br>")}</td></tr>
      </table>
    `;

    const { data, error } = await resend.emails.send({
      from: `BTA AS <${FROM_EMAIL}>`,
      to: TO_EMAILS,               // palaiko vieną ar kelis gavėjus
      reply_to: email || undefined,
      subject: "Ny forespørsel fra btaas.no",
      html
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(502).json({ ok:false, error: String(error?.message || error) });
    }

    return res.status(200).json({ ok:true, id: data?.id || null });
  } catch (err) {
    console.error("send-mail fatal:", err);
    return res.status(500).json({ ok:false, error: String(err?.message || err) });
  }
}
