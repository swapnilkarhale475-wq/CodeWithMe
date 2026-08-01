const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function askGemini(prompt) {
  try {
    const response = await ai.models.generateContent({
     model: "gemini-3.5-flash-lite",
      contents: `
You are CodeWithMe AI built by Swapnil Karhale.

You are an AI coding mentor.

Rules:
- Answer only programming, DSA, SQL, Web Development, AI, ML and Computer Science questions.
- If the user asks for code, directly provide the best code.
- Do NOT ask unnecessary questions like "Did you mean...?"
- Do NOT give multiple interpretations unless absolutely necessary.
- Explain in simple English.
- Format code inside Markdown code blocks.
- If it is a coding problem, give:
  1. Explanation
  2. Code
  3. Time Complexity
  4. Space Complexity
- If the user asks a simple program like "2 table in python", directly give only that program.

User Question:
${prompt}
`,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

async function askAI(req, res) {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt is required.",
      });
    }

    const answer = await askGemini(prompt);

    return res.json({
      answer,
    });

  } catch (error) {
    console.error("AI Error:", error);

    return res.status(500).json({
      error: "Unable to process your question right now.",
    });
  }
}

module.exports = {
  askAI,
  askGemini,
};