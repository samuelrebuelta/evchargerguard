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
    const payload = { cuprId };
    const { data } = await axios.post(API_URL, payload, { headers });
    const chargers = data.map(charger => ({
      cuprId: charger.locationData.cuprId,
      serialNumber: charger.serialNumber,
      displayedTitle: charger.displayedTitle,
      status: charger.cpStatus?.statusCode,
      lastUpdate: charger.logicalSocket.map(({ status }) => moment.tz(status.updateDate, 'Europe/Madrid').format('DD-MM-YYYY HH:mm:ss')),
    }));
    console.log('🔍 Cargadores:', chargers);

    if (chargers.some(charger => charger.status === 'AVAILABLE')) {
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

app.get('/status', async (req, res) => {
  const chargers = await checkStatus();
  const template = generateStatusTemplate(chargers, intervalId);

  return res.send(template);
});

app.get('/start', async (req, res) => {
  if (intervalId) {
    return res.status(400).json({ message: "El proceso ya está en ejecución" });
  }

  await checkStatus();
  await sendEmailListening();

  intervalId = setInterval(async () => {
    await checkStatus();
  }, 60 * 1000 * 2);

  console.log('▶ Iniciando guardia');
  res.json({ message: '▶ Iniciando guardia' });
});

app.get('/stop', (req, res) => {
  stopProcess();
  return res.json({ message: '⏹ Proceso detenido' });
});

app.get('/keep-alive', (req, res) => {
  res.json({ message: '🔄 El servidor está activo' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
