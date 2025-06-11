import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { makeWASocket, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import pino from 'pino';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

let globalSocket;

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/start', upload.single('messageFile'), async (req, res) => {
  const { targetNumber, headerName, delaySeconds } = req.body;
  const filePath = req.file.path;

  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection }) => {
    if (connection === 'open') {
      console.log('[✓] WhatsApp Connected');

      const messages = fs.readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter(Boolean);

      while (true) {
        for (const msg of messages) {
          const finalMsg = `${headerName} ${msg}`;
          const time = new Date().toLocaleTimeString();

          try {
            await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: finalMsg });
            console.log(`\n[✓] Target: ${targetNumber}`);
            console.log(`[✓] Time  : ${time}`);
            console.log(`[✓] Msg   : ${finalMsg}`);
          } catch (err) {
            console.log(`[!] Error: ${err.message}`);
          }

          await delay(parseInt(delaySeconds) * 1000);
        }
      }
    }
  });

  res.send('<h2>QR is displayed in terminal. Scan to connect WhatsApp.</h2>');
});

app.listen(PORT, () => {
  console.log(`[✓] Server started on http://localhost:${PORT}`);
});
