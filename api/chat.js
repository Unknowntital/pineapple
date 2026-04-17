export default async function handler(req, res) {
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
    const { model, messages, max_tokens, temperature, top_p, stream } = req.body;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'google/gemma-2-2b-it',
        messages: messages || [],
        max_tokens: max_tokens || 1024,
        temperature: temperature || 0.7,
        top_p: top_p || 1,
        stream: !!stream
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || data.detail || 'Nvidia API Error' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Serverless Function Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
