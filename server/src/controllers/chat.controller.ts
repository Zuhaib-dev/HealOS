import { Request, Response } from "express";
import { AppError } from "../middleware/error-handler.js";
import { StatusCodes } from "http-status-codes";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

const SYSTEM_PROMPT = `You are the official HealOS AI Assistant. 
HealOS is a comprehensive Hospital Management System.
Your ONLY purpose is to answer questions related to healthcare, hospitals, medical information, or using the HealOS platform.
If the user asks for code, programming help, writing scripts, or anything unrelated to healthcare or hospitals, you must politely refuse and state that you can only assist with health-related topics.
Be helpful, professional, and concise.`;

export const processChatMessage = async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      throw new AppError("Messages array is required", StatusCodes.BAD_REQUEST);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key is missing");
      throw new AppError("Chat service is currently unavailable", StatusCodes.SERVICE_UNAVAILABLE);
    }

    // Convert messages to Gemini format enforcing strict alternation ending with user
    const geminiContents: any[] = [];
    let expectedRole = "user"; // The last message must be from the user

    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const role = m.role === "user" ? "user" : "model";
      
      if (role === expectedRole) {
        geminiContents.unshift({
          role,
          parts: [{ text: m.content }]
        });
        expectedRole = expectedRole === "user" ? "model" : "user";
      }
    }

    // Gemini requires the conversation to start with a 'user' role
    if (geminiContents.length > 0 && geminiContents[0].role === "model") {
      geminiContents.shift();
    }

    if (geminiContents.length === 0) {
      throw new AppError("No valid user messages to send", StatusCodes.BAD_REQUEST);
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.2, // Keep it deterministic and professional
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      
      let errorMessage = "Failed to fetch response from AI service";
      let statusCode = StatusCodes.BAD_GATEWAY;
      
      try {
        const jsonError = JSON.parse(errorData);
        if (jsonError.error?.code === 429) {
          errorMessage = "I am currently receiving too many requests. Please wait about a minute and try again.";
          statusCode = StatusCodes.TOO_MANY_REQUESTS;
        }
      } catch {
        // Ignore JSON parse errors
      }
      
      throw new AppError(errorMessage, statusCode);
    }

    const data = await response.json() as any;
    
    // Extract the text response from Gemini
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";
    
    return res.status(StatusCodes.OK).json({
      success: true,
      message: {
        role: "assistant",
        content: textResponse
      }
    });
    
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Chat API error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An unexpected error occurred while processing your request."
    });
  }
};
