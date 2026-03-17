exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { question } = JSON.parse(event.body || '{}');
  if (!question) return { statusCode: 400, body: JSON.stringify({ error: 'Question manquante' }) };

  // ÉTAPE 1 : Recherche web via Tavily
  let webContext = '';
  try {
    const searchRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: question + ' droit travail France CSE accord entreprise',
        search_depth: 'basic',
        include_domains: ['legifrance.gouv.fr', 'service-public.fr', 'snecgc-ceapc.fr', 'cfecgc.fr'],
        max_results: 4
      })
    });
    const searchData = await searchRes.json();
    if (searchData.results?.length) {
      webContext = searchData.results
        .map(r => `SOURCE: ${r.url}\n${r.content}`)
        .join('\n\n---\n\n');
    }
  } catch (e) {
    webContext = '';
  }

  // ÉTAPE 2 : Groq répond avec le contexte web
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
Tu réponds en t'appuyant EN PRIORITÉ sur les sources web fournies ci-dessous.
Tu cites toujours la source (URL ou article de loi) dans ta réponse.
Tu réponds en français, de façon structurée et pratique.
Tu rappelles que tes réponses ne remplacent pas un conseil juridique professionnel.

=== SOURCES WEB RÉCUPÉRÉES ===
${webContext || 'Aucune source web disponible, réponse basée sur ta connaissance générale.'}
`
        },
        { role: 'user', content: question }
      ],
      max_tokens: 900,
      temperature: 0.3
    })
  });

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || 'Aucune réponse générée.';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer })
  };
};
