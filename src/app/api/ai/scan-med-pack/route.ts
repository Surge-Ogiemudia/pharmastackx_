import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    const prompt = `
      You are an expert pharmaceutical vision scanner for wholesale pharmaceutical inventory.
      Analyze this medicine packaging photo and extract the following details:
      
      1. itemName: The full brand/trade name with strength (e.g., "Augmentin 625mg", "Emzor Paracetamol 500mg", "Lonart DS").
      2. activeIngredient: The chemical or generic active pharmaceutical ingredient (e.g., "Amoxicillin + Clavulanic acid", "Paracetamol", "Artemether + Lumefantrine").
      3. category: Choose the best match among:
         ["Analgesics", "Antibiotics", "Antimalarials", "Vitamins", "Cardiovascular", "Dermatology", "Gastrointestinal", "Respiratory", "Others"]
      4. minSalesUnit: The wholesale packaging form indicated on the pack, or the standard wholesale unit. Choose from or format as:
         "1 Carton", "1 Box", "1 Roll", "Pack of 10", "Pack of 50", "Carton of 50", "1 Pack", or a specific packaging description like "Box of 14 Tablets".

      IMPORTANT:
      - Output strictly valid JSON ONLY with these keys: itemName, activeIngredient, category, minSalesUnit.
      - Do not include markdown codeblocks (\`\`\`json). Just the raw JSON string.
    `;

    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    let responseText = "";

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ]);
      responseText = result.response.text();
    } catch (primaryErr: any) {
      console.warn("[ScanMedPack] gemini-2.5-flash failed, falling back to gemini-1.5-flash:", primaryErr.message);
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const fallbackResult = await fallbackModel.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ]);
      responseText = fallbackResult.response.text();
    }

    let parsed: any = {};
    try {
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("[ScanMedPack] JSON parse error:", parseErr, "Raw output:", responseText);
      parsed = {
        itemName: "Scanned Medicine",
        activeIngredient: "See packaging",
        category: "Others",
        minSalesUnit: "1 Carton",
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        itemName: parsed.itemName || "",
        activeIngredient: parsed.activeIngredient || "",
        category: parsed.category || "Others",
        minSalesUnit: parsed.minSalesUnit || "1 Carton",
        imageUrl: image,
      }
    });
  } catch (error: any) {
    console.error("❌ [ScanMedPack API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to scan medicine pack" },
      { status: 500 }
    );
  }
}
