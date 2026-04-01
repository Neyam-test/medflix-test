import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message requis." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Clé API Gemini manquante." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Construire l'historique de conversation pour Gemini
    const contents: any[] = [];

    // System instruction via premier message
    contents.push({
      role: "user",
      parts: [{ text: "Tu es l'Assistant Medflix, un assistant pédagogique spécialisé en médecine pour les étudiants marocains (FMPC Casablanca). Tu réponds en français, de manière claire, concise et pédagogique. Tu peux expliquer des concepts médicaux, aider à comprendre des cours, résumer des passages de documents, et aider à préparer les examens. Si on te pose une question hors du domaine médical/universitaire, réponds poliment que tu es spécialisé en médecine. Sois encourageant et bienveillant avec les étudiants." }]
    });
    contents.push({
      role: "model",
      parts: [{ text: "Compris ! Je suis l'Assistant Medflix, prêt à aider les étudiants en médecine de la FMPC. Je répondrai en français, de manière pédagogique et encourageante. Comment puis-je vous aider ?" }]
    });

    // Ajouter l'historique des messages précédents
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    // Ajouter le message actuel
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Appel à l'API Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Erreur Gemini:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Erreur Gemini", details: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Extraire la réponse
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse.";

    return new Response(JSON.stringify({ reply: reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error("Erreur Edge Function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
