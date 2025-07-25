import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Note: it's OPENAI_API_KEY, not OPEN_AI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language,customPrompt } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    // Create a detailed prompt for better suggestions
    const prompt = `
Analyze this ${
      language || "code"
    } and provide helpful suggestions for improvement:

CODE:
\`\`\`${language || "text"}
${code}
\`\`\`

${customPrompt ? customPrompt : ""}
`;

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo", // Using gpt-3.5-turbo as it's more cost-effective
      messages: [
        {
          role: "system",
          content:
            "You are an expert code reviewer and programming mentor. Provide concise, actionable suggestions to improve code quality, performance, and best practices.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    console.log("OpenAI response:", response);
    const suggestions =
      response.choices[0]?.message?.content
        ?.split("\n")
        .filter(
          (line) =>
            line.trim().startsWith("•") ||
            line.trim().startsWith("-") ||
            /^[0-9]/.test(line.trim()) ||
            /^[🔥💡⚡🚀✨🔧📊🐛]/u.test(line.trim())
        )
        .map((line) => line.replace(/^[•\-0-9.\s]+/, "").trim())
        .filter((line) => line.length > 10) || [];

    return NextResponse.json({
      suggestions:
        suggestions.length > 0
          ? suggestions
          : [
              "💡 Consider adding error handling with try-catch blocks",
              "🚀 Look into optimizing your algorithm for better performance",
              "✨ Add input validation to handle edge cases",
              "🔧 Consider breaking down complex functions into smaller ones",
              "📊 Add meaningful variable names for better readability",
            ],
    });
  } catch (error) {
    console.error("OpenAI API Error:", error);

    // Return fallback suggestions if OpenAI fails
    return NextResponse.json({
      suggestions: [
        "💡 Consider adding error handling with try-catch blocks",
        "🚀 Look into optimizing your algorithm for better performance",
        "✨ Add input validation to handle edge cases",
        "🔧 Consider breaking down complex functions into smaller ones",
        "📊 Add meaningful variable names for better readability",
      ],
      fallback: true,
    });
  }
}
