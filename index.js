const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('n8n Credential Proxy is running 🚀');
});

// 🔐 Credential 생성
app.post('/proxy/credentials/create', async (req, res) => {
  const { n8nUrl, apiKey, credential } = req.body;

  if (!n8nUrl || !apiKey || !credential) {
    return res.status(400).json({ error: 'Missing required fields: n8nUrl, apiKey, credential' });
  }

  try {
    const cleanedUrl = n8nUrl.replace(/\/+\$/, "");

    // ✅ 구글 계열은 서버에서 clientId/clientSecret 주입
    if (credential.type.toLowerCase().includes('google')) {
      if (!credential.data.clientId) {
        credential.data.clientId = process.env.GOOGLE_CLIENT_ID;
      }
      if (!credential.data.clientSecret) {
        credential.data.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      }
    }

    const response = await fetch(`${cleanedUrl}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credential),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ Credential 삭제
app.delete('/delete-credential/:id', async (req, res) => {
  const { id } = req.params;
  const { n8nUrl, apiKey } = req.body;

  if (!n8nUrl || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields: n8nUrl, apiKey' });
  }

  try {
    const cleanedUrl = n8nUrl.replace(/\/+\$/, "");
    const response = await fetch(`${cleanedUrl}/api/v1/credentials/${id}`, {
      method: 'DELETE',
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (response.ok) {
      res.json({ message: `Credential ${id} deleted` });
    } else {
      const data = await response.json();
      res.status(response.status).json({ error: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 Credential 스키마 조회
app.get('/get-schema/:type', async (req, res) => {
  const { type } = req.params;
  const { n8nUrl, apiKey } = req.query;

  if (!n8nUrl || !apiKey) {
    return res.status(400).json({ error: 'Missing required query params: n8nUrl, apiKey' });
  }

  try {
    const cleanedUrl = n8nUrl.replace(/\/+\$/, "");
    const response = await fetch(`${cleanedUrl}/api/v1/credentials/schema/${type}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`n8n Credential Proxy running on port ${PORT}`));
