import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

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
      You are an expert pharmacist helper. 
      Identify the specific medicine product shown in this image (likely a box or bottle). 
      Extract the following details:
      - name: The brand or generic name of the medicine.
      - strength: The dosage strength (e.g., '500mg', '20mg/5ml').
      - form: One of ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Inhaler", "Drops"].
      - quantity: The number of items in the pack (e.g., 30 for 30 tablets).
      - unit: One of ["Strips", "Packs", "Bottles", "Vials", "Sachets", "Pieces"].

      Return ONLY a JSON object (not an array) with these fields.
      Example: {"name": "Panadol", "strength": "500mg", "form": "Tablet", "quantity": 1, "unit": "Packs"}
    `;

    // Handle base64 data (strip prefix if present)
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    // Use gemini-2.5-flash for consistency with other working routes in this project
    const generationModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
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
    console.log("📸 [ScanMed API] AI Response text:", text);

    // Robust JSON parsing with fallback cleanup
    let medicines;
    try {
      medicines = JSON.parse(text);
    } catch {
      console.warn("📸 [ScanMed API] Simple JSON parse failed, attempting cleanup...");
      const jsonString = text.replace(/```json|```/g, "").trim();
      medicines = JSON.parse(jsonString);
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
