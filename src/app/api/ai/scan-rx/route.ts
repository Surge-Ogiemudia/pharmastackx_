import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemma-4-26b-a4b-it",
  generationConfig: { responseMimeType: "application/json" }
});

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      console.error("📸 [ScanRX API] No image provided");
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    console.log("📸 [ScanRX API] Received image. Starting AI processing...");

    const prompt = `
      You are an expert pharmacist helping a patient find their medicines. 
      Identify all medications listed in this prescription image. 
      Extract the following for each medicine:
      - name: The medicine's brand or generic name.
      - strength: The dose (e.g., '500mg', '10mg/5ml').
      - form: One of ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Inhaler"].
      - quantity: The total amount prescribed (as a number).
      - unit: One of ["Strips", "Packs", "Bottles", "Vials", "Sachets", "Pieces"]. Pick the most appropriate packaging unit.

      Return ONLY a JSON array of these objects.
      Example: [{"name": "Paracetamol", "strength": "500mg", "form": "Tablet", "quantity": 2, "unit": "Packs"}]
    `;

    // Handle base64 data (strip prefix if present)
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    // Use gemma-4-26b-a4b-it for consistency
    const generationModel = genAI.getGenerativeModel({ 
      model: "gemma-4-26b-a4b-it",
      generationConfig: { responseMimeType: "application/json" }
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

    let medicines;
    try {
        let jsonString = text.replace(/```json|```/gi, "").trim();
        
        // Find the first [ or { and the last ] or }
        const startIdx = jsonString.search(/[\{\[]/);
        // Find the last occurrence of } or ]
        const endIdxObj = jsonString.lastIndexOf('}');
        const endIdxArr = jsonString.lastIndexOf(']');
        const endIdx = Math.max(endIdxObj, endIdxArr);

        if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
            jsonString = jsonString.substring(startIdx, endIdx + 1);
        }

        const parsed = JSON.parse(jsonString);
        medicines = parsed.medicines || parsed; // Handle wrapping if present
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
