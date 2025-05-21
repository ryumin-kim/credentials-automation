const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Supabase 연결
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ 루트 확인
app.get('/', (req, res) => {
  res.send('n8n Credential Proxy is running 🚀');
});

// 🔐 Credential 생성
app.post('/proxy/credentials/create', async (req, res) => {
  const { n8nUrl, apiKey, credential, method, userId } = req.body;

  if (!n8nUrl || !apiKey || !credential || !method || !userId) {
    return res.status(400).json({ error: 'Missing required fields: n8nUrl, apiKey, credential, method, userId' });
  }

  try {
    const cleanedUrl = n8nUrl.replace(/\/+$/, '');

    // 🔄 OAuth 방식일 경우 Supabase에서 token 자동 주입
    if (method === 'oauth') {
      const { data: tokenRow, error } = await supabase
        .from('auth_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('credential_type', credential.type)
        .eq('method', 'oauth')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error || !tokenRow) {
        return res.status(404).json({ error: 'OAuth token not found in Supabase' });
      }

      const oauthMap = credential.oauthfieldmap || {};
      for (const [n8nField, supabaseField] of Object.entries(oauthMap)) {
        credential.data[n8nField] = tokenRow[supabaseField];
      }
    }

    // ☑️ Google 계열은 clientId/clientSecret 자동 삽입
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

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Credential creation failed', details: err.message });
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
    const cleanedUrl = n8nUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanedUrl}/api/v1/credentials/${id}`, {
      method: 'DELETE',
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    const data = await response.json();
    if (response.ok) {
      res.json({ message: `Credential ${id} deleted` });
    } else {
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
    const cleanedUrl = n8nUrl.replace(/\/+$/, '');
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
app.listen(PORT, () => console.log(`✅ n8n Credential Proxy running on port ${PORT}`));
