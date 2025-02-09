require('dotenv').config();
const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL;
const API_VERSION_APP_HEADER = process.env.API_VERSION_APP_HEADER;
const CHARGERS_TO_CHECK = process.env.CHARGERS_TO_CHECK;
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
    from: `EV Charger Guard APP <${EMAIL_USER}>`,
    to: EMAIL_TO,
    subject: "ERROR AL CONSULTAR LOS CARGADORES",
    text: JSON.stringify(error),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Email enviado correctamente");
  } catch (error) {
    console.error("❌ Error al enviar el email:", error.message);
  }
}

async function sendEmailListening() {
  const mailOptions = {
    from: `EV Charger Guard APP <${EMAIL_USER}>`,
    to: EMAIL_TO,
    subject: "INICIANDO GUARDIA",
    text: "El sistema ha iniciado la guardia para comprobar la disponibilidad de cargadores.",
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
    from: `EV Charger Guard APP <${EMAIL_USER}>`,
    to: EMAIL_TO,
    subject: "CARGADOR DISPONIBLE",
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
    const cuprId = CHARGERS_TO_CHECK.split(',').map(Number);
    const data = { cuprId };
    const { data: chargers } = await axios.post(API_URL, data, { headers });
    console.log('🔍 Cargadores:', chargers);

    // If any of the chargers is available, send the success email and stop the process
    if (chargers.some(charger => charger.cpStatus?.statusCode === 'AVAILABLE')) {
      await sendEmailSuccess();
      stopProcess();
    }
    return chargers;
  } catch (error) {
    await sendEmailError(error);
    stopProcess();
    console.error('❌ Error:', error.message);
  }
}

// Endpoint to start the process
app.get('/start', async (req, res) => {
  // If there is already a process running, return an error
  if (intervalId) {
    return res.status(400).json({ message: "El proceso ya está en ejecución" });
  }

  // Initialize the process
  await checkStatus();
  await sendEmailListening();

  // Schedule the process to run every 3 minutes
  intervalId = setInterval(() => {
    checkStatus();
  }, 60 * 1000 * 2);

  console.log('▶ Iniciando guardia');
  res.json({ message: '▶ Iniciando guardia' });
});

// Endpoint to stop the process
app.get('/stop', (req, res) => {
  stopProcess();
  return res.json({ message: '⏹ Proceso detenido' });
});

app.get('/status', async (req, res) => {
  const status = await checkStatus();
  const chargers = status.map(charger => ({
    id: charger.cpId,
    serialNumber: charger.serialNumber,
    status: charger.cpStatus?.statusCode,
    lastUpdate: charger.logicalSocket.map(({ status }) => moment.tz(status.updateDate, 'Europe/Madrid').format('DD-MM-YYYY HH:mm:ss')),
  }));
  return res.json({ chargers });
});

// Endpoint to handle keep-alive requests
app.get('/keep-alive', (req, res) => {
  res.json({ message: '🔄 El servidor está activo' });
});

// Init the server
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);

  // Schedule the keep-alive requests to run every minute
  keepAliveIntervalId = setInterval(() => {
    axios.get(`https://evchargerguard.onrender.com/keep-alive`)
      .then(({ data }) => console.log(data))
      .catch((error) => {
        clearInterval(keepAliveIntervalId);
        keepAliveIntervalId = null;
        console.error('❌ Error en la petición keep-alive:', error.message);
      });
  }, 60 * 1000);
});
