import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Gemini model
// Make sure to set up your GEMINI_API_KEY in your environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { userInput } = await req.json();

    if (!userInput) {
      return NextResponse.json({ error: "User input is required" }, { status: 400 });
    }

    // This prompt is specifically engineered to get structured, relevant suggestions from Gemini
    const prompt = `
      You are an expert in pharmaceuticals available in Nigeria. A user is searching for a medicine.
      Based on their input, "${userInput}", provide a list of up to 7 relevant medicine suggestions.
      The user might be typing a brand name, a generic name, a symptom, or a drug class.
      Return the suggestions as a valid JSON array of objects, where each object has a "label" key.
      For example: [{"label": "Paracetamol 500mg Tablet"}, {"label": "Augmentin 625mg Tablet"}]
      If the input is a symptom (e.g., "headache"), suggest common over-the-counter treatments.
      Only return the JSON array, with no other text, comments, or markdown.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response to ensure it's valid JSON before parsing
    const jsonString = text.replace(/```json|```/g, "").trim();
    const suggestions = JSON.parse(jsonString);

    return NextResponse.json(suggestions);

  } catch (error) {
    console.error("Error generating suggestions from Gemini:", error);
    // Return an empty array on error to prevent the frontend from crashing
    return NextResponse.json([], { status: 500 });
  }
}
