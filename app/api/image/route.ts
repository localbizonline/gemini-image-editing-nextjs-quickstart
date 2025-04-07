import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { HistoryItem, HistoryPart } from "@/lib/types";

// Initialize the Google Gen AI client with your API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Define the model ID for Gemini 2.0 Flash experimental
const MODEL_ID = "gemini-2.0-flash-exp-image-generation";

// Define interface for the formatted history item
interface FormattedHistoryItem {
  role: "user" | "model";
  parts: Array<{
    text?: string;
    inlineData?: { data: string; mimeType: string };
  }>;
}

export async function POST(req: NextRequest) {
  try {
    console.log("Starting image generation request...");
    
    // Parse JSON request instead of FormData
    const requestData = await req.json();
    console.log("Request data parsed successfully:", {
      hasPrompt: !!requestData.prompt,
      hasImage: !!requestData.image,
      imageCount: Array.isArray(requestData.image) ? requestData.image.length : requestData.image ? 1 : 0,
      historyLength: requestData.history?.length || 0
    });

    const { prompt, image: inputImage, history } = requestData;

    if (!prompt) {
      console.log("Error: No prompt provided");
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      console.log("Error: No API key configured");
      return NextResponse.json(
        { error: "API key is not configured" },
        { status: 500 }
      );
    }

    let response;

    try {
      console.log("Starting to format history...");
      // Convert history to the format expected by Gemini API
      const formattedHistory =
        history && history.length > 0
          ? history
              .map((item: HistoryItem) => {
                return {
                  role: item.role,
                  parts: item.parts
                    .map((part: HistoryPart) => {
                      if (part.text) {
                        return { text: part.text };
                      }
                      if (part.image && item.role === "user") {
                        const imgParts = part.image.split(",");
                        if (imgParts.length > 1) {
                          return {
                            inlineData: {
                              data: imgParts[1],
                              mimeType: part.image.includes("image/png")
                                ? "image/png"
                                : "image/jpeg",
                            },
                          };
                        }
                      }
                      return { text: "" };
                    })
                    .filter((part) => Object.keys(part).length > 0), // Remove empty parts
                };
              })
              .filter((item: FormattedHistoryItem) => item.parts.length > 0) // Remove items with no parts
          : [];

      console.log("History formatted successfully");

      // Prepare the current message parts
      const messageParts = [];

      // Add the text prompt
      messageParts.push({ text: prompt });
      console.log("Added text prompt to message parts");

      // Add the image(s) if provided
      if (inputImage) {
        console.log("Processing input images...");
        // Handle both single image and array of images
        const images = Array.isArray(inputImage) ? inputImage : [inputImage];
        
        for (const img of images) {
          // Check if the image is a valid data URL
          if (!img.startsWith("data:")) {
            console.log("Error: Invalid image data URL format");
            return NextResponse.json(
              { error: "Invalid image data URL format" },
              { status: 400 }
            );
          }

          const imageParts = img.split(",");
          if (imageParts.length < 2) {
            console.log("Error: Invalid image data URL format (missing base64 data)");
            return NextResponse.json(
              { error: "Invalid image data URL format" },
              { status: 400 }
            );
          }

          const base64Image = imageParts[1];
          const mimeType = img.includes("image/png")
            ? "image/png"
            : "image/jpeg";
          console.log(
            "Image processed successfully:",
            "Base64 length:", base64Image.length,
            "MIME type:", mimeType
          );

          // Add the image to message parts
          messageParts.push({
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          });
        }
        console.log("All images processed successfully");
      }

      // Add the message parts to the history
      formattedHistory.push({
        role: "user",
        parts: messageParts,
      });

      console.log("Sending request to Gemini API with:", {
        model: MODEL_ID,
        contents: formattedHistory,
      });

      // Generate the content
      try {
        console.log("Calling Gemini API...");
        response = await ai.models.generateContent({
          model: MODEL_ID,
          contents: formattedHistory,
          config: {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            responseModalities: ["Text", "Image"],
          },
        });
        console.log("Gemini API call successful");
      } catch (error: any) {
        console.error("Gemini API Error:", error);
        
        // Check for rate limit errors
        if (error.message?.includes("quota") || 
            error.message?.includes("rate limit") || 
            error.message?.includes("429") ||
            error.message?.includes("RESOURCE_EXHAUSTED")) {
          return NextResponse.json(
            {
              error: "Rate limit exceeded",
              details: "You've hit the API rate limit. Please try again later or check your quota.",
              type: "RATE_LIMIT"
            },
            { status: 429 }
          );
        }
        
        return NextResponse.json(
          {
            error: "Gemini API Error",
            details: error.message || "Unknown error occurred",
            type: "API_ERROR"
          },
          { status: 500 }
        );
      }

      console.log("Received response from Gemini API:", response);
    } catch (error) {
      console.error("Error in chat.sendMessage:", error);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          details: error instanceof Error ? error.message : "Unknown error occurred",
          type: "INTERNAL_ERROR"
        },
        { status: 500 }
      );
    }

    let textResponse = null;
    let imageData = null;
    let mimeType = "image/png";

    // Process the response
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      console.log("Number of parts in response:", parts.length);

      for (const part of parts) {
        if ("inlineData" in part && part.inlineData) {
          // Get the image data
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          console.log(
            "Image data received, length:",
            imageData.length,
            "MIME type:",
            mimeType
          );
        } else if ("text" in part && part.text) {
          // Store the text
          textResponse = part.text;
          console.log(
            "Text response received:",
            textResponse.substring(0, 50) + "..."
          );
        }
      }
    }

    if (!imageData) {
      console.log("Error: No image data in response");
      return NextResponse.json(
        {
          error: "No image generated",
          details: "The API did not return an image in the response",
          type: "NO_IMAGE"
        },
        { status: 500 }
      );
    }

    console.log("Successfully generated image, returning response");
    // Return just the base64 image and description as JSON
    return NextResponse.json({
      image: `data:${mimeType};base64,${imageData}`,
      description: textResponse,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: "UNKNOWN_ERROR"
      },
      { status: 500 }
    );
  }
}
