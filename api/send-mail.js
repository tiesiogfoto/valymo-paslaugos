// Vercel serverless funkcija: /api/send-mail
import nodemailer from 'nodemailer';

function clean(s) {
  if (!s) return '';
  return String(s).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    // Priimame JSON iš fronto
    const body = req.body || {};
    // Honeypot (jei buvo formoje) – tyliai ignoruojam
    if (body.honey) return res.status(200).json({ ok: true });

    const navn     = clean(body.navn);
    const telefon  = clean(body.telefon);
    const epost    = clean(body.epost);
    const tjeneste = clean(body.tjeneste);
    const adresse  = clean(body.adresse);
    const dato     = clean(body.dato);
    const melding  = clean(body.melding);

    if (!navn || !telefon) {
      return res.status(400).json({ ok: false, error: 'Mangler navn eller telefon' });
    }

    // SMTP konfigūracija iš aplinkos kintamųjų
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
      MAIL_TO,
      MAIL_FROM
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_TO || !MAIL_FROM) {
      return res.status(500).json({ ok: false, error: 'Missing SMTP env vars' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE) === 'true', // 465=true, 587=false
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    const subject = `Ny forespørsel: ${tjeneste || 'Rengjøring'} – ${navn}`;

    const html = `
      <h2>Ny forespørsel fra btaas.no</h2>
      <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse">
        <tr><th align="left">Navn</th><td>${navn}</td></tr>
        <tr><th align="left">Telefon</th><td>${telefon}</td></tr>
        <tr><th align="left">E-post</th><td>${epost || '-'}</td></tr>
        <tr><th align="left">Tjeneste</th><td>${tjeneste || '-'}</td></tr>
        <tr><th align="left">Adresse</th><td>${adresse || '-'}</td></tr>
        <tr><th align="left">Ønsket dato</th><td>${dato || '-'}</td></tr>
        <tr><th align="left">Melding</th><td>${(melding || '-').replace(/\n/g,'<br>')}</td></tr>
        <tr><th align="left">Tidspunkt</th><td>${new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo' })}</td></tr>
      </table>
    `;

    // 1) Laiškas tau
    await transporter.sendMail({
      from: MAIL_FROM,           // pvz. "BTA AS <post@btaas.no>"
      to: MAIL_TO,               // pvz. "post@btaas.no"
      subject,
      replyTo: epost || undefined,
      html
    });

    // 2) Auto-atsakymas klientui (jei paliko email)
    if (epost) {
      await transporter.sendMail({
        from: MAIL_FROM,
        to: epost,
        subject: 'Vi har mottatt forespørselen din – BTA AS',
        text:
`Hei ${navn},

Takk for forespørselen! Vi tar kontakt så snart som mulig.

Oppsummert:
– Tjeneste: ${tjeneste || '-'}
– Adresse: ${adresse || '-'}
– Ønsket dato: ${dato || '-'}
– Telefon: ${telefon}
– E-post: ${epost || '-'}

Vennlig hilsen
BTA AS
+47 99 89 99 80
post@btaas.no`
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('MAIL ERROR:', err);
    return res.status(500).json({ ok: false, error: 'Send failed' });
  }
}
