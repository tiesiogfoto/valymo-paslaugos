// /api/send-mail.js
import { Resend } from "resend";

export default async function handler(req, res) {
  // CORS
  const allowOrigin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Paprastas „health/debug“ GET
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      env: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.FROM_EMAIL || null,
        toEmail: process.env.TO_EMAIL || null,
        allowOrigin,
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    // laukų normalizacija
    const name    = (body.navn ?? "").toString().trim();
    const phone   = (body.telefon ?? body.tlf ?? "").toString().trim();
    const email   = (body.epost ?? body["e-post"] ?? "").toString().trim();
    const service = (body.tjeneste ?? "").toString().trim();
    const address = (body.adresse ?? "").toString().trim();
    const date    = (body.dato ?? "").toString().trim();
    const message = (body.melding ?? "").toString();

    if (!name || !phone) {
      return res.status(400).json({ ok:false, error:"Missing name or phone" });
    }

    // ENV patikra
    const API_KEY   = process.env.RESEND_API_KEY;
    const FROM      = process.env.FROM_EMAIL;   // pvz.:  'BTA AS <post@btaas.no>'
    const TO        = process.env.TO_EMAIL;     // pvz.:  'post@btaas.no'

    if (!API_KEY || !FROM || !TO) {
      return res.status(500).json({
        ok:false, error:"ENV_MISSING",
        details: { hasApiKey: !!API_KEY, FROM, TO }
      });
    }

    const resend = new Resend(API_KEY);

    const esc = (s) => String(s||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

    const html = `
      <h2>Ny forespørsel fra btaas.no</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><td><b>Navn</b></td><td>${esc(name)}</td></tr>
        <tr><td><b>Telefon</b></td><td>${esc(phone)}</td></tr>
        <tr><td><b>E-post</b></td><td>${esc(email || "-")}</td></tr>
        <tr><td><b>Tjeneste</b></td><td>${esc(service || "-")}</td></tr>
        <tr><td><b>Adresse</b></td><td>${esc(address || "-")}</td></tr>
        <tr><td><b>Dato</b></td><td>${esc(date || "-")}</td></tr>
        <tr><td><b>Melding</b></td><td>${esc(message).replace(/\n/g,"<br>")}</td></tr>
      </table>
    `;

    // Resend siuntimas (reply_to į kliento e-paštą, jei yra)
    let result;
    try {
      result = await resend.emails.send({
        from: FROM,                  // 'BTA AS <post@btaas.no>'  (siųsti IŠ VERIFIKUOTO domeno)
        to:   TO,                    // 'post@btaas.no'
        subject: "Ny forespørsel fra btaas.no",
        html,
        reply_to: email || undefined // kad „Reply“ eitų klientui, jei įrašė e-paštą
      });
    } catch (e) {
      // pagausim žemiau
      throw { tag: "RESEND_SDK_THROW", raw: e, msg: e?.message || String(e) };
    }

    // Resend grąžina { data, error }. Jei error – mes metame klaidą su detalėm
    if (result?.error) {
      throw { tag: "RESEND_API_ERROR", raw: result.error, msg: result.error?.message || "Unknown Resend error" };
    }

    return res.status(200).json({ ok: true, id: result?.data?.id || null });
  } catch (error) {
    // Grąžinam kuo daugiau konteksto DIAGNOSTIKAI
    return res.status(500).json({
      ok: false,
      error: "SEND_FAILED",
      details: {
        message: error?.msg || error?.message || String(error),
        tag: error?.tag || null,
        raw: error?.raw || null,
      }
    });
  }
}

export const config = { runtime: "nodejs" };
