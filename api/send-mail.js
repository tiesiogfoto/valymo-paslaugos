// /api/send-mail.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // CORS
  const allowOrigin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Priimam tik JSON (Vercel kartais paduoda string)
    const ct = req.headers["content-type"] || "";
    if (!ct.includes("application/json")) {
      return res.status(415).json({ ok: false, error: "Unsupported Content-Type" });
    }
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    // Honeypot
    if (b.hp) return res.status(200).json({ ok: true });

    // Norvegiški laukai
    const name    = (b.navn ?? "").toString().trim();
    const phone   = (b.telefon ?? b.tlf ?? "").toString().trim();
    const email   = (b.epost ?? b["e-post"] ?? "").toString().trim();
    const service = (b.tjeneste ?? "").toString().trim();
    const address = (b.adresse ?? "").toString().trim();
    const date    = (b.dato ?? "").toString().trim();
    const message = (b.melding ?? "").toString();

    if (!name || !phone) return res.status(400).json({ ok: false, error: "Missing name or phone" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "Invalid email" });
    }

    // Laikinas bypass (jei reikia greitai atskirti SMTP bėdas)
    if (process.env.DISABLE_EMAIL === "1") {
      return res.status(200).json({ ok: true, mode: "bypass" });
    }

    // SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true", // 465 -> true, 587 -> false
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    // Patikrinimas
    try {
      await transporter.verify();
    } catch (e) {
      return res.status(502).json({
        ok: false,
        error: "SMTP_VERIFY_FAILED",
        code: e?.code || null,
        details: e?.message || String(e),
      });
    }

    const esc = (s) =>
      String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
      <h2>Ny forespørsel fra btaas.no</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><td><b>Navn</b></td><td>${esc(name)}</td></tr>
        <tr><td><b>Telefon</b></td><td>${esc(phone)}</td></tr>
        <tr><td><b>E-post</b></td><td>${esc(email || "-")}</td></tr>
        <tr><td><b>Tjeneste</b></td><td>${esc(service || "-")}</td></tr>
        <tr><td><b>Adresse</b></td><td>${esc(address || "-")}</td></tr>
        <tr><td><b>Dato</b></td><td>${esc(date || "-")}</td></tr>
        <tr><td><b>Melding</b></td><td>${esc(message).replace(/\n/g, "<br>")}</td></tr>
      </table>
    `;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER, // dažnai MUST == SMTP_USER
        to: process.env.SMTP_TO || process.env.SMTP_USER,
        subject: "Ny forespørsel fra btaas.no",
        replyTo: email || process.env.SMTP_USER,
        html,
      });
    } catch (e) {
      return res.status(502).json({
        ok: false,
        error: "SMTP_SEND_FAILED",
        code: e?.code || null,
        details: e?.message || String(e),
        response: e?.response || null,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "HANDLER_CRASH" });
  }
}

export const config = { runtime: "nodejs" };
