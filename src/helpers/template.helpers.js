function generateStatusTemplate(chargers, intervalId) {
  const isAvailable = chargers.some(charger => charger.status === 'AVAILABLE');
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          html {
            font-family: Arial, sans-serif;
            font-size: 16px;
          }
          .card-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          .card {
            background-color: #f2f2f2;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            width: 100%;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .card h3 {
            margin-top: 0;
            font-size: 1.4em;
          }
          .card p {
            margin: 8px 0;
            font-size: 1.2em;
          }
          button {
            width: 100%;
            max-width: 400px;
            margin-top: 20px;
            padding: 14px;
            font-size: 1.2em;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 6px;
          }
          button:hover {
            opacity: 0.8;
          }
          .button-success {
            background-color: #4CAF50;
          }
          .button-error {
            background-color: #f44336;
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          ${chargers.map(charger => `
            <div class="card">
              <h3>${charger.displayedTitle} | ${charger.cuprId}</h3>
              <p><strong>Status:</strong> ${charger.status}</p>
              <p><strong>Last Update:</strong></p>
              <p>${charger.lastUpdate.join('<br>')}</p>
            </div>
          `).join('')}
        </div>
        ${isAvailable ? '<h3 style="text-align: center;">⚡️ Cargador disponible ⚡️</h3>' : `
          <button class="button-success" id="startButton" style="display: ${intervalId ? 'none' : 'inline-block'};" onclick="startProcess()">Iniciar guardia</button>
          <button class="button-error" id="stopButton" style="display: ${intervalId ? 'inline-block' : 'none'};" onclick="stopProcess()">Detener guardia</button>
        `}
        <script>
          function startProcess() {
            fetch('/start')
              .then(response => response.json())
              .then(data => {
                document.getElementById('startButton').style.display = 'none';
                document.getElementById('stopButton').style.display = 'inline-block';
              })
              .catch(error => {
                console.error('Error:', error);
              });
          }

          function stopProcess() {
            fetch('/stop')
              .then(response => response.json())
              .then(data => {
                document.getElementById('startButton').style.display = 'inline-block';
                document.getElementById('stopButton').style.display = 'none';
              })
              .catch(error => {
                console.error('Error:', error);
              });
          }
        </script>
      </body>
    </html>`;
}

module.exports = {
  generateStatusTemplate,
};
