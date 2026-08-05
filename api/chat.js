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

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Falta historial de mensajes' });
  }

  // Prompt para respuestas concisas (Apple Watch)
  const systemPrompt = `Eres un asistente IA para Apple Watch. Responde de forma EXTREMADAMENTE CONCISA (máximo 2 oraciones). Directa, sin rodeos, sin amabilidades, sin cortesías. Ve al grano. Sin emojis, sin saludos, sin despedidas. Pero si te agradecen, no seas descortes. Solo responde corto, por ejemplo, si te dicen gracias, di De nada`;

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
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.3,
        max_tokens: 128
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    const respuestaFinal = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    return res.status(200).json({ response: respuestaFinal });

  } catch (e) {
    console.error('Error en MiniMataburro:', e.message);
    return res.status(500).json({ error: { message: e.message } });
  }
}
