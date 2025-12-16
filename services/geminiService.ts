import { GoogleGenAI, Type } from "@google/genai";

// We use Gemini here to simulate how the n8n workflow might respond to a message
// This allows the user to test their "System Prompt" directly in the UI before deploying.

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. Gemini features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const simulateModerationResponse = async (
  userMessage: string,
  tone: string = "Professional and Empathetic"
) => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key not found");

  const prompt = `
    You are a social media moderation AI for a business.
    The business uses an n8n workflow to auto-reply to customers.
    
    Customer Message: "${userMessage}"
    Desired Tone: ${tone}
    
    Task:
    1. Analyze the sentiment of the message.
    2. Draft a response that answers the user or acknowledges their concern based on the desired tone.
    3. Explain why you chose this response.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, enum: ["Positive", "Negative", "Neutral"] },
            suggestedReply: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["sentiment", "suggestedReply", "reasoning"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("No response text generated");
  } catch (error) {
    console.error("Gemini Simulation Error:", error);
    throw error;
  }
};
