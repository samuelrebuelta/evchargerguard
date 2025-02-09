// src/helpers/email.helpers.js
const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_SMTP_PASS = process.env.EMAIL_SMTP_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_SMTP_PASS },
});

async function sendEmail(subject, text) {
  const mailOptions = {
    from: `EV Charger Guard APP <${EMAIL_USER}>`,
    to: EMAIL_TO,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Email enviado correctamente");
  } catch (error) {
    console.error("❌ Error al enviar el email:", error.message);
  }
}

async function sendEmailError(error) {
  await sendEmail("ERROR AL CONSULTAR LOS CARGADORES", JSON.stringify(error));
}

async function sendEmailListening() {
  await sendEmail("INICIANDO GUARDIA", "El sistema ha iniciado la guardia para comprobar la disponibilidad de cargadores.");
}

async function sendEmailSuccess() {
  await sendEmail("CARGADOR DISPONIBLE", "El sistema ha detectado que uno de los cargadores consultados está disponible.");
}

module.exports = {
  sendEmail,
  sendEmailError,
  sendEmailListening,
  sendEmailSuccess,
};
