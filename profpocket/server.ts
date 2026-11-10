import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Increase JSON payload limit to handle high-resolution receipt images (up to 20MB)
app.use(express.json({ limit: '20mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Receipt Scanning API Endpoint
app.post('/api/scan-receipt', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid or missing imageBase64 data in request body.',
      });
      return;
    }

    if (!ai) {
      // If API key is not yet set up, return informative error
      res.status(503).json({
        success: false,
        error: 'Gemini API key is not configured on the server. Please verify your AI Studio environment secrets.',
      });
      return;
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
    if (cleanBase64.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Empty base64 image data payload.',
      });
      return;
    }

    const safeMime = typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

    const imagePart = {
      inlineData: {
        mimeType: safeMime,
        data: cleanBase64,
      },
    };

    const textPrompt = `You are an expert optical character recognition (OCR) and receipt analysis system for the ProofPocket app.
Analyze this receipt image carefully.
Extract the following exact fields:
1. storeName: The store, vendor, or retailer name from the top header or logo.
2. purchaseDate: The transaction date in YYYY-MM-DD format (convert any format like MM/DD/YY, DD/MM/YYYY, etc. to YYYY-MM-DD). If year is 2 digits like 24 or 23, map to 2024 or 2023. If unreadable, return null.
3. totalAmount: The final total charge/amount paid as a numeric float.
4. currency: Currency symbol or code (e.g. USD, EUR, GBP, CAD, AUD, JPY).
5. productName: The primary or most significant product/item listed on the receipt.
6. detectedItems: An array of item names with their respective prices if identifiable.
7. suggestedCategory: One of: Electronics, Audio, Home Appliances, Wearables, Furniture, Tools & Gadgets, Computers, Other.
8. orderNumber: Invoice, order, transaction, or receipt number if visible.
9. rawText: The full extracted readable text from the receipt.
10. confidence: "high", "medium", or "low".

CRITICAL ACCURACY RULES:
- NEVER invent, guess, or hallucinate store names, prices, or dates that are not clearly visible on the receipt.
- If text is blurry or cut off, mark that field as null or empty string.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [imagePart, { text: textPrompt }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeName: { type: Type.STRING, description: 'Store or merchant name' },
            purchaseDate: { type: Type.STRING, description: 'Transaction date in YYYY-MM-DD format' },
            totalAmount: { type: Type.NUMBER, description: 'Total price paid' },
            currency: { type: Type.STRING, description: 'Currency code or symbol' },
            productName: { type: Type.STRING, description: 'Primary product or item name' },
            suggestedCategory: { type: Type.STRING, description: 'Suggested category' },
            orderNumber: { type: Type.STRING, description: 'Invoice or receipt number' },
            rawText: { type: Type.STRING, description: 'Raw extracted OCR text' },
            confidence: { type: Type.STRING, description: 'Extraction confidence' },
            detectedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                },
              },
            },
          },
          required: ['storeName', 'totalAmount'],
        },
      },
    });

    let rawOutput = (response.text || '{}').trim();
    // Strip possible markdown fences if returned
    rawOutput = rawOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsedJson: any = {};
    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      parsedJson = {
        storeName: 'Unrecognized Retailer',
        totalAmount: 0,
        rawText: rawOutput,
        confidence: 'low',
      };
    }

    res.json({
      success: true,
      data: parsedJson,
    });
  } catch (error: any) {
    console.error('[Receipt Scanner Server Error]:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to scan receipt image.',
    });
  }
});

// Mount Vite middleware in development
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ProofPocket Full-Stack] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
