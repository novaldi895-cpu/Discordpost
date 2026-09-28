const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ================== KONFIGURASI ==================
const CONFIG = {
    userToken: process.env.DISCORD_USER_TOKEN || 'MASUKKAN_USER_TOKEN_KAMU',
    channelId: process.env.DISCORD_CHANNEL_ID || 'MASUKKAN_CHANNEL_ID',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};
// =================================================

// Delay random (biar tidak ketahuan spam)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Endpoint test
app.get('/', (req, res) => {
    res.json({ 
        status: 'DisPost User-Token Backend Running',
        mode: 'USER TOKEN (⚠️ Risiko ban)',
        ready: !CONFIG.userToken.includes('MASUKKAN')
    });
});

// Validasi token (cek akun sendiri)
app.get('/api/validate', async (req, res) => {
    try {
        const response = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                'Authorization': CONFIG.userToken,  // ⚠️ TANPA "Bot "
                'User-Agent': CONFIG.userAgent
            }
        });
        const data = await response.json();
        if (response.ok) {
            res.json({ 
                valid: true, 
                user: `${data.username}#${data.discriminator}`,
                id: data.id
            });
        } else {
            res.json({ valid: false, error: data.message });
        }
    } catch (err) {
        res.json({ valid: false, error: err.message });
    }
});

// Endpoint kirim pesan (pakai user token)
app.post('/api/send', async (req, res) => {
    const { content, channelId } = req.body;
    const targetChannel = channelId || CONFIG.channelId;

    if (!content) {
        return res.status(400).json({ success: false, error: 'Content kosong' });
    }

    if (!CONFIG.userToken || CONFIG.userToken.includes('MASUKKAN')) {
        return res.status(500).json({ 
            success: false, 
            error: 'User token belum diisi' 
        });
    }

    try {
        // Jitter delay (hindari deteksi bot)
        await sleep(Math.random() * 2000 + 1000);

        const response = await fetch(
            `https://discord.com/api/v10/channels/${targetChannel}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': CONFIG.userToken,   // ⚠️ TANPA "Bot "
                    'Content-Type': 'application/json',
                    'User-Agent': CONFIG.userAgent,      // ⚠️ WAJIB
                    'X-Super-Properties': 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIn0=' // fingerprint palsu
                },
                body: JSON.stringify({ 
                    content: content,
                    tts: false
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            res.json({ 
                success: true, 
                messageId: data.id,
                status: response.status 
            });
        } else if (response.status === 429) {
            // Rate limited
            const retryAfter = data.retry_after || 5;
            res.status(429).json({ 
                success: false, 
                error: `Rate limited. Coba lagi dalam ${retryAfter}s`,
                retryAfter 
            });
        } else {
            res.status(response.status).json({ 
                success: false, 
                error: data.message || 'Gagal kirim',
                status: response.status 
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`⚠️  DisPost USER-TOKEN Backend jalan di port ${PORT}`);
    console.log(`⚠️  PERINGATAN: Penggunaan user token melanggar ToS Discord!`);
});
