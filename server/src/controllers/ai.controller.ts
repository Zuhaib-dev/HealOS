import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { AppError } from "../middleware/error-handler";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateBio = async (req: Request, res: Response) => {
  try {
    const { role, keywords } = req.body;
    
    if (!keywords || typeof keywords !== "string") {
      throw new AppError("Keywords are required for bio generation", 400);
    }

    const isPatient = role?.toUpperCase() === "PATIENT";
    const context = isPatient
      ? "The user is a patient on this platform. Write a brief personal bio about their lifestyle, hobbies, and health background."
      : `The user is a healthcare professional (Role: ${role || "Doctor"}). Write a brief professional bio focusing on their expertise, care philosophy, and experience.`;

    const prompt = `You are an expert profile writer for a high-end medical portal.
${context}
Write a very brief, engaging bio (maximum 2 short sentences) based on the following keywords: ${keywords}.
Keep it extremely concise. Do not use any formatting like bolding or bullet points. Just output the plain text bio.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
    });

    res.status(200).json({
      success: true,
      bio: response.text,
    });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate bio" });
  }
};

export const explainReport = async (req: Request, res: Response) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) {
      throw new AppError("File URL is required", 400);
    }

    // Determine mimeType from extension
    let ext = fileUrl.split('.').pop()?.toLowerCase() || '';
    let mimeType = 'application/pdf';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new AppError("Failed to fetch report file for AI processing", 400);
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const prompt = `You are an empathetic, expert medical AI. Review this lab report or medical document. Explain the findings to the patient in simple, non-jargon terms.
    
CRITICAL FORMATTING RULES:
1. Do NOT use horizontal rules (no \`---\` or \`***\`).
2. Use clean, simple headings (e.g., \`## Overview\`, \`### Abnormal Findings\`).
3. Keep the text highly structured with bullet points.
4. Highlight abnormal values clearly but in a reassuring tone.
5. Always end by advising them to discuss these results with their doctor for clinical decisions.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    },
                    { text: prompt }
                ]
            }
        ]
    });

    res.status(200).json({
      success: true,
      explanation: response.text,
    });
  } catch (error: any) {
    console.error("AI Report Explanation Error:", error);
    res.status(500).json({ success: false, message: error.stack || error.message || "Failed to explain report" });
  }
};
