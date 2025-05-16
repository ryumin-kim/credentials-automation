const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('n8n Credential Creation Proxy is running 🚀');
});

// 📋 크레덴셜 생성 요청
app.post('/proxy/credentials/create', async (req, res) => {
  const { n8nUrl, apiKey, credentialName, credentialType, apiKeyDetails } = req.body;
  
  try {
    const cleanedUrl = n8nUrl.replace(/\/+$/, "");
    
    const response = await fetch(`${cleanedUrl}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey
      },
      body: JSON.stringify({
        name: credentialName,
        type: credentialType,
        nodesAccess: [],
        data: apiKeyDetails, // API 키나 Client Secret 등 크레덴셜에 필요한 데이터
      })
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({ message: 'Credential created successfully', data });
    } else {
      res.status(response.status).json({ error: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 필요한 다른 엔드포인트도 추가하기
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Credential Creation Proxy running on port ${PORT}`));
