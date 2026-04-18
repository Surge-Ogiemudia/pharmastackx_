import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Gemini model
// Make sure to set up your GEMINI_API_KEY in your environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" });

export async function POST(req: NextRequest) {
  try {
    const { userInput } = await req.json();

    if (!userInput) {
      return NextResponse.json({ error: "User input is required" }, { status: 400 });
    }

    // This prompt is specifically engineered to get structured, relevant suggestions from Gemma 4
    const prompt = `
      You are an expert in pharmaceuticals available in Nigeria. A user is searching for a medicine.
      Based on their input, "${userInput}", provide a list of up to 7 relevant medicine suggestions.
      Only return a valid JSON array of objects, where each object has a "label" key.
      Example: [{"label": "Paracetamol 500mg Tablet"}, {"label": "Augmentin 625mg Tablet"}]
      Only return the JSON array, with no other text, reasoning, or markdown.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Clean the response to ensure it's valid JSON (handles reasoning/markdown)
    let jsonString = text.replace(/```json|```/gi, "").trim();
    const lastStartIndex = jsonString.lastIndexOf('[');
    const lastEndIndex = jsonString.lastIndexOf(']');
    if (lastStartIndex !== -1 && lastEndIndex !== -1 && lastEndIndex > lastStartIndex) {
        jsonString = jsonString.substring(lastStartIndex, lastEndIndex + 1);
    }
    
    const suggestions = JSON.parse(jsonString);
    return NextResponse.json(suggestions);

  } catch (error: any) {
    console.error("Error generating suggestions from Gemini:", error);
    
    const isRateLimit = error.message?.includes('429') || error.status === 429;
    
    if (isRateLimit) {
      return NextResponse.json({ error: "AI_BUSY" }, { status: 429 });
    }

    // Return an empty array on generic error to prevent the frontend from crashing
    return NextResponse.json([], { status: 500 });
  }
}
