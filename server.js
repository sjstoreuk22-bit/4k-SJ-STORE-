const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// AAPKA CHANNEL URL
const SOURCE_URL = 'https://xtv.ooo/0067804946/4761032132/167574.ts';

let centralStream = null;
const clients = new Set();

// Stream Management Logic
function startSourceStream() {
    if (centralStream) return;

    console.log("Connecting to IPTV Source...");
    axios({
        method: 'get',
        url: SOURCE_URL,
        responseType: 'stream',
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://xtv.ooo/' 
        }
    }).then(response => {
        centralStream = response.data;
        
        centralStream.on('data', (chunk) => {
            clients.forEach(client => client.write(chunk));
        });

        centralStream.on('end', () => {
            console.log("Source connection closed.");
            clients.forEach(client => client.end());
            centralStream = null;
        });

        centralStream.on('error', (err) => {
            console.error("Stream Error:", err.message);
            centralStream = null;
        });

    }).catch(err => {
        console.error("Connection Failed:", err.message);
        centralStream = null;
        setTimeout(startSourceStream, 5000); // Auto-retry every 5 seconds
    });
}

// Endpoint for the player
app.get('/live.ts', (req, res) => {
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Cache-Control', 'no-cache');
    
    clients.add(res);
    startSourceStream();

    req.on('close', () => {
        clients.delete(res);
        // Pure efficiency: Optional to stop stream if 0 clients
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => console.log(`Server started at http://localhost:${port}`));
