
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ImageSize, AspectRatio } from "../types";

// Helper for Base64 conversion
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const checkApiKey = async () => {
  if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
    return await window.aistudio.hasSelectedApiKey();
  }
  return true; // Fallback for environments where aistudio is not injected
};

export const openApiKeyDialog = async () => {
  if (typeof window.aistudio?.openSelectKey === 'function') {
    await window.aistudio.openSelectKey();
  }
};

export const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const chatAssistant = async (history: { role: string; parts: { text: string }[] }[], message: string) => {
  const ai = getAiClient();
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are a creative YouTube strategist. Help the user brainstorm video ideas, write scripts, titles, and SEO-friendly descriptions. Be concise and inspiring.",
    },
  });
  
  // Since we aren't using the internal history management of the SDK here for simplicity in UI state,
  // we just send a single message or manage manually. 
  // Real implementation would use chat.sendMessage
  const response = await chat.sendMessage({ message });
  return response.text;
};

export const generateImage = async (prompt: string, size: ImageSize) => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: size
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned");
};

export const editImage = async (prompt: string, currentImageBase64: string) => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: currentImageBase64.replace(/^data:image\/\w+;base64,/, ""),
            mimeType: 'image/png',
          },
        },
        { text: prompt },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned from editing");
};

export const generateVideoFromText = async (prompt: string, ratio: AspectRatio) => {
  const ai = getAiClient();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: ratio
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const animateImage = async (prompt: string, imageBase64: string, ratio: AspectRatio) => {
  const ai = getAiClient();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: {
      imageBytes: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: ratio
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
