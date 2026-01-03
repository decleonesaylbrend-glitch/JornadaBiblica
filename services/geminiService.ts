
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateSundayDevotional = async (readings: string[], focus: string) => {
  try {
    const prompt = `Você é um mentor espiritual e teólogo. Analise as leituras bíblicas da semana passada: ${readings.join(', ')}. 
    O tema do trimestre é: "${focus}".
    Gere um devocional inspirador para o domingo (Dia de Descanso).
    O devocional deve incluir:
    1. Um título cativante.
    2. Um versículo chave da semana.
    3. Uma reflexão profunda conectando as leituras ao tema do trimestre.
    4. Três pontos práticos para a semana seguinte.
    5. Uma oração de encerramento.
    Responda em JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            verse: { type: Type.STRING },
            reflection: { type: Type.STRING },
            practicalPoints: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            prayer: { type: Type.STRING }
          },
          required: ["title", "verse", "reflection", "practicalPoints", "prayer"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error generating devotional:", error);
    return null;
  }
};

export const getMessianicConnection = async (reading: string) => {
  try {
    const prompt = `Atue como um teólogo cristocêntrico. Explique em no máximo 3 parágrafos como a passagem "${reading}" aponta para Jesus Cristo ou se conecta ao Fio Escarlate da Redenção.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "Não foi possível carregar a conexão messiânica no momento.";
  }
};

export const generateWeeklyPhrase = async (theme: string) => {
  try {
    const prompt = `Gere uma frase curta e poderosa de motivação espiritual baseada no tema bíblico da semana: "${theme}". A frase deve ser encorajadora para quem está em uma jornada de leitura bíblica anual.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "Toda a Escritura é divinamente inspirada e proveitosa.";
  }
};

export const searchDictionaryTerm = async (term: string) => {
  try {
    const prompt = `Defina o termo bíblico/teológico "${term}" de forma clara e profunda. Retorne em JSON com "term" e "definition".`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING }
          },
          required: ["term", "definition"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
};

export const fetchBibleTextFromAI = async (reference: string, version: string): Promise<string> => {
  try {
    const prompt = `Forneça o texto da passagem "${reference}" na versão "${version}". Retorne apenas o texto, numerando os versículos. Se for SCOFIELD, use a base ARC.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Texto não disponível.";
  } catch (error) {
    throw error;
  }
};
