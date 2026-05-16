import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON and large payloads (images)
  app.use(express.json({ limit: '10mb' }));

  // Gemini Initialization
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/analyze-drawing", async (req, res) => {
    try {
      const { imageData, promptType } = req.body;
      if (!imageData) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Remove base64 header
      const base64Data = imageData.split(',')[1];
      
      const prompts = {
        identify: "What is this drawing? Be concise and creative.",
        improve: "Suggest how to improve this sketch to make it more professional or artistic.",
        logo: "Convert this sketch into a professional logo concept description. Explain the symbolism.",
        caption: "Generate a creative, catchy, and witty caption for this drawing."
      };

      const prompt = prompts[promptType as keyof typeof prompts] || prompts.identify;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data
                }
              }
            ]
          }
        ]
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
