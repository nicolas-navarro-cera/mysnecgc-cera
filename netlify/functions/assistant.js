exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { question } = JSON.parse(event.body);

  const systemPrompt = `Tu es un assistant juridique spécialisé pour un élu SNE-CGC au CSE et à la CSSCT de la Caisse d'Épargne Rhône Alpes (CERA), groupe BPCE.

Contexte :
- L'élu est suppléant, collège Cadres, SNE-CGC
- L'entreprise est la Caisse d'Épargne Rhône Alpes (CERA), groupe BPCE
- Les instances concernées sont le CSE et la CSSCT
- Les sujets récurrents : réorganisation BDD, plan performance "tous acteurs de la performance", fermetures d'agences, RPS, conditions de travail réseau commercial, DCMM, AMM

Tes réponses doivent :
1. Citer les articles du Code du travail applicables
2. Préciser les droits et obligations de l'employeur
3. Préciser les droits et moyens d'action de l'élu CSE/CSSCT
4. Suggérer les démarches concrètes à envisager
5. Toujours rappeler en fin de réponse : "Cette réponse est indicative et ne remplace pas un conseil juridique professionnel. En cas de contentieux, consultez un avocat spécialisé en droit du travail ou le service juridique CFE-CGC."

Réponds toujours en français, de manière structurée et claire.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\nQuestion : ' + question }] }
          ],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse générée.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ answer: 'Erreur serveur. Réessayez dans quelques instants.' })
    };
  }
};
