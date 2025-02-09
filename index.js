require('dotenv').config();
const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL;
const API_VERSION_APP_HEADER = process.env.API_VERSION_APP_HEADER;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_SMTP_PASS = process.env.EMAIL_SMTP_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

let intervalId;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_SMTP_PASS },
});

async function sendEmailError(error) {
  const mailOptions = {
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject: "Alerta: Error al consultar cargadores",
    text: JSON.stringify(error),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Email enviado correctamente");
  } catch (error) {
    console.error("❌ Error al enviar el email:", error.message);
  }
}

async function sendEmailSuccess() {
  const mailOptions = {
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject: "Alerta: Cargador disponible",
    text: "El sistema ha detectado que uno de los cargadores consultados está disponible.",
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Email enviado correctamente");
  } catch (error) {
    console.error("❌ Error al enviar el email:", error.message);
  }
}

function stopProcess() {
  if (!intervalId) { return };
  clearInterval(intervalId);
  intervalId = null;
  console.log("⏹ Proceso detenido");
}

async function checkStatus() {
  try {
    const headers = { 'versionApp': API_VERSION_APP_HEADER };
    const data = { cuprId: [166318, 7385] };
    const { data: chargers } = await axios.post(API_URL, data, { headers });
    console.log('Chargers:', chargers);
    if (chargers.some(charger => charger.cpStatus?.statusCode === 'AVAILABLE')) {
      await sendEmailSuccess();
      stopProcess();
    }
  } catch (error) {
    await sendEmailError(error);
    stopProcess();
    console.error('Error:', error.message);
  }
}

// Endpoint para iniciar el proceso
app.get('/start', (req, res) => {
  // If there is already a process running, return an error
  if (intervalId) {
    return res.status(400).json({ message: "El proceso ya está en ejecución" });
  }

  // Initialize the process
  checkStatus();

  // Schedule the process to run every 3 minutes
  intervalId = setInterval(() => {
    checkStatus();
  }, 60 * 1000 * 3);

  console.log('▶ Iniciando guardia');
  res.json({ message: '▶ Iniciando guardia' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
