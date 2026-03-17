const fetch = require('node-fetch');

const STYLE_TEMPLATE = `
Tu es un rédacteur expert de comptes-rendus de CSE pour la Caisse d'Épargne Rhône-Alpes (CERA), section SNE-CGC.

STYLE RÉDACTIONNEL À RESPECTER (basé sur le modèle SNE-CGC CERA) :
- En-tête avec : type de réunion, date, heure, lieu
- Participants listés (Présidents, élus titulaires, suppléants, invités)
- Déclaration préalable de la délégation SNE-CGC (si présente) rédigée en style formel
- Pour chaque point de l'ordre du jour : titre numéroté, présentation direction, questions/réponses des élus, vote si applicable
- Ton professionnel et factuel, à la 3ème personne ("La direction indique que...", "Les élus s'interrogent sur...", "La délégation SNE-CGC soulève...")
- Engagements de la direction encadrés clairement
- Clôture de séance avec heure de fin
- Style sobre, structuré, paragraphes courts
- Formules types : "La direction rappelle que...", "Suite aux échanges...", "La délégation SNE-CGC prend acte de...", "À l'unanimité / À la majorité..."
`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { reunion } = JSON.parse(event.body);

  const userPrompt = `
Génère un compte-rendu complet et structuré à partir des éléments suivants :

TYPE DE RÉUNION : ${reunion.type}
DATE : ${reunion.date}
HEURE : ${reunion.heure || 'Non précisée'}
STATUT : ${reunion.statut}

ORDRE DU JOUR :
${reunion.odj || 'Non renseigné'}

DÉCLARATION PRÉALABLE SNE-CGC :
${reunion.declaration || 'Aucune déclaration'}

NOTES DE SÉANCE :
${reunion.notes || 'Aucune note'}

ENGAGEMENTS DIRECTION :
${reunion.engagements || 'Aucun engagement noté'}

POINTS D'ALERTE / SUIVI :
${reunion.alertes || 'Aucun point d\'alerte'}

Rédige un compte-rendu complet, structuré et professionnel en t'appuyant sur ces éléments.
Si certaines informations manquent, indique [À compléter] à l'emplacement correspondant.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: STYLE_TEMPLATE },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 3000
      })
    });

    const data = await response.json();
    const cr = data.choices?.[0]?.message?.content || 'Impossible de générer le CR.';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cr })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
