import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API route for AI opinion calculation
  app.post("/api/analyze", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const { masses, balRadius, resultantForce, resultantAngleDeg, balancingMass, balancingAngleDeg, massUnit, lengthUnit } = req.body;

      const prompt = `
        As a mechanical engineering expert, analyze the following rotating mass balancing problem:
        We have a system of rotating masses:
        ${JSON.stringify(masses, null, 2)}
        Balancing Radius: ${balRadius} ${lengthUnit}
        Resultant Unbalance: ${resultantForce} ${massUnit}·${lengthUnit} at ${resultantAngleDeg}°
        Required Balancing Mass: ${balancingMass} ${massUnit} at ${balancingAngleDeg}°

        Please provide a concise, expert opinion on this result. Use Google Search to ground your insights with real-world examples or industry standards for rotating machinery unbalance limits (like ISO 1940 or API standards). Briefly explain:
        1. What the resultant unbalance means for the system (vibration, bearing wear).
        2. How the balancing mass effectively neutralizes this unbalance.
        3. Any practical considerations when physically mounting a mass of this size.

        Keep the response professional, easy to read, and formatted in Markdown. Do not repeat the exact math, just interpret it.
      `;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          }
        });
      } catch (error: any) {
        let isQuotaExceeded = false;
        try {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            isQuotaExceeded = true;
          }
        } catch (e) {}

        if (isQuotaExceeded) {
          console.warn("Search quota exceeded. Retrying without Google Search grounding...");
          try {
            // Retry without search grounding
            response = await ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: prompt,
            });
          } catch (retryError: any) {
            // If it still fails with quota, provide a graceful fallback analysis
            response = {
              text: `**AI Analysis Unavailable (Quota Exceeded)**\n\nThe Gemini API has reached its rate limit. However, based on your inputs:\n- **Resultant Unbalance**: ${resultantForce} ${massUnit}·${lengthUnit} at ${resultantAngleDeg}°\n- **Required Balancing Mass**: ${balancingMass} ${massUnit} at ${balancingAngleDeg}°\n\n*Please try again later or check your API key quota in the Google AI Studio settings.*`
            };
          }
        } else {
          throw error;
        }
      }

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      let errMsg = error instanceof Error ? error.message : "Failed to generate AI analysis";
      try {
        if (errMsg.startsWith('{')) {
          const parsed = JSON.parse(errMsg);
          if (parsed.error && parsed.error.message) {
            errMsg = parsed.error.message;
          }
        }
      } catch (e) {}
      res.status(500).json({ error: errMsg });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
