import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const b = req.body || {};

    // Naudojam tik norvegiškus pavadinimus
    const name    = (b.navn ?? "").toString().trim();
    const phone   = (b.telefon ?? b.tlf ?? "").toString().trim();
    const email   = (b.epost ?? b["e-post"] ?? "").toString().trim();
    const service = (b.tjeneste ?? "").toString().trim();
    const address = (b.adresse ?? "").toString().trim();
    const date    = (b.dato ?? "").toString().trim();
    const message = (b.melding ?? "").toString();

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "Missing name or phone" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

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
        <tr><td><b>Melding</b></td><td>${esc(message).replace(/\n/g,"<br>")}</td></tr>
      </table>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_TO || process.env.SMTP_USER,
      subject: "Ny forespørsel fra btaas.no",
      replyTo: email || process.env.SMTP_USER,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("send-mail error:", err);
    return res.status(500).json({ ok: false, error: "Send failed" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
mit: "1mb" } } };
