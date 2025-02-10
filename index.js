require('dotenv').config();
const express = require('express');
const axios = require('axios');
const moment = require('moment-timezone');
const { generateStatusTemplate } = require('./src/helpers/template.helpers');
const { sendEmailError, sendEmailListening, sendEmailSuccess } = require('./src/helpers/email.helpers');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL;
const API_VERSION_APP_HEADER = process.env.API_VERSION_APP_HEADER;
const CHARGERS_TO_CHECK = process.env.CHARGERS_TO_CHECK;

let intervalId;
let keepAliveIntervalId;

function stopProcess() {
  if (!intervalId) { return };

  // Clear the interval and set it to null
  clearInterval(intervalId);
  intervalId = null;
  console.log("⏹ Proceso detenido");
}

async function checkStatus() {
  try {
    // Fetch the status of the chargers
    const headers = {
      'versionApp': API_VERSION_APP_HEADER,
      'User-Agent': 'azkarga/4.28.5 (es.iberdrola.recargaverde; build:428501; iOS 18.3.0) Alamofire/4.9.1',
    };
    const cuprId = CHARGERS_TO_CHECK.split(',').map(Number);
    const payload = { cuprId };
    const { data } = await axios.post(API_URL, payload, { headers });

    // Map the data to the format we need
    const chargers = data.map(charger => ({
      cuprId: charger.locationData.cuprId,
      displayedTitle: charger.displayedTitle,
      status: charger.cpStatus?.statusCode,
      lastUpdate: charger.logicalSocket.map(({ status }) => moment.tz(status.updateDate, 'Europe/Madrid').format('DD-MM-YYYY HH:mm:ss')),
    }));

    return chargers;
  } catch (error) {
    await sendEmailError(error);
    console.error('❌ Error:', error.message);
  }
}

async function calculateSendEmailSuccess(chargers) {
  // If any of the chargers is available, send the success email and stop the process
  if (chargers.some(charger => charger.status === 'AVAILABLE')) {
    await sendEmailSuccess();
    stopProcess();
  }
}

function setKeepAliveInterval() {
  keepAliveIntervalId = setInterval(() => {
    axios.get(`https://evchargerguard.onrender.com/health`)
      .then(({ data }) => console.log(data))
      .catch((error) => {
        clearInterval(keepAliveIntervalId);
        keepAliveIntervalId = null;
        console.error('❌ Error en la petición keep-alive:', error.message);
      });
  }, 60 * 1000);
}

app.get('/status', async (req, res) => {
  // Check the status of the chargers
  const chargers = await checkStatus();
  // Generate the HTML template
  const template = generateStatusTemplate(chargers, intervalId);

  return res.send(template);
});

app.get('/start', async (req, res) => {
  if (intervalId) {
    return res.status(400).json({ message: "El proceso ya está en ejecución" });
  }

  // First check to send the initial email
  const chargers = await checkStatus().catch(() => stopProcess());
  await sendEmailListening();
  await calculateSendEmailSuccess(chargers);

  // Interval to check the status every 2 minutes
  intervalId = setInterval(async () => {
    const chargers = await checkStatus().catch(() => stopProcess());
    await calculateSendEmailSuccess(chargers);
  }, 60 * 1000 * 2);

  console.log('▶ Iniciando guardia');
  res.json({ message: '▶ Iniciando guardia' });
});

app.get('/stop', (req, res) => {
  // Stop the process
  stopProcess();

  return res.json({ message: '⏹ Proceso detenido' });
});

app.get('/health', (req, res) => {
  res.json({ message: '🔄 El servidor está activo' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);

  // Schedule the keep alive requests to run every minute
  setKeepAliveInterval();
});
