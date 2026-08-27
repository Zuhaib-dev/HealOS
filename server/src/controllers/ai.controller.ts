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

    const prompt = `You are an expert profile writer for a high-end medical portal.
The user is a ${role || "User"}.
Write a short, engaging, and professional bio (max 3 sentences) based on the following keywords: ${keywords}.
Do not use any formatting like bolding or bullet points. Just output the plain text bio.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
