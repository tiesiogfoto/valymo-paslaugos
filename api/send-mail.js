// Vercel serverless funkcija: /api/send-mail
import nodemailer from 'nodemailer';

function sanitize(s) {
  if (!s) return '';
  return String(s).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    // Honeypot: jei užpildyta – atmetam
    if (req.body && req.body._honey) {
      return res.status(200).json({ ok: true }); // tyliai ignoruojam botą
    }

    // Paimam laukus
    const navn = sanitize(req.body?.['Navn']);
    const telefon = sanitize(req.body?.['Telefon']);
    const email = sanitize(req.body?.['E-post']);
    const tjeneste = sanitize(req.body?.['Tjeneste']);
    const adresse = sanitize(req.body?.['Adresse']);
    const dato = sanitize(req.body?.['Ønsket dato']);
    const melding = sanitize(req.body?.['Melding']);
    const nextUrl = sanitize(req.body?._next) || '/takk.html';

    if (!navn || !telefon) {
      return res.status(400).json({ ok: false, error: 'Mangler navn eller telefon' });
    }

    // SMTP konfigūracija (iš Vercel aplinkos kintamųjų)
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
      MAIL_TO,     // adresas, kur GAUNI užklausas (dažniausiai tas pats kaip SMTP_USER)
      MAIL_FROM    // kaip rodom "nuo ko" (pvz., "BTA AS <post@btaas.no>")
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_TO || !MAIL_FROM) {
      return res.status(500).json({ ok: false, error: 'Missing SMTP env vars' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE) === 'true', // 465 -> true, 587 -> false
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const subject = `Ny forespørsel: ${tjeneste || 'Rengjøring'} – ${navn}`;

    const html = `
      <h2>Ny forespørsel fra btaas.no</h2>
      <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse">
        <tr><th align="left">Navn</th><td>${navn}</td></tr>
        <tr><th align="left">Telefon</th><td>${telefon}</td></tr>
        <tr><th align="left">E-post</th><td>${email || '-'}</td></tr>
        <tr><th align="left">Tjeneste</th><td>${tjeneste || '-'}</td></tr>
        <tr><th align="left">Adresse</th><td>${adresse || '-'}</td></tr>
        <tr><th align="left">Ønsket dato</th><td>${dato || '-'}</td></tr>
        <tr><th align="left">Melding</th><td>${(melding || '-').replace(/\n/g,'<br>')}</td></tr>
        <tr><th align="left">Tidspunkt</th><td>${new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo' })}</td></tr>
      </table>
    `;

    // 1) Laiškas tau
    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject,
      replyTo: email || undefined,
      html
    });

    // 2) Automatinis patvirtinimas klientui (jei paliko email)
    if (email) {
      await transporter.sendMail({
        from: MAIL_FROM,
        to: email,
        subject: 'Vi har mottatt forespørselen din – BTA AS',
        text:
`Hei ${navn},

Takk for forespørselen! Vi tar kontakt så snart som mulig.

Oppsummert:
– Tjeneste: ${tjeneste || '-'}
– Adresse: ${adresse || '-'}
– Ønsket dato: ${dato || '-'}
– Telefon: ${telefon}
– E-post: ${email || '-'}

Vennlig hilsen
BTA AS
+47 99 89 99 80
post@btaas.no`,
      });
    }

    // Jei forma buvo siųsta naršyklėje – gražiai peradresuojam
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      res.setHeader('Location', nextUrl);
      return res.status(303).end();
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('MAIL ERROR:', err);
    return res.status(500).json({ ok: false, error: 'Send failed' });
  }
}
