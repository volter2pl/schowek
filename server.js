const express = require('express');
const WebSocket = require('ws');
const multer = require('multer');
const os = require('os');
const args = require('minimist')(process.argv.slice(2));
const PORT = args.port || 3000;

let sharedText = '';
let uploadedFile = null; // { name, mime, buffer }

const app = express();
const upload = multer({
    limits: {fileSize: 1024 * 1024 * 1024} // 1GB
}); // memory storage

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason.stack || reason);
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta content="width=device-width, initial-scale=1.0" name="viewport">
        <title>Clipboard</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            textarea {
                width: 100%;
                height: 300px;
                margin-bottom: 20px;
                resize: vertical;
            }
            .section {
                margin-bottom: 20px;
            }
            .status {
                color: #666;
                font-style: italic;
                margin-top: 10px;
            }
            .file-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: flex-start;
            }
            button, input[type="file"] {
                padding: 6px 12px;
                font-size: 14px;
            }
            .hidden {
                display: none;
            }
            a.download-link {
                text-decoration: none;
                color: #007BFF;
            }
        </style>
    </head>
    <body>
        <div class="section">
            <textarea id="editor"></textarea>
        </div>

        <div class="section actions">
            <input id="fileInput" type="file">
            <button id="uploadBtn">Upload</button>
            <button id="deleteBtn">Delete</button>
        </div>
        <div class="section file-actions" id="fileActions">
            <a class="download-link" download href="/download" id="downloadLink">Pobierz: </a>
            <img alt="Podgląd obrazu" class="hidden" id="previewImage" style="max-width: 100%; max-height: 300px;">
        </div>

        <div class="status" id="status">Connecting...</div>

        <script>
            const editor = document.getElementById('editor');
            const status = document.getElementById('status');
            const ws = new WebSocket(\`ws://\${window.location.host}\`);
            const fileInput = document.getElementById('fileInput');
            const uploadBtn = document.getElementById('uploadBtn');
            const fileActions = document.getElementById('fileActions');
            const downloadLink = document.getElementById('downloadLink');
            const deleteBtn = document.getElementById('deleteBtn');
            const previewImage = document.getElementById('previewImage');

            function isImageFilename(filename) {
                return /\\.(png|jpe?g|gif|bmp|webp)$/i.test(filename);
            }

            function updateFileDisplay(data) {
                const isImage = data.name && isImageFilename(data.name);
                if (data.name) {
                    downloadLink.download = data.name;
                    downloadLink.textContent = 'Pobierz: ' + data.name;
                    fileActions.style.display = 'flex';
            
                    if (isImage) {
                        previewImage.src = '/download?' + new Date().getTime(); // cache busting
                        previewImage.classList.remove('hidden');
                    } else {
                        previewImage.classList.add('hidden');
                    }
                } else {
                    fileActions.style.display = 'none';
                    previewImage.classList.add('hidden');
                }
            }

            fileActions.style.display = 'none';

            ws.onopen = () => status.textContent = 'Connected';
            ws.onclose = () => status.textContent = 'Disconnected';
            ws.onerror = (error) => {
                status.textContent = 'Connection error';
                console.error('WebSocket error:', error);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'update' && data.text !== editor.value) {
                    editor.value = data.text;
                } else if (data.type === 'fileInfo') {
                    updateFileDisplay(data);
                }
            };

            editor.addEventListener('input', () => {
                ws.send(JSON.stringify({ type: 'edit', text: editor.value }));
            });

            uploadBtn.addEventListener('click', () => {
                const file = fileInput.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);

                fetch('/upload', {
                    method: 'POST',
                    body: formData
                }).then(response => {
                    if (response.ok) {
                        fileInput.value = '';
                    } else {
                        alert('Błąd podczas przesyłania pliku');
                    }
                }).catch(error => {
                    alert('Błąd sieci: ' + error.message);
                });
            });

            deleteBtn.addEventListener('click', () => {
                fetch('/delete', { method: 'POST' })
                    .then(response => {
                        if (response.ok) {
                            fileActions.style.display = 'none';
                        } else {
                            alert('Błąd podczas usuwania pliku');
                        }
                    });
            });

            fetch('/api/text')
                .then(r => r.json())
                .then(d => editor.value = d.text);
        </script>
    </body>
    </html>
  `);
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file');
    uploadedFile = {
        name: req.file.originalname,
        mime: req.file.mimetype,
        buffer: req.file.buffer
    };
    broadcast({ type: 'fileInfo', name: uploadedFile.name });
    res.send({ success: true });
});

app.post('/delete', (req, res) => {
    if (!uploadedFile) return res.status(404).send('No file to delete');
    uploadedFile = null;
    broadcast({ type: 'fileInfo', name: null });
    res.send({ success: true });
});

app.get('/download', (req, res) => {
    if (!uploadedFile) return res.status(404).send('No file');
    res.set({
        'Content-Type': uploadedFile.mime,
        'Content-Disposition': `attachment; filename="${uploadedFile.name}"`
    });
    res.send(uploadedFile.buffer);
});

app.get('/api/text', (req, res) => {
  res.json({ text: sharedText });
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost'; // fallback, jeśli nie znaleziono adresu LAN
}

const server = app.listen(PORT, async () => {
  console.log(`http://${ getLocalIP() }:${PORT}`);
});

const wss = new WebSocket.Server({ server });

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'update', text: sharedText }));
    if (uploadedFile) {
        ws.send(JSON.stringify({ type: 'fileInfo', name: uploadedFile.name }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'edit') {
                sharedText = data.text;
                broadcast({ type: 'update', text: sharedText });
            }
        } catch (err) {
            console.error('Message error:', err);
        }
    });
});
