// /api/send-mail.js
import nodemailer from "nodemailer";

/**
 * Pilnas el. pašto API btaas.no
 * Priima JSON su raktas->reikšmė (norvegiški laukai).
 * Reikalingi ENV: SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"), SMTP_USER, SMTP_PASS
 * Pasirenkami: SMTP_FROM, SMTP_TO, ALLOW_ORIGIN (pvz. https://btaas.no)
 */

export default async function handler(req, res) {
  // CORS (paprastas) – leisti tik POST iš tavo domeno
  const allowOrigin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Priimame tik application/json
    const ct = req.headers["content-type"] || "";
    if (!ct.includes("application/json")) {
      return res.status(415).json({ ok: false, error: "Unsupported Content-Type" });
    }

    const b = req.body || {};

    // Honeypot prieš botus – jei laukelis "hp" užpildytas, nekreipiame dėmesio
    if (b.hp) {
      return res.status(200).json({ ok: true });
    }

    // Normalizuojame norvegiškus laukus
    const name    = (b.navn ?? "").toString().trim();
    const phone   = (b.telefon ?? b.tlf ?? "").toString().trim();
    const email   = (b.epost ?? b["e-post"] ?? "").toString().trim();
    const service = (b.tjeneste ?? "").toString().trim();
    const address = (b.adresse ?? "").toString().trim();
    const date    = (b.dato ?? "").toString().trim();
    const message = (b.melding ?? "").toString();

    // Minimalus validavimas
    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "Missing name or phone" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "Invalid email" });
    }
    if (phone.replace(/[^\d+]/g, "").length < 6) {
      return res.status(400).json({ ok: false, error: "Invalid phone" });
    }

    // SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true", // 465 -> true, 587 -> false
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Patikriname SMTP ryšį – jei nepavyksta, grąžiname aiškią klaidą
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

    // Saugus HTML
    const esc = (s) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

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

    // Siunčiame
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER, // kai kurie tiekėjai reikalauja from == SMTP_USER
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
    // Neatskleidžiame vidinių klaidų detalių production režime
    const isProd = process.env.NODE_ENV === "production";
    return res.status(500).json({
      ok: false,
      error: "HANDLER_CRASH",
      details: isProd ? undefined : err?.message || String(err),
    });
  }
}

// Node runtime (ne Edge) + body parser
export const config = {
  runtime: "nodejs18.x",
  api: { bodyParser: { sizeLimit: "1mb" } },
};
