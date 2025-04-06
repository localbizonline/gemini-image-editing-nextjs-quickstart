"use client";
import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { ImagePromptInput } from "@/components/ImagePromptInput";
import { ImageResultDisplay } from "@/components/ImageResultDisplay";
import { ImageIcon, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryItem } from "@/lib/types";

export default function Home() {
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleImage1Select = (imageData: string) => {
    setImage1(imageData || null);
  };

  const handleImage2Select = (imageData: string) => {
    setImage2(imageData || null);
  };

  const handlePromptSubmit = async (prompt: string) => {
    try {
      setLoading(true);
      setError(null);

      // If we have a generated image, use that for editing, otherwise use the uploaded images
      const imageToEdit = generatedImage || (image1 && image2 ? [image1, image2] : null);

      // Prepare the request data as JSON
      const requestData = {
        prompt,
        image: imageToEdit,
        history: history.length > 0 ? history : undefined,
      };

      const response = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If we can't parse the response as JSON, get the text
          const text = await response.text();
          errorData = { error: text || `HTTP Error ${response.status}` };
        }
        
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        throw new Error(errorData.error || `Failed to generate image. Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Success Response:", data);

      if (data.image) {
        // Update the generated image and description
        setGeneratedImage(data.image);
        setDescription(data.description || null);

        // Update history locally - add user message
        const userMessage: HistoryItem = {
          role: "user",
          parts: [
            { text: prompt },
            ...(imageToEdit ? (Array.isArray(imageToEdit) ? imageToEdit.map(img => ({ image: img })) : [{ image: imageToEdit }]) : []),
          ],
        };

        // Add AI response
        const aiResponse: HistoryItem = {
          role: "model",
          parts: [
            ...(data.description ? [{ text: data.description }] : []),
            ...(data.image ? [{ image: data.image }] : []),
          ],
        };

        // Update history with both messages
        setHistory((prevHistory) => [...prevHistory, userMessage, aiResponse]);
      } else {
        setError("No image returned from API");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
      console.error("Error processing request:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage1(null);
    setImage2(null);
    setGeneratedImage(null);
    setDescription(null);
    setLoading(false);
    setError(null);
    setHistory([]);
  };

  // If we have a generated image, we want to edit it next time
  const currentImages = generatedImage ? [generatedImage] : [image1, image2].filter(Boolean);
  const isEditing = currentImages.length > 0;

  // Get the latest image to display (always the generated image)
  const displayImage = generatedImage;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-4xl border-0 bg-card shadow-none">
        <CardHeader className="flex flex-col items-center justify-center space-y-2">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wand2 className="w-8 h-8 text-primary" />
            Image Creation & Editing
          </CardTitle>
          <span className="text-sm font-mono text-muted-foreground">
            powered by Google DeepMind Gemini 2.0 Flash
          </span>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 w-full">
          {error && (
            <div className={`p-4 mb-4 text-sm rounded-lg ${
              error.includes("Rate limit exceeded") 
                ? "bg-yellow-100 text-yellow-700" 
                : "bg-red-100 text-red-700"
            }`}>
              {error}
              {error.includes("Rate limit exceeded") && (
                <div className="mt-2 text-xs">
                  <p>This could be due to:</p>
                  <ul className="list-disc list-inside">
                    <li>Hitting your daily quota limit</li>
                    <li>Making too many requests in a short time</li>
                    <li>Using up your free tier allocation</li>
                  </ul>
                  <p className="mt-2">Please try again later or check your API quota in the Google AI Studio.</p>
                </div>
              )}
            </div>
          )}

          {!displayImage && !loading ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUpload
                  onImageSelect={handleImage1Select}
                  currentImage={image1}
                  label="First Image"
                />
                <ImageUpload
                  onImageSelect={handleImage2Select}
                  currentImage={image2}
                  label="Second Image"
                />
              </div>
              <ImagePromptInput
                onSubmit={handlePromptSubmit}
                isEditing={isEditing}
                isLoading={loading}
              />
            </>
          ) : loading ? (
            <div
              role="status"
              className="flex items-center mx-auto justify-center h-56 max-w-sm bg-gray-300 rounded-lg animate-pulse dark:bg-secondary"
            >
              <ImageIcon className="w-10 h-10 text-gray-200 dark:text-muted-foreground" />
              <span className="pl-4 font-mono font-xs text-muted-foreground">
                Processing...
              </span>
            </div>
          ) : (
            <>
              <ImageResultDisplay
                imageUrl={displayImage || ""}
                description={description}
                onReset={handleReset}
                conversationHistory={history}
              />
              <ImagePromptInput
                onSubmit={handlePromptSubmit}
                isEditing={true}
                isLoading={loading}
              />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
