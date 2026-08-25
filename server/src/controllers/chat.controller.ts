import { Request, Response } from "express";
import { AppError } from "../middleware/error-handler.js";
import { StatusCodes } from "http-status-codes";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

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

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error("Perplexity API key is missing");
      throw new AppError("Chat service is currently unavailable", StatusCodes.SERVICE_UNAVAILABLE);
    }

    // Prepend system prompt to the messages
    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }))
    ];

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-chat",
        messages: apiMessages,
        temperature: 0.2, // Keep it deterministic and professional
        max_tokens: 1000,
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Perplexity API error:", errorData);
      throw new AppError("Failed to fetch response from AI service", StatusCodes.BAD_GATEWAY);
    }

    const data = await response.json() as any;
    
    return res.status(StatusCodes.OK).json({
      success: true,
      message: data.choices[0].message
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
