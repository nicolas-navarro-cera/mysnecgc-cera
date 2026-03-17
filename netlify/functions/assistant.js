exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { question } = JSON.parse(event.body || '{}');
  if (!question) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Question manquante' }) };
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Tu es un assistant juridique expert SNE-CGC spécialisé dans le droit du travail français, 
          les instances représentatives du personnel (CSE, CSSCT), les accords BPCE et Caisse d'Épargne Rhône Alpes (CERA). 
          Tu réponds de façon précise, structurée et pratique en français. 
          Tu cites les articles de loi pertinents quand c'est utile.
          Tu rappelles que tes réponses ne remplacent pas un conseil juridique professionnel.`
        },
        {
          role: 'user',
          content: question
        }
      ],
      max_tokens: 800,
      temperature: 0.4
    })
  });

  const data = await response.json();

  if (data.error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ answer: `Erreur : ${data.error.message}` })
    };
  }

  const answer = data.choices?.[0]?.message?.content || 'Aucune réponse générée.';
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer })
  };
};
