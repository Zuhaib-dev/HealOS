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
