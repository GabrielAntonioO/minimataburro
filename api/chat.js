// minimataburro/api/chat.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    return res.status(200).json({ mensaje: 'API lista. Usa POST.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No hay mensaje del usuario' });
  }

  const hasUserMessage = messages.some(m => m.role === 'user');
  if (!hasUserMessage) {
    return res.status(400).json({ error: 'Esperando mensaje del usuario' });
  }

  const systemPrompt = `Responde en 1 oración corta. Sin emojis. Directo. Sin preguntas.`;

  try {
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b', // ✅ CAMBIADO A ESTE
        messages: groqMessages,
        temperature: 0.1,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq error ${response.status}: ${err}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;

    aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, '');
    aiResponse = aiResponse.replace(/<\/?think>/g, '');
    aiResponse = aiResponse.replace(/Here's a thinking process:[\s\S]*?\n/g, '');
    aiResponse = aiResponse.replace(/\n+/g, ' ').trim();

    return res.status(200).json({ response: aiResponse });

  } catch (e) {
    console.error('Error en MiniMataburro:', e.message);
    return res.status(500).json({ error: { message: e.message } });
  }
}
