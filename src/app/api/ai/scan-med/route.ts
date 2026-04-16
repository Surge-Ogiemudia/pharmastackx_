import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Allow up to 60s for vision AI calls on Vercel

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      console.error("📸 [ScanMed API] No image provided");
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    console.log("📸 [ScanMed API] Received image. Starting AI processing...");

    const prompt = `
      You are a pharmaceutical scanner. Look at this medicine image and extract these EXACT fields:
      - name: The EXACT brand name as written on the packaging. Do NOT guess or use generic alternatives.
      - strength: The dosage (e.g. '500mg', '10mg/5ml', '30g').
      - form: MUST be one of: Tablet, Capsule, Syrup, Injection, Cream, Inhaler, Drops.
      - quantity: A number (e.g. 30).
      - unit: MUST be one of: Strips, Packs, Bottles, Vials, Sachets, Pieces.

      IMPORTANT:
      - Output ONLY the raw JSON object. No explanation. No thinking. No markdown. No extra text.
      - Return a SINGLE JSON object like this (keys must match exactly):
      {"name": "...", "strength": "...", "form": "...", "quantity": 1, "unit": "Packs"}
    `;

    // Handle base64 data (strip prefix if present)
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    console.log("📸 [ScanMed API] base64Data length:", base64Data.length);

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
    console.log("📸 [ScanMed API] AI Response text length:", text.length);
    console.log("📸 [ScanMed API] RAW AI TEXT:", text.substring(0, 1000));

    let medicines;
    try {
        // Strip backticks and code fences
        const stripped = text.replace(/```json|```|`/gi, "");
        
        // Anchor on the first "name" key — skip all reasoning/echo text
        const nameIdx = stripped.indexOf('"name"');
        if (nameIdx === -1) throw new Error("No 'name' key found in AI response");
        
        // Backtrack from "name" to find the enclosing {
        let startIdx = -1;
        for (let i = nameIdx; i >= 0; i--) {
          if (stripped[i] === '{') { startIdx = i; break; }
        }
        if (startIdx === -1) throw new Error("No opening brace before 'name' key");
        
        // Depth-walk forward to find the balanced }
        let depth = 0, endIdx = -1;
        for (let i = startIdx; i < stripped.length; i++) {
          if (stripped[i] === '{') depth++;
          else if (stripped[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
        }
        if (endIdx === -1) throw new Error("Unbalanced JSON object");
        
        const jsonString = stripped.substring(startIdx, endIdx + 1);
        console.log("📸 [ScanMed API] Extracted JSON string:", jsonString);
        medicines = JSON.parse(jsonString);
    } catch (e) {
        console.error("📸 [ScanMed API] JSON Parse Error:", e, "Raw text:", text);
        throw new Error("Failed to parse AI response into valid JSON.");
    }

    // Ensure it's returned as a single medicine in an array for compatibility with the frontend callback
    return NextResponse.json({ medicines: Array.isArray(medicines) ? medicines : [medicines] });

  } catch (error: any) {
    console.error("📸 [ScanMed API] Fatal Error:", error);
    return NextResponse.json({ 
      error: "Failed to identify medicine. Please ensure the label is clear and readable.",
      details: error.message 
    }, { status: 500 });
  }
}
