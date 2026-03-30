import { GoogleGenAI } from "@google/genai";

const MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash-preview'
];

export async function callGeminiAI(prompt: string, modelIndex = 0): Promise<string | null> {
  const apiKey = localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('Vui lòng cấu hình API Key!');
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = MODELS[modelIndex];
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    return response.text || '';
  } catch (error: any) {
    console.error(`Lỗi API với model ${MODELS[modelIndex]}:`, error);
    
    // Fallback logic
    if (modelIndex < MODELS.length - 1) {
      console.log(`Đang thử lại với model ${MODELS[modelIndex + 1]}...`);
      return callGeminiAI(prompt, modelIndex + 1);
    }
    
    return null;
  }
}
