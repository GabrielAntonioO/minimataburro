// minimataburro/api/chat.js
export default async function handler(req, res) {
  // Configurar CORS y tipo de contenido
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Solo aceptar método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Obtener mensajes del cuerpo de la petición
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Falta historial de mensajes' });
  }

  // ============ PROMPT DE SISTEMA PARA MINIMATABURRO ============
  const systemPrompt = `Eres un asistente IA para Apple Watch. Debes responder de forma:
- EXTREMADAMENTE CONCISA (máximo 2 oraciones)
- DIRECTA, sin rodeos, sin amabilidades, sin cortesías
- EFECTIVA: ve al grano, da la solución o respuesta exacta
- Sin emojis, sin saludos, sin despedidas
- Si es una pregunta de conocimiento, da la respuesta exacta y breve
- Si es un problema, da la solución paso a paso pero en 1-2 oraciones
- No uses pronombres como "yo" o "tú", solo el hecho
- Responde como si fueras una herramienta, no una persona`;

  try {
    // Preparar mensajes para Groq
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    ];

    // Llamar a la API de Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: groqMessages,
        temperature: 0.3,
        max_tokens: 128,
        top_p: 1
      })
    });

    // Verificar si la respuesta de Groq fue exitosa
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq error ${response.status}: ${err}`);
    }

    // Procesar respuesta
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Limpiar etiquetas <think> si aparecen
    const respuestaFinal = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Devolver respuesta
    return res.status(200).json({ response: respuestaFinal });

  } catch (e) {
    console.error('Error en MiniMataburro:', e.message);
    return res.status(500).json({ error: 'Error consultando la IA: ' + e.message });
  }
}
