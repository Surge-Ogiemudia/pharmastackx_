import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Allow up to 60s for vision AI calls on Vercel

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      console.error("📸 [ScanRX API] No image provided");
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    console.log("📸 [ScanRX API] Received image. Starting AI processing...");

    const prompt = `
      You are a pharmaceutical scanner reading a prescription image.
      List all medicines visible in the prescription. For each medicine extract:
      - name: The EXACT name as written (brand or generic). Do NOT substitute with alternatives.
      - strength: The dose (e.g. '500mg', '10mg/5ml').
      - form: MUST be one of: Tablet, Capsule, Syrup, Injection, Cream, Inhaler.
      - quantity: Total amount prescribed (number only).
      - unit: MUST be one of: Strips, Packs, Bottles, Vials, Sachets, Pieces.

      IMPORTANT:
      - Output ONLY the raw JSON array. No explanation. No thinking. No markdown. No extra text.
      - Format: [{"name": "...", "strength": "...", "form": "...", "quantity": 2, "unit": "Packs"}]
    `;

    // Handle base64 data (strip prefix if present)
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    console.log("📸 [ScanRX API] base64Data length:", base64Data.length);

    const generationModel = genAI.getGenerativeModel({ 
      model: "gemma-4-26b-a4b-it",
    });

    const result = await generationModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    console.log("📸 [ScanRX API] AI Response text length:", text.length);
    console.log("📸 [ScanRX API] RAW AI TEXT:", text.substring(0, 1000));

    let medicines;
    try {
        // Strip backticks and code fences
        const stripped = text.replace(/```json|```|`/gi, "");
        
        // Anchor on the first "name" key — skip all reasoning/echo text
        const nameIdx = stripped.indexOf('"name"');
        if (nameIdx === -1) throw new Error("No 'name' key found in AI response");
        
        // Backtrack from "name" to find the immediate enclosing { 
        let objStart = -1;
        for (let i = nameIdx; i >= 0; i--) {
          if (stripped[i] === '{') { objStart = i; break; }
        }
        if (objStart === -1) throw new Error("No opening brace before 'name' key");
        
        // Now check if there's a [ before the { (for array of medicines)
        // Skip whitespace backwards from objStart
        let startIdx = objStart;
        for (let i = objStart - 1; i >= 0; i--) {
          const ch = stripped[i];
          if (ch === '[') { startIdx = i; break; }         // found array wrapper
          if (ch !== ' ' && ch !== '\n' && ch !== '\r' && ch !== '\t') break; // non-whitespace = no array wrapper
        }
        
        const opener = stripped[startIdx];
        const closer = opener === '[' ? ']' : '}';
        let depth = 0, endIdx = -1;
        for (let i = startIdx; i < stripped.length; i++) {
          if (stripped[i] === opener) depth++;
          else if (stripped[i] === closer) { depth--; if (depth === 0) { endIdx = i; break; } }
        }
        if (endIdx === -1) throw new Error("Unbalanced JSON");
        
        const jsonString = stripped.substring(startIdx, endIdx + 1);
        console.log("📸 [ScanRX API] Extracted JSON string (first 500 chars):", jsonString.substring(0, 500));
        const parsed = JSON.parse(jsonString);
        medicines = parsed.medicines || parsed;
    } catch (e) {
        console.error("📸 [ScanRX API] JSON Parse Error:", e, "Raw text:", text);
        throw new Error("Failed to parse AI response into valid JSON.");
    }

    console.log("📸 [ScanRX API] Extracted medicines count:", Array.isArray(medicines) ? medicines.length : "N/A");

    return NextResponse.json({ medicines: Array.isArray(medicines) ? medicines : [] });

  } catch (error: any) {
    console.error("📸 [ScanRX API] Fatal Error:", error);
    return NextResponse.json({ 
      error: "Failed to read prescription. Please ensure the image is clear and contains a valid prescription.",
      details: error.message 
    }, { status: 500 });
  }
}
