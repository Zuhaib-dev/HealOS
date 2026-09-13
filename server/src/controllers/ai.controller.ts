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

    let base64Data = "";

    try {
      let localPath = "";
      if (fileUrl.startsWith('/uploads')) {
        localPath = fileUrl;
      } else if (fileUrl.includes('/uploads/')) {
        try {
          const urlObj = new URL(fileUrl);
          if (urlObj.pathname.startsWith('/uploads')) {
            localPath = urlObj.pathname;
          }
        } catch (e) {
          // ignore parsing errors
        }
      }

      if (localPath) {
        // Read local file directly from filesystem
        const fs = await import('fs');
        const path = await import('path');
        const fullLocalPath = path.join(process.cwd(), localPath);
        if (!fs.existsSync(fullLocalPath)) {
          throw new AppError("Report file no longer exists on the server (ephemeral storage wiped). Please re-upload.", 404);
        }
        const fileBuffer = await fs.promises.readFile(fullLocalPath);
        base64Data = fileBuffer.toString('base64');
      } else {
        // Fetch remote file (e.g. ImageKit)
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) {
          if (fileRes.status === 404) {
             throw new AppError("Remote report file no longer exists. Please re-upload.", 404);
          }
          throw new AppError(`Failed to fetch report file (Status: ${fileRes.status})`, 400);
        }
        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        base64Data = buffer.toString('base64');
      }
    } catch (err: any) {
      throw new AppError(err.message || "Failed to process report file", err.statusCode || 500);
    }

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

export const chatReport = async (req: Request, res: Response) => {
  try {
    const { messages, fileUrl } = req.body;
    if (!messages || !Array.isArray(messages)) {
      throw new AppError("Messages array is required", 400);
    }

    const contents: any[] = [];
    
    // Process the file if provided
    let filePart = null;
    if (fileUrl) {
      let ext = fileUrl.split('.').pop()?.toLowerCase() || '';
      let mimeType = 'application/pdf';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      if (ext === 'png') mimeType = 'image/png';

      const fileRes = await fetch(fileUrl);
      if (fileRes.ok) {
        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        filePart = {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: mimeType
          }
        };
      }
    }

    // Map history to Gemini format
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const parts: any[] = [{ text: msg.text }];
      
      // Attach the file to the very first user message
      if (i === 0 && msg.role === 'user' && filePart) {
        parts.unshift(filePart);
      }
      
      contents.push({
        role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
        parts: parts
      });
    }

    const systemInstruction = `You are an empathetic, expert medical AI assistant helping a patient understand their lab report and health.
CRITICAL RULES:
1. ONLY answer questions related to health, medicine, diet, wellness, or the patient's lab report.
2. If the user asks about unrelated topics (e.g., sports, programming, politics), politely decline and remind them you are a medical AI.
3. Keep answers concise, highly structured (use bullet points), and easy to read. Do NOT use horizontal rules (\`---\`).
4. You have access to Google Search. Use it to provide up-to-date, grounded advice (e.g., diet recommendations for fatty liver).
5. Always end with a disclaimer that your advice is for informational purposes and they should consult their doctor.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction
        }
    });

    res.status(200).json({
      success: true,
      text: response.text,
    });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ success: false, message: error.stack || error.message || "Failed to process chat" });
  }
};
