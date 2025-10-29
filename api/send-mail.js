// /api/send-mail.js
import { Resend } from 'resend';

export default async function handler(req, res) {
  const allowOrigin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const name = body.navn?.trim();
    const phone = body.telefon?.trim();
    const email = body.epost?.trim() || "-";
    const service = body.tjeneste?.trim() || "-";
    const address = body.adresse?.trim() || "-";
    const date = body.dato?.trim() || "-";
    const message = body.melding?.trim() || "-";

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "Missing name or phone" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const html = `
      <h2>Ny forespørsel fra btaas.no</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><td><b>Navn</b></td><td>${name}</td></tr>
        <tr><td><b>Telefon</b></td><td>${phone}</td></tr>
        <tr><td><b>E-post</b></td><td>${email}</td></tr>
        <tr><td><b>Tjeneste</b></td><td>${service}</td></tr>
        <tr><td><b>Adresse</b></td><td>${address}</td></tr>
        <tr><td><b>Dato</b></td><td>${date}</td></tr>
        <tr><td><b>Melding</b></td><td>${message.replace(/\n/g, "<br>")}</td></tr>
      </table>
    `;

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      subject: "Ny forespørsel fra btaas.no",
      html
    });

    return res.status(200).json({ ok: true
