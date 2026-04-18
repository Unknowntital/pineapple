export default async function handler(req, res) {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // The process.env.NVIDIA_API_KEY will be set in Vercel Dashboard
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'NVIDIA API key not configured on server.' });
  }

  try {
    // Extract request payload
    let { model, messages, max_tokens, temperature, top_p, stream } = req.body || {};

    // Input Validation
    if (!messages || !Array.isArray(messages) || messages.length > 50) {
      return res.status(400).json({ error: 'Invalid or too many messages.' });
    }

    // Enforce limits
    const safeMaxTokens = Math.min(Number(max_tokens) || 1024, 2048);
    const safeTemperature = Math.min(Math.max(Number(temperature) || 0.7, 0), 2);
    const safeTopP = Math.min(Math.max(Number(top_p) || 1, 0), 1);

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'google/gemma-2-2b-it',
        messages: messages,
        max_tokens: safeMaxTokens,
        temperature: safeTemperature,
        top_p: safeTopP,
        stream: !!stream
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData) {
        return res.status(response.status).json({ error: errorData.error || errorData.detail || 'Nvidia API Error' });
      }
      return res.status(response.status).json({ error: 'Nvidia API Error' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Serverless Function Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
