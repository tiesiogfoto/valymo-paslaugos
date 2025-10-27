// api/send-mail.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { name, phone, email, service, address, date, message } = req.body || {};

    // minimalus validavimas
    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "Missing name or phone" });
    }

    // SMTP konfigūracija iš ENV
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true", // 465 -> true, 587 -> false
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <h2>Nauja užklausa iš btaas.no</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><td><b>Vardas</b></td><td>${name}</td></tr>
        <tr><td><b>Telefonas</b></td><td>${phone}</td></tr>
        <tr><td><b>E-paštas</b></td><td>${email || "-"}</td></tr>
        <tr><td><b>Paslauga</b></td><td>${service || "-"}</td></tr>
        <tr><td><b>Adresas</b></td><td>${address || "-"}</td></tr>
        <tr><td><b>Data</b></td><td>${date || "-"}</td></tr>
        <tr><td><b>Žinutė</b></td><td>${(message || "").replace(/\n/g,"<br>")}</td></tr>
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

// Kad veiktų su ESM Vercel aplinkoje:
export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
