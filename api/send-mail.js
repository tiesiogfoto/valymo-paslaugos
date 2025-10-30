export default async function handler(req, res) {
  const allowOrigin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { navn, telefon, epost, tjeneste, adresse, dato, melding, hp } = req.body;

  // 🛑 Honeypot spam check
  if (hp && hp.trim() !== "") {
    return res.status(200).json({ ok: true, spam: true });
  }

  // ✅ Email content
  const text = `
Navn: ${navn}
Telefon: ${telefon}
E-post: ${epost}
Tjeneste: ${tjeneste}
Adresse: ${adresse}
Dato: ${dato}
Melding: ${melding}
  `;

  // ✅ ---- SMTP via DomeneShop ----

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      subject: `Ny forespørsel fra ${navn}`,
      text,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("MAIL ERROR:", err);
    return res.status(500).json({ ok: false, error: "Mail send failed" });
  }
}

export const config = {
  runtime: "nodejs",
};

